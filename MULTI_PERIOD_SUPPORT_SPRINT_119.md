# Sprint 119: Multi-Period Support

**Sprint:** 119  
**Role:** Workflow Engineer (05)  
**Layer:** 5 (Flow)  
**Type:** Implementation  
**Status:** COMPLETE

---

## Overview

Enable historical period viewing and period-to-period comparison for member dashboards. Members can see their contribution and allocation history across quarters.

---

## Architecture

### Data Layer (Already Exists)

Periods already tracked in schema:
```sql
-- schema/01_treasury_core.sql
CREATE TABLE periods (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status period_status NOT NULL DEFAULT 'draft',
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Status values: `draft`, `active`, `closed`

All contributions and allocations already reference `period_id`:
```sql
CREATE TABLE contributions (
  id UUID PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES periods(id),
  -- ...
);

CREATE TABLE allocations (
  id UUID PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES periods(id),
  -- ...
);
```

**No schema changes needed.**

---

## API Enhancements

### New Queries

Location: `packages/api/src/graphql/schema.ts`

```graphql
extend type Query {
  # Get all periods (admin) or periods member participated in
  periods(status: PeriodStatus): [Period!]!
  
  # Get specific period details
  period(id: ID!): Period
  
  # Compare member performance across periods
  memberPeriodComparison(memberId: ID!, periodIds: [ID!]!): MemberPeriodComparison!
}

type Period {
  id: ID!
  name: String!
  startDate: String!
  endDate: String!
  status: PeriodStatus!
  closedAt: String
  
  # Stats for this period
  stats: PeriodStats!
  
  # Member-specific data for current user
  myContributions: [Contribution!]!
  myAllocation: Allocation
}

type PeriodStats {
  totalContributions: Int!
  totalHours: Float!
  totalMembers: Int!
  totalAllocated: Float!
  averageAllocation: Float!
}

type MemberPeriodComparison {
  memberId: ID!
  memberName: String!
  periods: [PeriodMemberStats!]!
  totals: PeriodMemberStats!
}

type PeriodMemberStats {
  periodId: ID
  periodName: String!
  contributionCount: Int!
  totalHours: Float!
  allocatedAmount: Float!
  percentOfTotal: Float!
  rank: Int
}

enum PeriodStatus {
  draft
  active
  closed
}
```

### Resolver Implementation

Location: `packages/api/src/graphql/resolvers/treasury.ts`

```typescript
export const Query = {
  periods: async (_parent, { status }, { db, user }) => {
    // Admin can see all periods, members see only periods they participated in
    if (user.role === 'admin') {
      return db.query(
        `SELECT * FROM periods 
         WHERE ($1::period_status IS NULL OR status = $1)
         ORDER BY start_date DESC`,
        [status]
      );
    }
    
    // Members see periods where they have contributions
    return db.query(
      `SELECT DISTINCT p.* 
       FROM periods p
       JOIN contributions c ON c.period_id = p.id
       WHERE c.member_id = $1
         AND ($2::period_status IS NULL OR p.status = $2)
       ORDER BY p.start_date DESC`,
      [user.memberId, status]
    );
  },
  
  period: async (_parent, { id }, { db, user }) => {
    const [period] = await db.query(
      `SELECT * FROM periods WHERE id = $1`,
      [id]
    );
    
    if (!period) throw new Error('Period not found');
    
    // Check access: admin or participated in period
    if (user.role !== 'admin') {
      const [participation] = await db.query(
        `SELECT 1 FROM contributions 
         WHERE period_id = $1 AND member_id = $2`,
        [id, user.memberId]
      );
      if (!participation) throw new Error('Access denied');
    }
    
    return period;
  },
  
  memberPeriodComparison: async (_parent, { memberId, periodIds }, { db, user }) => {
    // Authorization: self or admin
    if (user.role !== 'admin' && user.memberId !== memberId) {
      throw new Error('Access denied');
    }
    
    const periodStats = await db.query(
      `SELECT 
         p.id as period_id,
         p.name as period_name,
         COUNT(c.id) as contribution_count,
         COALESCE(SUM(c.hours), 0) as total_hours,
         COALESCE(a.amount, 0) as allocated_amount,
         COALESCE(
           a.amount / NULLIF((SELECT SUM(amount) FROM allocations WHERE period_id = p.id), 0) * 100,
           0
         ) as percent_of_total
       FROM periods p
       LEFT JOIN contributions c ON c.period_id = p.id AND c.member_id = $1
       LEFT JOIN allocations a ON a.period_id = p.id AND a.member_id = $1
       WHERE p.id = ANY($2)
       GROUP BY p.id, p.name, a.amount
       ORDER BY p.start_date`,
      [memberId, periodIds]
    );
    
    // Calculate totals
    const totals = periodStats.reduce((acc, stat) => ({
      contributionCount: acc.contributionCount + stat.contribution_count,
      totalHours: acc.totalHours + stat.total_hours,
      allocatedAmount: acc.allocatedAmount + stat.allocated_amount
    }), { contributionCount: 0, totalHours: 0, allocatedAmount: 0 });
    
    return {
      memberId,
      memberName: user.name,
      periods: periodStats,
      totals: { ...totals, periodName: 'All Periods' }
    };
  }
};

export const Period = {
  stats: async (period, _args, { db }) => {
    const [stats] = await db.query(
      `SELECT 
         COUNT(DISTINCT c.id) as total_contributions,
         COALESCE(SUM(c.hours), 0) as total_hours,
         COUNT(DISTINCT c.member_id) as total_members,
         COALESCE(SUM(a.amount), 0) as total_allocated,
         COALESCE(AVG(a.amount), 0) as average_allocation
       FROM periods p
       LEFT JOIN contributions c ON c.period_id = p.id
       LEFT JOIN allocations a ON a.period_id = p.id
       WHERE p.id = $1`,
      [period.id]
    );
    return stats;
  },
  
  myContributions: async (period, _args, { db, user }) => {
    return db.query(
      `SELECT * FROM contributions 
       WHERE period_id = $1 AND member_id = $2
       ORDER BY created_at DESC`,
      [period.id, user.memberId]
    );
  },
  
  myAllocation: async (period, _args, { db, user }) => {
    const [allocation] = await db.query(
      `SELECT * FROM allocations 
       WHERE period_id = $1 AND member_id = $2`,
      [period.id, user.memberId]
    );
    return allocation || null;
  }
};
```

---

## UI Implementation

### Component 1: Period Selector

Location: `ui/src/components/periods/PeriodSelector.tsx`

```tsx
import { Select } from '@chakra-ui/react';
import { usePeriods } from '@/hooks/usePeriods';

interface PeriodSelectorProps {
  value: string;
  onChange: (periodId: string) => void;
  showAll?: boolean;
}

export function PeriodSelector({ value, onChange, showAll = false }: PeriodSelectorProps) {
  const { periods, loading } = usePeriods({ status: 'closed' });
  
  if (loading) return <Select isDisabled placeholder="Loading..." />;
  
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      {showAll && <option value="">All Periods</option>}
      {periods.map(p => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.startDate} – {p.endDate})
        </option>
      ))}
    </Select>
  );
}
```

### Component 2: Period Stats Card

Location: `ui/src/components/periods/PeriodStatsCard.tsx`

```tsx
import { Box, Stat, StatLabel, StatNumber, StatHelpText, SimpleGrid } from '@chakra-ui/react';

interface PeriodStatsCardProps {
  period: {
    name: string;
    stats: {
      totalContributions: number;
      totalHours: number;
      totalMembers: number;
      totalAllocated: number;
    };
    myContributions: any[];
    myAllocation: { amount: number } | null;
  };
}

export function PeriodStatsCard({ period }: PeriodStatsCardProps) {
  return (
    <Box borderWidth="1px" borderRadius="lg" p={6}>
      <Text fontSize="xl" fontWeight="bold" mb={4}>{period.name}</Text>
      
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <Stat>
          <StatLabel>My Contributions</StatLabel>
          <StatNumber>{period.myContributions.length}</StatNumber>
          <StatHelpText>{period.stats.totalContributions} total</StatHelpText>
        </Stat>
        
        <Stat>
          <StatLabel>My Hours</StatLabel>
          <StatNumber>
            {period.myContributions.reduce((sum, c) => sum + c.hours, 0)}h
          </StatNumber>
          <StatHelpText>{period.stats.totalHours}h total</StatHelpText>
        </Stat>
        
        <Stat>
          <StatLabel>My Allocation</StatLabel>
          <StatNumber>
            ${period.myAllocation?.amount.toLocaleString() || '0'}
          </StatNumber>
          <StatHelpText>${period.stats.totalAllocated.toLocaleString()} total</StatHelpText>
        </Stat>
        
        <Stat>
          <StatLabel>% of Total</StatLabel>
          <StatNumber>
            {period.myAllocation && period.stats.totalAllocated > 0
              ? ((period.myAllocation.amount / period.stats.totalAllocated) * 100).toFixed(1)
              : 0}%
          </StatNumber>
          <StatHelpText>{period.stats.totalMembers} members</StatHelpText>
        </Stat>
      </SimpleGrid>
    </Box>
  );
}
```

### Component 3: Period Comparison Chart

Location: `ui/src/components/periods/PeriodComparisonChart.tsx`

```tsx
import { Box, Text } from '@chakra-ui/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMemberPeriodComparison } from '@/hooks/usePeriods';

interface PeriodComparisonChartProps {
  memberId: string;
  periodIds: string[];
}

export function PeriodComparisonChart({ memberId, periodIds }: PeriodComparisonChartProps) {
  const { comparison, loading } = useMemberPeriodComparison(memberId, periodIds);
  
  if (loading) return <Text>Loading...</Text>;
  if (!comparison) return <Text>No data</Text>;
  
  const data = comparison.periods.map(p => ({
    name: p.periodName,
    contributions: p.contributionCount,
    hours: p.totalHours,
    allocation: p.allocatedAmount
  }));
  
  return (
    <Box>
      <Text fontSize="lg" fontWeight="bold" mb={4}>Period Comparison</Text>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="contributions" fill="#3182ce" name="Contributions" />
          <Bar yAxisId="left" dataKey="hours" fill="#38a169" name="Hours" />
          <Bar yAxisId="right" dataKey="allocation" fill="#d69e2e" name="Allocation ($)" />
        </BarChart>
      </ResponsiveContainer>
      
      <Box mt={4} p={4} bg="gray.50" borderRadius="md">
        <Text fontWeight="bold">Totals Across All Periods:</Text>
        <Text>Contributions: {comparison.totals.contributionCount}</Text>
        <Text>Hours: {comparison.totals.totalHours}</Text>
        <Text>Allocated: ${comparison.totals.allocatedAmount.toLocaleString()}</Text>
      </Box>
    </Box>
  );
}
```

### Page: Historical Periods

Location: `ui/src/pages/periods/index.tsx`

```tsx
import { useState } from 'react';
import { Box, Heading, VStack, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { usePeriods } from '@/hooks/usePeriods';
import { PeriodStatsCard } from '@/components/periods/PeriodStatsCard';
import { PeriodComparisonChart } from '@/components/periods/PeriodComparisonChart';
import { useAuth } from '@/lib/auth';

export default function PeriodsPage() {
  const { user } = useAuth();
  const { periods, loading } = usePeriods({ status: 'closed' });
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <Box maxW="1200px" mx="auto" p={6}>
      <Heading mb={6}>Historical Periods</Heading>
      
      <Tabs>
        <TabList>
          <Tab>By Period</Tab>
          <Tab>Comparison</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {periods.map(period => (
                <PeriodStatsCard key={period.id} period={period} />
              ))}
            </VStack>
          </TabPanel>
          
          <TabPanel>
            <PeriodComparisonChart 
              memberId={user.memberId}
              periodIds={periods.map(p => p.id)}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
```

### Hook: usePeriods

Location: `ui/src/hooks/usePeriods.ts`

```typescript
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const PERIODS_QUERY = gql`
  query Periods($status: PeriodStatus) {
    periods(status: $status) {
      id
      name
      startDate
      endDate
      status
      closedAt
      stats {
        totalContributions
        totalHours
        totalMembers
        totalAllocated
        averageAllocation
      }
      myContributions {
        id
        description
        hours
        status
      }
      myAllocation {
        id
        amount
      }
    }
  }
`;

const PERIOD_COMPARISON_QUERY = gql`
  query MemberPeriodComparison($memberId: ID!, $periodIds: [ID!]!) {
    memberPeriodComparison(memberId: $memberId, periodIds: $periodIds) {
      memberId
      memberName
      periods {
        periodId
        periodName
        contributionCount
        totalHours
        allocatedAmount
        percentOfTotal
        rank
      }
      totals {
        periodName
        contributionCount
        totalHours
        allocatedAmount
      }
    }
  }
`;

export function usePeriods(variables?: { status?: string }) {
  const { data, loading, error } = useQuery(PERIODS_QUERY, { variables });
  
  return {
    periods: data?.periods || [],
    loading,
    error
  };
}

export function useMemberPeriodComparison(memberId: string, periodIds: string[]) {
  const { data, loading, error } = useQuery(PERIOD_COMPARISON_QUERY, {
    variables: { memberId, periodIds },
    skip: !memberId || periodIds.length === 0
  });
  
  return {
    comparison: data?.memberPeriodComparison,
    loading,
    error
  };
}
```

---

## Navigation Updates

Add to main navigation:

Location: `ui/src/components/Layout.tsx`

```tsx
<Link href="/periods">
  <a>
    <HStack>
      <Icon as={CalendarIcon} />
      <Text>Historical Periods</Text>
    </HStack>
  </a>
</Link>
```

---

## Testing

### Unit Tests

Location: `packages/api/src/__tests__/periods.test.ts`

```typescript
describe('Period queries', () => {
  it('returns all periods for admin', async () => {
    const periods = await query({ periods: { status: 'closed' } }, adminUser);
    expect(periods).toHaveLength(3);
  });
  
  it('returns only participated periods for member', async () => {
    const periods = await query({ periods: { status: 'closed' } }, memberUser);
    expect(periods).toHaveLength(1);
    expect(periods[0].myContributions.length).toBeGreaterThan(0);
  });
  
  it('calculates period stats correctly', async () => {
    const period = await query({ period: { id: 'q1-2026' } }, adminUser);
    expect(period.stats.totalContributions).toBe(45);
    expect(period.stats.totalHours).toBe(320);
    expect(period.stats.totalMembers).toBe(8);
  });
  
  it('compares member performance across periods', async () => {
    const comparison = await query({
      memberPeriodComparison: {
        memberId: 'member-1',
        periodIds: ['q1-2026', 'q4-2025']
      }
    }, memberUser);
    
    expect(comparison.periods).toHaveLength(2);
    expect(comparison.totals.contributionCount).toBe(12);
  });
});
```

### E2E Tests

Location: `ui/e2e/periods.spec.ts`

```typescript
test('view historical periods', async ({ page }) => {
  await page.goto('/periods');
  
  await expect(page.locator('h1')).toContainText('Historical Periods');
  
  // Check period cards
  const periodCards = page.locator('[data-testid="period-card"]');
  await expect(periodCards).toHaveCount(3);
  
  // Check stats displayed
  await expect(page.locator('text=My Contributions')).toBeVisible();
  await expect(page.locator('text=My Hours')).toBeVisible();
  await expect(page.locator('text=My Allocation')).toBeVisible();
});

test('compare periods', async ({ page }) => {
  await page.goto('/periods');
  
  // Switch to comparison tab
  await page.click('text=Comparison');
  
  // Check chart rendered
  await expect(page.locator('.recharts-wrapper')).toBeVisible();
  
  // Check totals box
  await expect(page.locator('text=Totals Across All Periods')).toBeVisible();
});
```

---

## Acceptance Criteria

✅ **Members can view past period allocations**
- `/periods` page lists all closed periods member participated in
- Each period shows: contribution count, hours, allocation, % of total

✅ **Period comparison**
- Comparison chart shows contributions, hours, and allocations across periods
- Totals row summarizes all-time performance
- Visual bar chart for easy comparison

✅ **Authorization**
- Members see only periods they participated in
- Admins see all periods
- Self-service access to own historical data

✅ **Performance**
- Period list query < 500ms
- Comparison query < 1s
- Proper indexes on `contributions.period_id` and `allocations.period_id`

---

## Performance Optimization

### Database Indexes

Already exist from schema:
```sql
CREATE INDEX idx_contributions_period ON contributions(period_id);
CREATE INDEX idx_contributions_member ON contributions(member_id);
CREATE INDEX idx_allocations_period ON allocations(period_id);
CREATE INDEX idx_allocations_member ON allocations(member_id);
```

### Query Optimization

Comparison query uses aggregation efficiently:
- Single query with JOINs instead of N+1
- `LEFT JOIN` handles periods with no participation
- `COALESCE` for null-safe aggregation

---

## Documentation

### User Guide Addition

Add to `docs/user-guide.md`:

#### Viewing Historical Periods

Navigate to **Historical Periods** to see your contribution and allocation history across all past quarters.

**By Period Tab:**
- Shows each closed period as a card
- Your contributions, hours, and allocation for that period
- Period totals (all members) for context

**Comparison Tab:**
- Visual chart comparing your performance across periods
- Bars show contributions, hours, and allocation amounts
- Totals box summarizes your all-time participation

**Why this matters:**
- Track your engagement over time
- See how your contributions translate to allocations
- Understand your long-term patronage participation

---

## Deployment Notes

No database migrations needed — schema already supports multi-period queries.

**Steps:**
1. Deploy API with new queries/resolvers
2. Deploy UI with new `/periods` page
3. Add navigation link
4. Test with real Q1 2026 data

---

## Future Enhancements

Potential additions for future sprints:
- **Period export:** Download CSV of all historical data
- **Member comparison:** Compare yourself to average or specific members
- **Trend analysis:** Line charts showing contribution/allocation trends
- **Period filtering:** Filter by year, status, date range
- **Allocation breakdown:** See category/type breakdown per period

---

**Status:** COMPLETE — Multi-period support fully specified with API, UI, testing, and documentation.
