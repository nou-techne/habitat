# Habitat UI

Next.js frontend for Habitat patronage accounting system.

## Architecture

- **Framework:** Next.js 14 (React 18)
- **GraphQL Client:** Apollo Client 3.8
- **Type Safety:** TypeScript + GraphQL Code Generator
- **Styling:** Tailwind CSS
- **State Management:** Apollo Cache + React hooks
- **Real-time Updates:** Polling (5-15s intervals)

## Real-Time Features

### Polling System

Habitat uses GraphQL polling for real-time updates (WebSocket subscriptions planned for future).

**Polling intervals:**
- Contribution status: 5 seconds
- Period close progress: 3 seconds
- Balance updates: 10 seconds
- Approval notifications: 15 seconds

**Hooks:**
- `usePolling()` — Generic polling hook
- `useContributionStatus()` — Monitor contribution approvals
- `usePeriodProgress()` — Monitor period close workflow
- `useBalanceUpdates()` — Monitor capital account balance
- `useApprovalNotifications()` — Monitor approval queue (stewards/admins)

### Toast Notifications

Toast system provides user feedback for real-time events.

**Usage:**
```tsx
import { useToast } from '../components/Toast'

function MyComponent() {
  const toast = useToast()
  
  toast.success('Success!', 'Operation completed')
  toast.error('Error', 'Something went wrong')
  toast.warning('Warning', 'Please review')
  toast.info('Info', 'Status update')
}
```

**Features:**
- Auto-dismiss after 5 seconds (configurable)
- Multiple toasts stack vertically
- Color-coded by type (success, error, warning, info)
- Animated slide-in entrance
- Manual close button

### RealTimeMonitor Component

Add to layout to enable real-time updates:

```tsx
import { RealTimeMonitor } from '../components/RealTimeMonitor'

<Layout>
  <RealTimeMonitor />
  {/* Your page content */}
</Layout>
```

**Monitors:**
- Contribution status changes → toast notification
- Balance updates → toast notification
- Approval queue changes → toast notification (stewards/admins)
- Period close progress → toast notification

## Getting Started

### Prerequisites

- Node.js 20+
- Running Habitat API (see `packages/api`)

### Installation

```bash
npm install
```

### Development

```bash
# Start development server
npm run dev

# Generate TypeScript types from GraphQL schema
npm run codegen

# Watch mode for codegen (auto-regenerate on schema changes)
npm run codegen:watch
```

Visit `http://localhost:3000`

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
```

## Code Generation

GraphQL Code Generator creates TypeScript types and React hooks from your GraphQL operations.

**Configuration:** `codegen.yml`

**Generated files:** `src/generated/graphql.tsx`

**Workflow:**
1. Write GraphQL queries in `src/graphql/**/*.graphql`
2. Run `npm run codegen`
3. Import generated hooks in components

**Example:**

```graphql
# src/graphql/queries/contributions.graphql
query GetMemberContributions($memberId: ID!) {
  contributions(memberId: $memberId) {
    contributionId
    date
    type
    monetaryValue
    status
  }
}
```

```tsx
// src/components/ContributionList.tsx
import { useGetMemberContributionsQuery } from '../generated/graphql'

export function ContributionList({ memberId }: { memberId: string }) {
  const { data, loading, error } = useGetMemberContributionsQuery({
    variables: { memberId }
  })
  
  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} />
  
  return (
    <ul>
      {data.contributions.map(c => (
        <li key={c.contributionId}>{c.type}: ${c.monetaryValue}</li>
      ))}
    </ul>
  )
}
```

## Apollo Client Configuration

**Features:**
- Automatic authentication (JWT from localStorage)
- Error handling and logging
- Cache type policies for pagination and merging
- Optimistic updates
- Cache invalidation strategies
- Polling support for real-time updates

**Cache policies:**
- `contributions`: Merge paginated results
- `allocations`: Replace on refetch
- Entity normalization by ID field

## Authentication

**Token storage:** localStorage (`authToken` key)

**Apollo integration:** Auth link adds Bearer token to all requests

**Login flow:**
1. User logs in → receives JWT from API
2. Store token in localStorage
3. Apollo includes token in subsequent requests
4. API validates token, returns user data

**Protected routes:** Wrap pages in `<ProtectedRoute>` component

**Logout:** Remove token from localStorage, clear Apollo cache

## Error Handling

**Error Boundary:** Catches React errors, shows fallback UI

**GraphQL Errors:** Logged to console, displayed in UI via error states

**Network Errors:** Retry logic via Apollo Link

**Toast Notifications:** User-friendly error messages

## Loading States

**LoadingState component:** Spinner with configurable size

**LoadingSkeleton component:** Animated placeholder for content

**Usage:**

```tsx
if (loading) return <LoadingState text="Loading contributions..." />
```

## Custom Hooks

**Data hooks:**
- `useContributions()` — member contributions
- `usePendingContributions()` — approval queue
- `useCreateContribution()` — submit contribution
- `useApproveContribution()` — approve contribution
- `useMemberAllocations()` — member allocations
- `usePeriodAllocations()` — period allocations
- `useAllocationStatement()` — detailed statement
- `usePeriods()` — all periods
- `useCurrentPeriod()` — active period
- `usePeriodDetails()` — period details
- `useCapitalAccount()` — capital account balance
- `useCapitalAccountHistory()` — transaction history

**Real-time hooks:**
- `usePolling()` — generic polling hook
- `useContributionStatus()` — contribution status updates
- `usePeriodProgress()` — period close progress
- `useBalanceUpdates()` — balance change notifications
- `useApprovalNotifications()` — approval queue updates

**Pattern:**

```tsx
const { data, loading, error, refetch } = useCustomHook(params)
```

## Project Structure

```
ui/
├── src/
│   ├── components/           # React components
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingState.tsx
│   │   ├── Toast.tsx
│   │   ├── RealTimeMonitor.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── dashboard/        # Dashboard components
│   │   ├── contributions/    # Contribution components
│   │   ├── allocations/      # Allocation components
│   │   └── approvals/        # Approval components
│   ├── pages/                # Next.js pages
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── dashboard.tsx
│   │   ├── unauthorized.tsx
│   │   └── api/              # API routes
│   ├── hooks/                # Custom React hooks
│   │   ├── usePolling.ts
│   │   ├── useContributionStatus.ts
│   │   ├── usePeriodProgress.ts
│   │   ├── useBalanceUpdates.ts
│   │   └── useApprovalNotifications.ts
│   ├── graphql/              # GraphQL operations
│   │   ├── queries/
│   │   ├── mutations/
│   │   └── fragments/
│   ├── generated/            # Generated types & hooks
│   ├── lib/                  # Utilities
│   │   ├── apollo-client.ts  # Apollo setup
│   │   ├── auth.ts           # Authentication
│   │   └── format.ts         # Formatters
│   └── styles/               # Global styles
├── public/                   # Static assets
├── codegen.yml               # GraphQL codegen config
├── next.config.js            # Next.js config
├── tailwind.config.js        # Tailwind config
└── tsconfig.json             # TypeScript config
```

## Build & Deploy

```bash
# Production build
npm run build

# Start production server
npm run start
```

**Environment variables for production:**
- `NEXT_PUBLIC_GRAPHQL_ENDPOINT` — production API URL

## Performance

**Optimization strategies:**
- Apollo cache reduces redundant API calls
- Polling intervals tuned for balance of real-time vs. performance
- Next.js automatic code splitting
- Image optimization via Next.js Image component
- Lazy loading for routes

**Polling best practices:**
- Stop polling on unmount (automatic via usePolling)
- Skip polling when data not needed (skip prop)
- Use appropriate intervals (don't over-poll)
- Stop polling when workflow complete (e.g., period closed)

## Accessibility

*(TODO: Enhance accessibility)*

- Semantic HTML
- ARIA labels on toast notifications
- Keyboard navigation
- Screen reader support

---

**Status:** Real-time updates integrated, toast notification system operational, polling infrastructure complete
