# Habitat Packages

Monorepo structure for the Habitat patronage accounting system backend.

## Structure

```
packages/
├── shared/     Shared types, utilities, constants (Layer 1: Identity)
├── api/        GraphQL API server (Layers 2-3: State, Relationship)
└── worker/     Event worker for cross-context coordination (Layers 4-5: Event, Flow)
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode (watch)
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test
```

## Package Dependencies

- `@habitat/api` depends on `@habitat/shared`
- `@habitat/worker` depends on `@habitat/shared`
- All packages use workspace protocol (`workspace:*`)

## Build Order

1. `@habitat/shared` — must build first (provides types to others)
2. `@habitat/api` and `@habitat/worker` — can build in parallel

The root `pnpm build` command handles this automatically via workspace filtering.

## Sprint Progress

- **Sprint 61:** ✓ Project scaffolding (this structure)
- **Sprint 62-68:** Foundation (types, data layer, tests)
- **Sprint 69-76:** Integration (GraphQL, events)
- **Sprint 77+:** Orchestration, compliance, deployment

---

See `ROADMAP_TIO_INTEGRATED_2026-02-10.md` for full sprint plan.
