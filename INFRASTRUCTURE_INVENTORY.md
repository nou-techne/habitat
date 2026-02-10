# Infrastructure Inventory

*What needs provisioning to run Habitat. Low-code first.*

Date: 2026-02-10
Status: Draft — awaiting Todd's review and provisioning

---

## Design Principle

**Low-code where possible, custom code only where necessary.**

The patronage accounting system has precise compliance requirements (704(b), double-entry, weighted allocation formulas). The infrastructure beneath those calculations should be commodity. We don't need to build a database connection pool — we need Supabase. We don't need to build an event bus — we need Make/Zapier. We don't need to build a member dashboard from scratch — we need Glide.

**Custom code lives in the compliance and formula layers.** Everything else is plumbing.

---

## Recommended Stack

### Tier 1: Provision Now (Foundation)

| Tool | Purpose | Replaces | Priority |
|------|---------|----------|----------|
| **Supabase** (Pro) | PostgreSQL database, Auth, Row-Level Security, REST/GraphQL API, Realtime subscriptions, Edge Functions | Custom PostgreSQL setup, connection pool, migration runner, Apollo Server, auth middleware | **Critical** |
| **GlideApps** (Business) | Member dashboard, contribution forms, approval workflows, allocation review | Custom Next.js UI (packages/ui/) | **Critical** |

### Tier 2: Provision for Integration (Sprints 69-84)

| Tool | Purpose | Replaces | Priority |
|------|---------|----------|----------|
| **Make** (Pro) | Event-driven workflows: contribution → claim, period close → allocation, allocation → distribution | Custom RabbitMQ + event worker (packages/worker/) | **High** |
| **Zapier** (alternative to Make) | Same as Make — evaluate both, pick one | Same as Make | **High** |

### Tier 3: Provision for Operations (Sprints 85-100)

| Tool | Purpose | Replaces | Priority |
|------|---------|----------|----------|
| **Stripe** | Payment processing for distributions, $CLOUD credit minting | Custom payment integration | **High** |
| **Mercury** | Banking — transparent cooperative treasury account | N/A (new capability) | **High** |
| **Resend** or **Postmark** | Transactional email (notifications, K-1 delivery) | Custom email integration | **Medium** |

### Tier 4: Provision for Scale (Sprints 117+)

| Tool | Purpose | Replaces | Priority |
|------|---------|----------|----------|
| **Vercel** or **Cloudflare Pages** | Static site hosting (if any custom UI beyond Glide) | Self-hosted Caddy | **Low** |
| **GitHub Actions** | CI/CD for Supabase migrations, Edge Function deployment | Custom CI/CD pipeline | **Medium** |

---

## Supabase Specifics

**What we need from Supabase:**

1. **Database** — Deploy existing SQL schemas (`schema/01-05_*.sql`) directly
2. **Auth** — JWT-based member authentication (email + magic link or ENS integration)
3. **Row-Level Security** — Member sees own data, steward sees cooperative data, admin sees all
4. **PostgREST API** — Auto-generated REST API from schema (replaces custom GraphQL resolvers)
5. **Realtime** — Live updates for contribution status, approval notifications, period close progress
6. **Edge Functions** — Custom logic for:
   - Patronage formula calculation
   - Allocation engine
   - 704(b) compliance validation
   - K-1 data assembly
   - Double-entry integrity checks
7. **Storage** — Evidence file uploads for contributions

**Estimated tier:** Pro ($25/month) — need RLS, Edge Functions, and reasonable database size

---

## GlideApps Specifics

**What we need from Glide:**

1. **Member Dashboard** — Patronage summary, capital account view, contribution history
2. **Contribution Form** — Multi-type submission (labor, expertise, capital, relationship) with evidence upload
3. **Approval Queue** — Steward interface for reviewing/approving contributions
4. **Allocation Review** — Period close status, proposed allocations, governance approval
5. **Settings** — Member profile, notification preferences

**Data source:** Connect directly to Supabase (PostgreSQL) via Glide's database connectors

**Estimated tier:** Business ($60/month) — need custom branding, more rows, and advanced components

---

## Make/Zapier Specifics

**Workflows to automate:**

1. **Contribution → Patronage Claim** — On contribution approval, calculate patronage value and create claim record
2. **Period Close Orchestration** — Aggregate patronage → apply weights → calculate allocations → propose → notify stewards
3. **Allocation → Distribution** — On allocation approval, update capital accounts, schedule distributions, record treasury transactions
4. **Distribution → Payment** — Trigger Stripe payout or record manual payment, update treasury
5. **Notification Routing** — Email members on contribution status changes, allocation proposals, distribution scheduling

**Trigger source:** Supabase database webhooks or Realtime subscriptions

**Estimated tier:** Make Pro ($16/month) or Zapier Professional ($30/month)

---

## What Stays Custom Code

Even with low-code tools, these components need custom implementation (as Supabase Edge Functions or standalone scripts):

1. **Patronage Formula Engine** — Weighted calculation with configurable type weights, proportional allocation. Too specific for visual workflow builders.
2. **704(b) Compliance Validator** — IRS regulation matching, capital account economic effect tests. Requires precise logic.
3. **Double-Entry Integrity Checker** — Transaction-level debit/credit verification, period-level balance checks.
4. **K-1 Data Assembly** — Box-by-box mapping to Schedule K-1 fields. Tax-specific logic.
5. **Allocation Engine** — Period close calculation combining patronage data, weights, governance rules.

These are the **Layer 5 (Flow) and Layer 6 (Constraint)** components — the irreducible core that makes Habitat more than a spreadsheet.

---

## Cost Estimate

| Service | Monthly Cost | Annual Cost |
|---------|-------------|-------------|
| Supabase Pro | $25 | $300 |
| GlideApps Business | $60 | $720 |
| Make Pro | $16 | $192 |
| Stripe | Pay-per-transaction | ~$0 initially |
| Mercury | Free | Free |
| Resend | Free tier (3k/month) | $0 initially |
| **Total** | **~$101/month** | **~$1,212/year** |

Compare to self-hosted: VPS ($30-60/month) + time to maintain. Low-code approach trades operational complexity for subscription cost — and frees engineering time for the compliance and formula layers where real value lives.

---

## Provisioning Checklist

- [ ] **Supabase** — Create project, deploy schemas, configure auth, enable RLS
- [ ] **GlideApps** — Create app, connect to Supabase, build initial screens
- [ ] **Make** — Create account, configure Supabase triggers, build first workflow
- [ ] **Stripe** — Create account (for future distribution payments)
- [ ] **Mercury** — Create cooperative banking account (for $CLOUD mint backing)
- [ ] **Domain** — DNS for Supabase custom domain (api.the-habitat.org) and Glide (app.the-habitat.org)

---

## Impact on Roadmap

With low-code tools, many sprints in the current roadmap (ROADMAP_TIO_INTEGRATED_2026-02-10.md) shift from "build from scratch" to "configure and connect":

- **Sprints 63-68 (Backend data access)** → Supabase auto-generates API from schemas
- **Sprints 69-73 (GraphQL resolvers, Apollo Server)** → Supabase PostgREST + Edge Functions
- **Sprints 74-76 (Event bus)** → Make/Zapier workflows triggered by Supabase webhooks
- **Sprints 93-96 (Wire UI, auth, real-time)** → GlideApps connected to Supabase
- **Sprints 97-99 (Docker, CI/CD, monitoring)** → Supabase handles hosting; GitHub Actions for Edge Function deploys

**What doesn't change:** Sprints focused on formula engines, compliance validators, and business logic (77-92). These are the custom Edge Functions that embody Habitat's value proposition.

---

*Low-code is the infrastructure. Custom code is the intelligence.*
