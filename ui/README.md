# Habitat UI

Next.js frontend for Habitat patronage accounting system.

## Architecture

- **Framework:** Next.js 14 (React 18)
- **GraphQL Client:** Apollo Client 3.8
- **Type Safety:** TypeScript + GraphQL Code Generator
- **Styling:** Tailwind CSS
- **State Management:** Apollo Cache + React hooks

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

**Cache policies:**
- `contributions`: Merge paginated results
- `allocations`: Replace on refetch
- Entity normalization by ID field

## Error Handling

**Error Boundary:** Catches React errors, shows fallback UI

**GraphQL Errors:** Logged to console, displayed in UI via error states

**Network Errors:** Retry logic via Apollo Link

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
│   │   ├── dashboard/        # Dashboard components
│   │   ├── contributions/    # Contribution components
│   │   ├── allocations/      # Allocation components
│   │   └── approvals/        # Approval components
│   ├── pages/                # Next.js pages
│   ├── hooks/                # Custom React hooks
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

## Authentication

**Token storage:** localStorage (`authToken` key)

**Apollo integration:** Auth link adds Bearer token to all requests

**Login flow:**
1. User logs in → receives JWT from API
2. Store token in localStorage
3. Apollo includes token in subsequent requests
4. API validates token, returns user data

**Logout:** Remove token from localStorage, clear Apollo cache

## Build & Deploy

```bash
# Production build
npm run build

# Start production server
npm run start
```

**Environment variables for production:**
- `NEXT_PUBLIC_GRAPHQL_ENDPOINT` — production API URL

## Testing

*(TODO: Add testing setup)*

- Unit tests: Vitest + React Testing Library
- E2E tests: Playwright
- GraphQL mocking: MSW (Mock Service Worker)

## Performance

**Optimization strategies:**
- Apollo cache reduces redundant API calls
- Next.js automatic code splitting
- Image optimization via Next.js Image component
- Lazy loading for routes

## Accessibility

*(TODO: Enhance accessibility)*

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support

---

**Status:** Integration complete, connected to live API, type-safe hooks generated
