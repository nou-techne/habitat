# @habitat/shared

Shared types and utilities for the Habitat patronage accounting system.

## Purpose

This package provides TypeScript type definitions that match the SQL schemas and serve as the contract between all packages in the monorepo. The types follow the REA (Resource-Event-Agent) ontology and are organized by bounded context.

## Structure

```
src/
├── types/
│   ├── common.ts       # Common types (UUID, Timestamp, pagination)
│   ├── treasury.ts     # Treasury context (accounts, transactions, periods)
│   ├── people.ts       # People context (members, contributions, approvals)
│   ├── agreements.ts   # Agreements context (allocations, distributions)
│   └── index.ts        # Re-exports all types
└── index.ts            # Package entry point
```

## Usage

```typescript
import type { Member, Contribution, Allocation } from '@habitat/shared'
import { ContributionType, AllocationStatus } from '@habitat/shared'
```

## Type Conventions

- **Entity types** (PascalCase): `Member`, `Contribution`, `Allocation`
- **Enum types** (PascalCase with values in lowercase): `ContributionType.Labor`
- **UUID fields**: `memberId`, `contributionId`, etc. (typed as `UUID` = `string`)
- **Timestamps**: ISO 8601 strings (typed as `Timestamp` = `string`)
- **Money**: Stored as `Decimal` (string) for precision, or `MoneyAmount` (number) for cents
- **JSON**: Typed as `JSONObject` for metadata fields

## Schema Alignment

Types are derived from SQL schemas:
- `schema/01_treasury_core.sql` → `types/treasury.ts`
- `schema/04_people_core.sql` → `types/people.ts`
- `schema/05_agreements_core.sql` → `types/agreements.ts`

When schemas change, update types here first. This package is the source of truth for the TypeScript layer.

## Sprint 62 Deliverable

✓ Complete REA entity type system across all three bounded contexts
✓ Types match SQL schema column definitions
✓ Enums defined for all status/type fields
✓ Event types for each bounded context
✓ Computed view types for patronage summaries, balances, statements
✓ Exported as shared package for api and worker

---

Part of Habitat v0.3.3 — Foundation block
