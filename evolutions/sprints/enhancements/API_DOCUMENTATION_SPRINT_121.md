# Sprint 121: API Documentation

**Sprint:** 121  
**Role:** Integration Engineer (03)  
**Layer:** 3 (Relationship)  
**Type:** Documentation  
**Status:** COMPLETE

---

## Overview

Comprehensive GraphQL API documentation enabling developer onboarding without additional support. Includes introspection-based schema docs, query/mutation examples, authentication guide, authorization model, rate limits, and error handling patterns.

---

## API Endpoint

**Base URL:** `https://habitat.example.com/graphql`  
**Protocol:** GraphQL over HTTPS  
**Content-Type:** `application/json`

---

## Authentication

### JWT Bearer Token

All API requests require authentication via JWT bearer token in the `Authorization` header.

```http
POST /graphql
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Obtaining a Token

**Login Mutation:**

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
    refreshToken
    expiresIn
    user {
      id
      name
      email
      role
    }
  }
}
```

**Example:**

```bash
curl -X POST https://habitat.example.com/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation Login($email: String!, $password: String!) { login(email: $email, password: $password) { token user { id name email role } } }",
    "variables": {
      "email": "member@example.com",
      "password": "secure_password"
    }
  }'
```

**Response:**

```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "rt_abc123...",
      "expiresIn": 3600,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Alice Member",
        "email": "member@example.com",
        "role": "member"
      }
    }
  }
}
```

### Token Refresh

Tokens expire after 1 hour. Use the refresh token to obtain a new access token.

```graphql
mutation RefreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
    token
    expiresIn
  }
}
```

### Token Expiration

- **Access token:** 1 hour
- **Refresh token:** 30 days

---

## Authorization Model

### Roles

- **member** — Standard cooperative member (read own data, submit contributions)
- **steward** — Contribution approver (read + approve contributions)
- **admin** — System administrator (full access)

### Permission Matrix

| Operation | Member | Steward | Admin |
|-----------|--------|---------|-------|
| View own contributions | ✅ | ✅ | ✅ |
| Submit contribution | ✅ | ✅ | ✅ |
| View others' contributions | ❌ | ✅ | ✅ |
| Approve contributions | ❌ | ✅ | ✅ |
| View own allocations | ✅ | ✅ | ✅ |
| View others' allocations | ❌ | ❌ | ✅ |
| Propose period allocation | ❌ | ❌ | ✅ |
| Close period | ❌ | ❌ | ✅ |
| Manage members | ❌ | ❌ | ✅ |
| View notification logs | ❌ | ❌ | ✅ |

### Field-Level Authorization

Some queries return different fields based on role:

```graphql
type Contribution {
  id: ID!
  description: String!
  hours: Float!
  status: ContributionStatus!
  
  # Visible to stewards + admins only
  approver: Member @auth(requires: [STEWARD, ADMIN])
  approvalNotes: String @auth(requires: [STEWARD, ADMIN])
  
  # Visible to owner + admins only
  submitter: Member! @auth(requires: [OWNER, ADMIN])
}
```

---

## Schema Overview

### Core Types

#### Member

```graphql
type Member {
  id: ID!
  name: String!
  email: String!
  role: MemberRole!
  
  # Capital account
  capitalAccount: CapitalAccount
  
  # Contributions
  contributions(periodId: ID, status: ContributionStatus): [Contribution!]!
  
  # Allocations
  allocations(periodId: ID): [Allocation!]!
  
  # Notification preferences
  notificationPreferences: NotificationPreferences
  
  createdAt: String!
  updatedAt: String!
}

enum MemberRole {
  member
  steward
  admin
}
```

#### Contribution

```graphql
type Contribution {
  id: ID!
  member: Member!
  period: Period!
  
  description: String!
  hours: Float!
  date: String!
  category: ContributionCategory!
  type: ContributionType!
  
  status: ContributionStatus!
  submittedAt: String!
  
  # Approval fields (steward+ only)
  approver: Member
  approvedAt: String
  approvalNotes: String
  rejectionReason: String
  
  createdAt: String!
  updatedAt: String!
}

enum ContributionStatus {
  pending
  approved
  rejected
}

enum ContributionCategory {
  labor
  capital
  space
  materials
}

enum ContributionType {
  development
  design
  operations
  governance
  community
  infrastructure
}
```

#### Period

```graphql
type Period {
  id: ID!
  name: String!
  startDate: String!
  endDate: String!
  status: PeriodStatus!
  closedAt: String
  
  # Stats
  stats: PeriodStats!
  
  # Member-specific data
  myContributions: [Contribution!]!
  myAllocation: Allocation
  
  createdAt: String!
}

enum PeriodStatus {
  draft
  active
  closed
}

type PeriodStats {
  totalContributions: Int!
  totalHours: Float!
  totalMembers: Int!
  totalAllocated: Float!
  averageAllocation: Float!
}
```

#### Allocation

```graphql
type Allocation {
  id: ID!
  member: Member!
  period: Period!
  
  amount: Float!
  patronageWeight: Float!
  percentOfTotal: Float!
  
  status: AllocationStatus!
  proposedAt: String
  approvedAt: String
  distributedAt: String
  
  createdAt: String!
}

enum AllocationStatus {
  proposed
  approved
  distributed
}
```

#### CapitalAccount

```graphql
type CapitalAccount {
  id: ID!
  member: Member!
  
  # IRC 704(b) book capital account
  bookBalance: Float!
  
  # Tax basis capital account
  taxBasis: Float!
  
  # Minimum gain
  minimumGain: Float!
  
  # Historical entries
  entries: [CapitalAccountEntry!]!
  
  updatedAt: String!
}

type CapitalAccountEntry {
  id: ID!
  period: Period!
  
  entryType: CapitalEntryType!
  amount: Float!
  description: String!
  
  bookBalance: Float!
  taxBasis: Float!
  
  createdAt: String!
}

enum CapitalEntryType {
  initial_contribution
  patronage_allocation
  distribution
  revaluation
  gain_recognition
}
```

---

## Queries

### Get Current User

```graphql
query Me {
  me {
    id
    name
    email
    role
    capitalAccount {
      bookBalance
      taxBasis
    }
    notificationPreferences {
      emailEnabled
      contributionApproved
      allocationProposed
    }
  }
}
```

**Response:**

```json
{
  "data": {
    "me": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Alice Member",
      "email": "alice@example.com",
      "role": "member",
      "capitalAccount": {
        "bookBalance": 5000.00,
        "taxBasis": 5000.00
      },
      "notificationPreferences": {
        "emailEnabled": true,
        "contributionApproved": true,
        "allocationProposed": true
      }
    }
  }
}
```

### Get My Contributions

```graphql
query MyContributions($periodId: ID, $status: ContributionStatus) {
  myContributions(periodId: $periodId, status: $status) {
    id
    description
    hours
    date
    category
    type
    status
    submittedAt
    approvedAt
    approvalNotes
  }
}
```

**Variables:**

```json
{
  "periodId": "period-q1-2026",
  "status": "approved"
}
```

### Get Periods

```graphql
query Periods($status: PeriodStatus) {
  periods(status: $status) {
    id
    name
    startDate
    endDate
    status
    stats {
      totalContributions
      totalHours
      totalMembers
      totalAllocated
    }
    myContributions {
      id
      description
      hours
    }
    myAllocation {
      amount
      percentOfTotal
    }
  }
}
```

### Get Pending Approvals (Steward/Admin)

```graphql
query PendingApprovals {
  pendingContributions {
    id
    member {
      name
      email
    }
    description
    hours
    date
    category
    type
    submittedAt
  }
}
```

### Get Allocation Details

```graphql
query MyAllocation($periodId: ID!) {
  myAllocation(periodId: $periodId) {
    id
    amount
    patronageWeight
    percentOfTotal
    status
    period {
      name
      startDate
      endDate
    }
  }
}
```

### Get Capital Account History

```graphql
query MyCapitalAccount {
  myCapitalAccount {
    bookBalance
    taxBasis
    minimumGain
    entries {
      id
      period {
        name
      }
      entryType
      amount
      description
      bookBalance
      taxBasis
      createdAt
    }
  }
}
```

### Get Member Period Comparison

```graphql
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
    }
    totals {
      contributionCount
      totalHours
      allocatedAmount
    }
  }
}
```

---

## Mutations

### Submit Contribution

```graphql
mutation SubmitContribution($input: ContributionInput!) {
  submitContribution(input: $input) {
    id
    description
    hours
    status
    submittedAt
  }
}
```

**Input Type:**

```graphql
input ContributionInput {
  periodId: ID!
  description: String!
  hours: Float!
  date: String!
  category: ContributionCategory!
  type: ContributionType!
  notes: String
}
```

**Variables:**

```json
{
  "input": {
    "periodId": "period-q1-2026",
    "description": "Built patronage calculation engine",
    "hours": 8.5,
    "date": "2026-02-10",
    "category": "labor",
    "type": "development",
    "notes": "Implemented weighted patronage formula per spec"
  }
}
```

**Response:**

```json
{
  "data": {
    "submitContribution": {
      "id": "contrib-abc123",
      "description": "Built patronage calculation engine",
      "hours": 8.5,
      "status": "pending",
      "submittedAt": "2026-02-10T14:30:00Z"
    }
  }
}
```

### Approve Contribution (Steward/Admin)

```graphql
mutation ApproveContribution($id: ID!, $notes: String) {
  approveContribution(id: $id, notes: $notes) {
    id
    status
    approver {
      name
    }
    approvedAt
    approvalNotes
  }
}
```

**Variables:**

```json
{
  "id": "contrib-abc123",
  "notes": "Verified with member — looks good"
}
```

### Reject Contribution (Steward/Admin)

```graphql
mutation RejectContribution($id: ID!, $reason: String!) {
  rejectContribution(id: $id, reason: $reason) {
    id
    status
    rejectionReason
  }
}
```

### Update Notification Preferences

```graphql
mutation UpdateNotificationPreferences($input: NotificationPreferencesInput!) {
  updateNotificationPreferences(input: $input) {
    emailEnabled
    webhookEnabled
    contributionApproved
    allocationProposed
  }
}
```

**Input:**

```json
{
  "input": {
    "emailEnabled": true,
    "contributionApproved": true,
    "contributionRejected": true,
    "allocationProposed": false
  }
}
```

### Mark Notification Read

```graphql
mutation MarkNotificationRead($id: ID!) {
  markNotificationRead(id: $id) {
    id
    read
    readAt
  }
}
```

### Propose Period Allocation (Admin)

```graphql
mutation ProposePeriodAllocation($periodId: ID!) {
  proposePeriodAllocation(periodId: $periodId) {
    id
    status
    proposedAt
  }
}
```

### Close Period (Admin)

```graphql
mutation ClosePeriod($periodId: ID!) {
  closePeriod(periodId: $periodId) {
    id
    status
    closedAt
  }
}
```

---

## Error Handling

### Error Format

All errors follow GraphQL error spec:

```json
{
  "errors": [
    {
      "message": "Contribution not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["approveContribution"],
      "extensions": {
        "code": "NOT_FOUND",
        "contributionId": "contrib-invalid"
      }
    }
  ],
  "data": null
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHENTICATED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions for operation |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `CONFLICT` | 409 | Operation conflicts with current state |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Common Errors

**Authentication Required:**

```json
{
  "errors": [{
    "message": "Authentication required",
    "extensions": { "code": "UNAUTHENTICATED" }
  }]
}
```

**Insufficient Permissions:**

```json
{
  "errors": [{
    "message": "Admin role required",
    "extensions": { "code": "FORBIDDEN", "requiredRole": "admin" }
  }]
}
```

**Validation Error:**

```json
{
  "errors": [{
    "message": "Hours must be positive",
    "extensions": {
      "code": "VALIDATION_ERROR",
      "field": "hours",
      "value": -5
    }
  }]
}
```

**Not Found:**

```json
{
  "errors": [{
    "message": "Contribution not found",
    "extensions": {
      "code": "NOT_FOUND",
      "id": "contrib-invalid"
    }
  }]
}
```

---

## Rate Limits

### Limits by Endpoint

- **Queries:** 100 requests / minute
- **Mutations:** 50 requests / minute
- **Login:** 10 requests / minute

### Headers

Rate limit information included in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1678901234
```

### Rate Limit Exceeded

```json
{
  "errors": [{
    "message": "Rate limit exceeded. Retry after 60 seconds.",
    "extensions": {
      "code": "RATE_LIMIT_EXCEEDED",
      "retryAfter": 60
    }
  }]
}
```

---

## Pagination

Large result sets use cursor-based pagination:

```graphql
query ContributionsWithPagination($first: Int, $after: String) {
  contributions(first: $first, after: $after) {
    edges {
      node {
        id
        description
        hours
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Variables:**

```json
{
  "first": 20,
  "after": "cursor-abc123"
}
```

**Response:**

```json
{
  "data": {
    "contributions": {
      "edges": [
        {
          "node": {
            "id": "contrib-1",
            "description": "...",
            "hours": 8
          },
          "cursor": "cursor-xyz789"
        }
      ],
      "pageInfo": {
        "hasNextPage": true,
        "endCursor": "cursor-xyz789"
      }
    }
  }
}
```

---

## Introspection

The API supports GraphQL introspection for schema exploration.

### Get Full Schema

```graphql
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      kind
      description
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
}
```

### Get Type Details

```graphql
query TypeDetails {
  __type(name: "Contribution") {
    name
    kind
    description
    fields {
      name
      type {
        name
        kind
      }
      description
    }
  }
}
```

---

## Client Libraries

### JavaScript/TypeScript

**Installation:**

```bash
npm install @apollo/client graphql
```

**Setup:**

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'https://habitat.example.com/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

**Query Example:**

```typescript
import { gql, useQuery } from '@apollo/client';

const GET_MY_CONTRIBUTIONS = gql`
  query MyContributions {
    myContributions {
      id
      description
      hours
      status
    }
  }
`;

function ContributionList() {
  const { loading, error, data } = useQuery(GET_MY_CONTRIBUTIONS);
  
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  
  return (
    <ul>
      {data.myContributions.map(c => (
        <li key={c.id}>{c.description} - {c.hours}h</li>
      ))}
    </ul>
  );
}
```

### Python

**Installation:**

```bash
pip install gql aiohttp
```

**Setup:**

```python
from gql import gql, Client
from gql.transport.aiohttp import AIOHTTPTransport

transport = AIOHTTPTransport(
    url='https://habitat.example.com/graphql',
    headers={'Authorization': f'Bearer {token}'}
)

client = Client(transport=transport, fetch_schema_from_transport=True)
```

**Query Example:**

```python
query = gql("""
    query MyContributions {
        myContributions {
            id
            description
            hours
            status
        }
    }
""")

result = client.execute(query)
print(result)
```

---

## Code Generation

### TypeScript Types

Use GraphQL Code Generator to generate TypeScript types from schema:

**Installation:**

```bash
npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript
```

**Configuration (`codegen.yml`):**

```yaml
schema: https://habitat.example.com/graphql
documents: 'src/**/*.graphql'
generates:
  src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
```

**Run:**

```bash
npx graphql-codegen
```

---

## Webhooks

Habitat can send webhook notifications for key events. Configure webhook URL in notification preferences.

### Webhook Payload Format

```json
{
  "event": "contribution:approved",
  "timestamp": "2026-02-10T14:30:00Z",
  "data": {
    "contributionId": "contrib-abc123",
    "memberId": "member-xyz",
    "memberName": "Alice Member",
    "description": "Built patronage calculation engine",
    "hours": 8.5,
    "approverName": "Bob Steward",
    "approvalNotes": "Verified with member — looks good"
  }
}
```

### Webhook Events

- `contribution:approved`
- `contribution:rejected`
- `allocation:proposed`
- `allocation:approved`
- `distribution:scheduled`
- `period:closed`

### Webhook Security

Webhooks include HMAC signature in `X-Habitat-Signature` header:

```
X-Habitat-Signature: sha256=<hmac_signature>
```

**Verification:**

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## Testing

### GraphQL Playground

Access interactive GraphQL playground at:

```
https://habitat.example.com/graphql
```

Features:
- Schema documentation browser
- Query autocompletion
- Variables editor
- Response formatting

### Example Test Queries

**Login and Get Contributions:**

```graphql
# 1. Login
mutation {
  login(email: "test@example.com", password: "password") {
    token
    user { name }
  }
}

# 2. Get contributions (use token from step 1)
query {
  myContributions {
    id
    description
    hours
    status
  }
}
```

### Postman Collection

Download Postman collection: [habitat-api.postman_collection.json]

Includes:
- Pre-configured requests for all queries/mutations
- Authentication setup
- Environment variables
- Example responses

---

## Best Practices

### 1. Request Only What You Need

GraphQL allows precise field selection. Don't over-fetch:

**Good:**

```graphql
query {
  myContributions {
    id
    description
    hours
  }
}
```

**Bad:**

```graphql
query {
  myContributions {
    id
    description
    hours
    date
    category
    type
    status
    submittedAt
    approvedAt
    approver { id name email role }
    member { id name email capitalAccount { bookBalance taxBasis } }
  }
}
```

### 2. Use Fragments for Reusable Fields

```graphql
fragment ContributionFields on Contribution {
  id
  description
  hours
  status
}

query {
  myContributions {
    ...ContributionFields
  }
  pendingContributions {
    ...ContributionFields
    member { name }
  }
}
```

### 3. Handle Errors Gracefully

```typescript
const { data, error } = await client.query({ query: MY_QUERY });

if (error) {
  // Check error code
  if (error.graphQLErrors[0]?.extensions?.code === 'UNAUTHENTICATED') {
    // Redirect to login
  } else {
    // Show error message
    showToast(error.message);
  }
}
```

### 4. Use Variables for Dynamic Queries

**Don't:**

```javascript
const query = gql`
  query {
    contributions(status: "${status}")
  }
`;
```

**Do:**

```javascript
const query = gql`
  query Contributions($status: ContributionStatus) {
    contributions(status: $status)
  }
`;

client.query({ query, variables: { status } });
```

### 5. Implement Token Refresh

```typescript
const refreshToken = async () => {
  const refresh = localStorage.getItem('refreshToken');
  const result = await client.mutate({
    mutation: REFRESH_TOKEN,
    variables: { refreshToken: refresh }
  });
  localStorage.setItem('token', result.data.refreshToken.token);
};

// Refresh before expiration
setTimeout(refreshToken, 50 * 60 * 1000); // 50 minutes
```

---

## Support

**Documentation:** https://habitat.example.com/docs/api  
**Community:** https://discord.com/invite/habitat  
**Issues:** https://github.com/habitat/api/issues  
**Email:** api-support@habitat.example.com

---

## Changelog

### v1.0.0 (2026-02-10)

- Initial API release
- Core queries: me, myContributions, periods, myCapitalAccount
- Core mutations: submitContribution, approveContribution, updateNotificationPreferences
- Authentication: JWT bearer tokens
- Authorization: Role-based access control (member, steward, admin)
- Rate limiting: 100 queries/min, 50 mutations/min
- Pagination: Cursor-based for large result sets
- Webhooks: 6 event types with HMAC signatures
- Documentation: Full schema introspection + examples

---

**Status:** COMPLETE — Comprehensive API documentation enabling independent developer onboarding with authentication, authorization, queries, mutations, error handling, rate limits, code examples, and best practices.
