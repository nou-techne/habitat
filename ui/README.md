# Habitat UI

Member dashboard and interface for the Habitat patronage accounting system.

## Sprint 56: Frontend Foundation ✓

**Completed:** 2026-02-10  
**Phase:** 3 (Production Deployment)  
**Layer:** View (7 of 7 progressive design patterns)  
**TIO Role:** Interface Engineer

### What's Included

**Core Configuration:**
- Next.js 14 + TypeScript + Tailwind CSS
- GraphQL Code Generator for typed hooks
- Apollo Client with authentication middleware
- JWT session handling with httpOnly cookies
- Responsive layout with mobile navigation

**Design System:**
- Three-color palette (green primary, blue infrastructure, burnt orange action)
- Lucide icons only (no emoji per design rules)
- Utility classes for buttons, cards, forms
- Mobile-first responsive design

**Project Structure:**
```
ui/
├── src/
│   ├── components/
│   │   └── Layout.tsx          # Main navigation + responsive layout
│   ├── lib/
│   │   ├── apollo-client.ts    # GraphQL client configuration
│   │   ├── auth.ts             # JWT authentication utilities
│   │   └── generated/          # Auto-generated GraphQL types (gitignored)
│   ├── pages/
│   │   ├── _app.tsx            # Apollo Provider wrapper
│   │   ├── _document.tsx       # HTML document template
│   │   ├── index.tsx           # Landing/redirect page
│   │   └── dashboard.tsx       # Member dashboard placeholder
│   └── styles/
│       └── globals.css         # Tailwind + custom styles
├── public/                     # Static assets
├── codegen.ts                  # GraphQL Code Generator config
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Design system colors
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

### Authentication Flow

1. User logs in via API (returns JWT)
2. Token stored in httpOnly cookie
3. Apollo Client attaches `Authorization: Bearer <token>` to all requests
4. Expired tokens trigger logout + redirect to `/login`

### Development Setup

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

### Next Sprints

**Sprint 57:** Member Dashboard (patronage summary, contribution history, capital account view)  
**Sprint 58:** Contribution Submission (form with type-specific fields, evidence upload)  
**Sprint 59:** Approver Interface (pending queue, approve/reject workflow)  
**Sprint 60:** Allocation Review (period close status, proposed allocations, approval)

### Design Rules (enforced)

- **No emoji in interfaces** — Use Lucide icons exclusively
- **Three-color system** — Primary green, infrastructure blue, action burnt orange
- **Mobile-first** — All components responsive by default
- **Typed everything** — GraphQL Code Generator ensures type safety end-to-end

### Dependencies

- `next` — React framework with SSR/SSG
- `@apollo/client` — GraphQL client with caching
- `graphql` — GraphQL query language
- `jsonwebtoken` — JWT utilities
- `js-cookie` — Cookie management
- `lucide-react` — Icon library
- `clsx` — Conditional classname utility
- `tailwindcss` — Utility-first CSS framework
- `@graphql-codegen/*` — Generate TypeScript types from GraphQL schema

### License

Peer Production License (CopyFarLeft)  
See [LICENSE.md](../LICENSE.md)

---

**Status:** Foundation complete. Ready for feature sprints (57-60).
