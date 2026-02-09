# Contributing to Habitat

Welcome. Habitat is being built in public by Techne / RegenHub, LCA — a Colorado cooperative. We're creating coordination infrastructure for cooperatives, and we're doing it cooperatively.

This guide explains how to participate, what to work on, and how contributions are recognized.

## Start Here

If you're new:

1. **Read the [Project Narrative](narrative.md)** — a 1,500-word introduction to what Habitat is and why it exists.
2. **Browse the [Habitat site](https://the-habitat.org)** — see the public face of the project.
3. **Explore the [GitHub repo](https://github.com/nou-techne/habitat)** — this is where the work happens.

If you want technical depth:
- **[Thesis](https://the-habitat.org/thesis/)** — the strategic case and architectural principles
- **[Patronage](https://the-habitat.org/patronage/)** — how the patronage accounting system works
- **[Patterns](https://the-habitat.org/patterns/)** — the seven-layer design pattern stack

If you want to see the current state:
- **[Roadmap Evolution](ROADMAP_EVOLUTION_2026-02-09.md)** — what's been built, what's next, why
- **[Public Journal](https://the-habitat.org/journal/)** — daily sprint reflections

## What We Need

Habitat is in **Phase 2: Build in Public**. The design specification is complete (20 sprints documenting compliance concepts through deployment architecture). We're now building the actual system.

### High-Priority Work

**Technical (for engineers):**
- Database schema implementation (PostgreSQL/Supabase)
- API development (GraphQL)
- Event bus design (pub/sub messaging)
- Front-end prototypes (Next.js + TypeScript)
- Testing infrastructure (unit, integration, compliance verification)

**Protocol (for systems thinkers):**
- REA event grammar formalization
- $CLOUD credit clearing agreements between issuers
- Pattern library templates (configuration profiles for different org types)

**Legal (for attorneys/compliance specialists):**
- Operating agreement template sections (patronage mechanics, capital accounts, distributions)
- Compliance checklists (704(b) safe harbor, QIO/DRO provisions)
- Service credit legal analysis (securities exemptions, state-by-state)
- ENS namespace governance resolutions

**Communications (for writers/educators):**
- Member education materials (plain-language patronage explainers)
- Pitch materials (cooperative adoption, investor presentations)
- Case studies (real cooperatives using Habitat)
- Video explainers (architecture, use cases, getting started)

**Community (for organizers):**
- Feedback protocol (how potential adopters evaluate and provide input)
- Cooperative formation toolkit (connecting Habitat tools to formation documents)
- Discord community management (#habitat, #ventures, #operations)
- Event organizing (workshops, conference talks, demos)

**Design (for visual communicators):**
- Logo and visual identity system
- Diagram library (consistent visual language across docs)
- Icon set extensions (Lucide-based)
- UI component library (shadcn/ui + Tailwind)

### Where to Start

**If you're a developer:**
- Read `schema/README.md` and run the database setup locally
- Pick an open issue tagged `good first issue` or `help wanted`
- Prototype a piece of the API using the spec files in `spec/`

**If you're a writer:**
- Write a use case walkthrough ("How a freelancer collective would use Habitat")
- Translate technical concepts into plain language
- Create FAQs based on questions people actually ask

**If you're a designer:**
- Design UI components for the member dashboard
- Create diagrams explaining complex concepts (patronage flow, allocation formula, period close)
- Propose improvements to the public site's visual hierarchy

**If you're a cooperative practitioner:**
- Provide feedback on the patronage mechanics (does this match how your co-op operates?)
- Test the interactive demos on the site and report what's confusing
- Write about your co-op's needs and how Habitat could (or couldn't) address them

**If you're a lawyer:**
- Review the 704(b) compliance mapping for accuracy
- Draft template operating agreement sections
- Analyze the service credit model under your state's securities laws

## How Contributions Are Recognized

Habitat is built by a **cooperative**, not a company. That means contribution recognition works differently than typical open source.

### Current Status (Pre-Launch)

While the patronage system is still being built, we're tracking contributions informally:
- All commits, issues, and PRs are logged
- Contributors are listed in project documentation
- Substantive contributions (docs, code, design) are noted for future patronage allocation

### Future Status (Post-Launch)

Once Habitat's patronage system is operational, it will track its own development:
- **Labor contributions** — hours spent on code, docs, design, community work (valued at negotiated rates per skill category)
- **Expertise contributions** — specialized knowledge (legal review, compliance analysis, system architecture)
- **Community contributions** — organizing events, answering questions, onboarding new contributors
- **Capital contributions** — funding development, hosting, or operational costs

These contributions feed into Habitat's allocation formula. At period close (quarterly), surplus is allocated to contributors based on their patronage. This is transparent, formula-driven, and auditable.

**Important:** This isn't speculative. You're not contributing in hopes of future token value. You're contributing to build something useful, and if it generates surplus, you receive patronage-based allocation. If it doesn't generate surplus, you still built something useful.

### Retroactive Recognition

Contributors who help during the pre-launch phase (now through production release) will have their contributions recognized retroactively once the patronage system is operational. We're keeping records.

## Technical Setup

### Prerequisites
- PostgreSQL 14+ (or Docker with postgres image)
- Node.js 18+ (for site generation and tooling)
- Git

### Local Development
```bash
# Clone the repo
git clone https://github.com/nou-techne/habitat.git
cd habitat

# Set up database
createdb habitat
psql habitat < schema/01_treasury_core.sql
psql habitat < schema/03_treasury_seed_data.sql  # Optional: load sample data

# Verify setup
psql habitat -c "SELECT * FROM account_balances;"
```

### Running Tests
```bash
# Coming soon: test suite for schema integrity, compliance verification, formula calculations
```

### Building Documentation
```bash
# The public site is static HTML in docs/
# No build step needed - edit HTML directly, test locally with any HTTP server
python3 -m http.server 8000 --directory docs/
```

## Contribution Guidelines

### Code
- **Event sourcing discipline:** All state changes flow through the events table
- **Double-entry accounting:** Every transaction must balance to zero
- **Compliance first:** If it affects 704(b) calculations, verify it against IRS regs
- **Test everything:** Especially compliance logic, allocation formulas, period close
- **Document assumptions:** If you're interpreting an ambiguous tax reg, note it

### Documentation
- **Plain language:** Write for practitioners, not PhDs
- **Show, don't just tell:** Use examples, diagrams, walkthroughs
- **No jargon without definitions:** If you use "REA" or "patronage" or "704(c)", explain it
- **Link generously:** Connect docs so readers can follow threads

### Design
- **Lucide icons only:** No emoji in UI (emoji fine in docs/journal)
- **Three-color system:** Green (primary), blue (infrastructure), orange (action)
- **Accessibility:** WCAG 2.1 AA minimum
- **Progressive enhancement:** Works without JS, better with JS

### Git Workflow
- **Fork the repo** and create a feature branch
- **Commit messages:** Start with sprint number if applicable (e.g., "Sprint 43: Add contributor onboarding guide")
- **Pull requests:** Reference related issues, explain the why, not just the what
- **Review:** All PRs reviewed by at least one maintainer (currently: Nou, Todd)

## Communication

### Discord
The primary coordination surface is **Discord** (invite via the-habitat.org/about if you need access).

Channels:
- **#habitat** — general discussion, questions, announcements
- **#ventures** — venture-related development
- **#operations** — operational coordination
- **#dev** — technical discussion, architecture, implementation

### GitHub
- **Issues** — bug reports, feature requests, questions
- **Discussions** — longer-form conversation, proposals, design debates
- **PRs** — code, docs, design contributions

### Email
For sensitive topics (legal questions, partnership inquiries, private feedback), email is fine. Contact info on the-habitat.org/about.

## Code of Conduct

Habitat follows the **Contributor Covenant v2.1**. Full text in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Short version:
- Be respectful, inclusive, and constructive
- Assume good faith
- Prioritize the project's mission (coordination infrastructure for cooperatives that enrich their ecosystems)
- If something feels wrong, speak up — to maintainers, to the community, or privately

Enforcement is by Techne governance (cooperative board).

## License

Habitat is licensed under the **Peer Production License** (CopyFarLeft). Full text in [LICENSE.md](LICENSE.md).

This means:
- **Cooperatives, nonprofits, and individuals** — use freely, modify, distribute, build on
- **For-profit corporations extracting surplus** — you need a separate commercial license

The license is designed to keep cooperative infrastructure in cooperative hands while allowing commercial engagement on fair terms.

## Questions?

- **General questions:** Ask in Discord #habitat or open a GitHub Discussion
- **Technical questions:** Discord #dev or GitHub Issues
- **Contribution questions:** Discord #habitat or this doc
- **Legal/sensitive questions:** Email (see the-habitat.org/about)

## Thank You

Habitat exists because people chose to build it together. Every contribution — a line of code, a design iteration, a clarifying question, a docs typo fix — makes the infrastructure more robust.

Cooperatives need tools that match their values. You're helping build them.

---

**Habitat: composable coordination infrastructure for organizations that enrich their ecosystems.**

Built in public by Techne / RegenHub, LCA  
the-habitat.org | github.com/nou-techne/habitat
