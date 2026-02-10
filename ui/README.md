# Habitat UI

Member dashboard and interface for the Habitat patronage accounting system.

## Completed Sprints

### Sprint 56: Frontend Foundation ✓

**Completed:** 2026-02-10  
**Phase:** 3 (Production Deployment)  
**Layer:** View (7 of 7 progressive design patterns)  
**TIO Role:** Interface Engineer

Core configuration, authentication, and responsive layout.

### Sprint 57: Member Dashboard ✓

**Completed:** 2026-02-10  
**Phase:** 3 (Production Deployment)  
**Layer:** View (7 of 7 progressive design patterns)  
**TIO Role:** Interface Engineer

**What's Included:**

- **Patronage Summary** — Current period + lifetime totals, breakdown by contribution type
- **Contribution History** — Recent contributions with status, value, dates, evidence links
- **Capital Account View** — Book balance, tax balance, contributed capital, retained/distributed patronage
- **Allocation Statements** — Period-by-period allocations with cash/retained split and type breakdown

**Components:**
- `PatronageSummary` — Displays current period and lifetime patronage by type
- `ContributionHistory` — List of recent contributions with status badges and load-more
- `CapitalAccountView` — Dual-balance display (book + tax) with breakdown
- `AllocationStatements` — Collapsible allocation cards with period details

**GraphQL Integration:**
- Fragment library (`fragments.graphql`) for reusable entity shapes
- Dashboard query (`queries/dashboard.graphql`) fetching member, contributions, allocations, distributions
- Typed hooks via GraphQL Code Generator (run `npm run codegen`)

**Utilities:**
- `lib/format.ts` — Currency, date, relative time, number abbreviation formatters

**Design System:**
- Three-color palette consistently applied (green primary, blue infrastructure, burnt orange action)
- Lucide icons throughout (no emoji)
- Mobile-responsive grid layouts
- Expandable sections for detailed data

---

## Project Structure

```
ui/
├── src/
│   ├── components/
│   │   ├── Layout.tsx                      # Main navigation + responsive layout
│   │   └── dashboard/
│   │       ├── PatronageSummary.tsx        # Sprint 57
│   │       ├── ContributionHistory.tsx     # Sprint 57
│   │       ├── CapitalAccountView.tsx      # Sprint 57
│   │       └── AllocationStatements.tsx    # Sprint 57
│   ├── lib/
│   │   ├── apollo-client.ts                # GraphQL client configuration
│   │   ├── auth.ts                         # JWT authentication utilities
│   │   ├── format.ts                       # Display formatters (Sprint 57)
│   │   └── generated/                      # Auto-generated GraphQL types
│   ├── graphql/
│   │   ├── fragments.graphql               # Reusable entity fragments (Sprint 57)
│   │   └── queries/
│   │       ├── dashboard.graphql           # Dashboard query (Sprint 57)
│   │       └── index.ts                    # Query exports
│   ├── pages/
│   │   ├── _app.tsx                        # Apollo Provider wrapper
│   │   ├── _document.tsx                   # HTML document template
│   │   ├── index.tsx                       # Landing/redirect page
│   │   └── dashboard.tsx                   # Member dashboard (Sprint 57 complete)
│   └── styles/
│       └── globals.css                     # Tailwind + custom styles
├── public/                                 # Static assets
├── codegen.ts                              # GraphQL Code Generator config
├── next.config.js                          # Next.js configuration
├── tailwind.config.js                      # Design system colors
├── tsconfig.json                           # TypeScript configuration
└── package.json                            # Dependencies
```

---

## Development Setup

```bash
cd ui
npm install
npm run dev
```

Access at `http://localhost:3000`

**Note:** Requires Habitat API running at `http://localhost:4000/graphql` (or set `NEXT_PUBLIC_API_URL`)

### GraphQL Code Generation

After updating GraphQL queries/mutations:

```bash
npm run codegen
```

Generates typed React hooks in `src/lib/generated/`

---

## Next Sprints

**Sprint 58:** Contribution Submission (form with type-specific fields, evidence upload)  
**Sprint 59:** Approver Interface (pending queue, approve/reject workflow)  
**Sprint 60:** Allocation Review (period close status, proposed allocations, approval)

---

## Design Rules (enforced)

- **No emoji in interfaces** — Use Lucide icons exclusively
- **Three-color system** — Primary green, infrastructure blue, action burnt orange
- **Mobile-first** — All components responsive by default
- **Typed everything** — GraphQL Code Generator ensures type safety end-to-end

---

## Dependencies

- `next` — React framework with SSR/SSG
- `@apollo/client` — GraphQL client with caching
- `graphql` — GraphQL query language
- `jsonwebtoken` — JWT utilities
- `js-cookie` — Cookie management
- `lucide-react` — Icon library
- `clsx` — Conditional classname utility
- `tailwindcss` — Utility-first CSS framework
- `@graphql-codegen/*` — Generate TypeScript types from GraphQL schema

---

## License

Peer Production License (CopyFarLeft)  
See [LICENSE.md](../LICENSE.md)

---

**Status:** Dashboard complete with live data display. Ready for Sprint 58 (Contribution Submission).
