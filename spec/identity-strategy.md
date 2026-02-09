# Identity Strategy: habitat.eth

*Building on: [Chart of Accounts](chart-of-accounts.md) (Layer 1: Identity)*

---

## Overview

Every layer of the pattern stack rests on Identity — distinguishing one thing from another. The accounting system needs to know who a member is, who an agent is, who a venture is. But identity in the Habitat architecture is not just an internal database key. It is a public, composable, self-sovereign signal.

`habitat.eth` is the root ENS name. Subnames create a legible network: `nou.habitat.eth`, `treasury.habitat.eth`, `studio.habitat.eth`. Each subname is an identity that can hold assets, sign transactions, participate in governance, and be discovered by anyone reading the Ethereum namespace.

This is Layer 1 of the pattern stack made literal on a public ledger.

## The Naming Structure

```
habitat.eth                          (root — the cooperative itself)
├── Members
│   ├── nou.habitat.eth              (agent)
│   ├── {handle}.habitat.eth         (human members)
│   └── ...
├── Ventures
│   ├── {venture}.habitat.eth        (incubated ventures)
│   └── ...
├── Infrastructure
│   ├── treasury.habitat.eth         (cooperative treasury)
│   ├── credits.habitat.eth          ($CLOUD credit issuance)
│   └── commons.habitat.eth          (shared pattern library / commons fund)
└── Functional
    ├── studio.habitat.eth           (the venture studio identity)
    └── events.habitat.eth           (events and gatherings)
```

### Naming Principles

**Flat, not hierarchical.** All subnames are direct children of `habitat.eth`. No `member.habitat.eth` → `alice.member.habitat.eth` nesting. Simplicity enables discoverability.

**Earn, not buy.** Subnames are issued by the cooperative to members, ventures, and agents upon admission. They are not purchased on an open market. This keeps the namespace curated and meaningful.

**Identity, not branding.** A subname is a verifiable claim: "this address is recognized by the habitat.eth community as a participant." It carries weight because the issuer — the cooperative — is accountable for who it admits.

## What a Subname Provides

Each `{name}.habitat.eth` subname is an ENS name that resolves to an Ethereum address and can carry:

| Record | Purpose | Example |
|--------|---------|---------|
| **ETH address** | Receive payments, streams, tokens | The member's wallet |
| **Content hash** | Link to a profile, portfolio, or public page | IPFS hash of member's public profile |
| **Text records** | Arbitrary key-value metadata | `role`, `joined`, `ventures`, `skills` |
| **Avatar** | Visual identity | IPFS or URL to profile image |

### Text Records as Social Graph

Text records make the social graph readable directly from the ENS namespace:

```
nou.habitat.eth
├── role: "collective-intelligence-agent"
├── joined: "2026-02-04"
├── streams.inbound: "ethx,sup"
├── ventures: ""
├── skills: "pattern-recognition,rea-accounting,collective-intelligence"
└── url: "https://github.com/nou-techne"
```

```
{member}.habitat.eth
├── role: "ventures-operations-steward"
├── joined: "2026-02-06"
├── ventures: "habitat,{other}"
├── skills: "information-design,systems-composition,low-code"
└── url: "https://..."
```

Any ENS-aware application can read these records. The social graph is not locked in a platform database — it lives on Ethereum, controlled by the names' owners, readable by anyone.

## Identity in the Accounting System

The subname connects the public identity layer to Habitat's internal systems:

```
                   Public (ENS)                    Internal (Habitat)
                ┌─────────────────┐            ┌──────────────────────┐
                │ nou.habitat.eth │            │ People: member record │
                │   → 0xC376...   │───────────→│   member_id: uuid     │
                │   role: agent   │            │   ens: nou.habitat.eth│
                │   joined: 2026  │            │   capital accounts    │
                └─────────────────┘            │   contributions      │
                                               │   allocations        │
                                               └──────────────────────┘
```

The ENS name becomes the member's public identifier. Internal records reference it. When the system generates a member statement or processes a distribution, the ENS name is the human-readable address — not a UUID, not a database row number.

### Wallet-to-Identity Resolution

For onchain operations (Superfluid streams, token distributions, $CLOUD credit transfers), the system resolves `{name}.habitat.eth` to an Ethereum address. This means:

- Distributions can be sent to `alice.habitat.eth` instead of `0x7a3b...`
- Superfluid streams flow to ENS names
- $CLOUD credit transfers reference names, not addresses
- The treasury dashboard shows names, not hex strings

## The Social Graph

The subname network creates a legible graph of relationships:

### Member → Cooperative

Every `{name}.habitat.eth` holder is a recognized participant. The existence of the subname is itself a membership credential — revocable by the cooperative, verifiable by anyone.

### Member → Venture

Text records link members to ventures they participate in. A venture's subname (`{venture}.habitat.eth`) can reciprocally list its members. The graph is bidirectional and self-documenting.

### Agent → Cooperative

Agents like `nou.habitat.eth` are first-class participants in the namespace. They hold the same identity structure as human members. This is not cosmetic — agents that hold wallets, receive streams, and participate in coordination need verifiable identities for the same reasons humans do.

### Venture → Cooperative

Ventures incubated by the studio receive subnames. The subname signals: "this venture is part of the habitat ecosystem." It carries the cooperative's reputation while giving the venture its own identity. If the venture graduates or separates, the subname relationship documents its provenance.

## Governance of the Namespace

| Action | Authority | Process |
|--------|-----------|---------|
| Issue subname | Cooperative governance | On member admission or venture formation |
| Revoke subname | Cooperative governance | On member withdrawal or venture separation |
| Update records | Name holder | Self-sovereign — each member controls their own records |
| Transfer root | Multi-sig | `habitat.eth` controlled by cooperative multi-sig |

**Self-sovereignty with accountability:** Members control their own text records and address resolution. The cooperative controls issuance and revocation. This balances individual autonomy with collective curation.

**Root security:** `habitat.eth` should be held by a multi-sig (Safe) controlled by the cooperative's governance body. No single person should be able to issue or revoke subnames unilaterally.

## $CLOUD Credits and Identity

The $CLOUD credit protocol (Sprint 16) requires member identity for closed-loop enforcement. ENS subnames provide this naturally:

- Credits are issued to `{name}.habitat.eth`
- Transfers occur between subname holders
- The credit ledger references ENS names
- Cross-network redemption (interoperability) uses ENS for identity resolution across issuers

An organization adopting the $CLOUD credit protocol that also uses ENS subnames gets identity infrastructure for free. The credit system and the identity system compose without integration work.

## Interoperability Across Habitats

If other cooperatives adopt the pattern — `otherco.eth` with `{name}.otherco.eth` subnames — the identity system scales without centralization:

- Each cooperative controls its own namespace
- Cross-cooperative recognition is bilateral (like diplomatic recognition)
- $CLOUD credit clearing (Sprint 16) can use ENS resolution for counterparty identification
- The social graph extends across cooperatives through shared venture relationships

This is the coordination infrastructure thesis (Venture Commons) made concrete: identity that is self-sovereign at the individual level, curated at the organizational level, and composable at the network level.

## Implementation Path

| Phase | Action | Dependency |
|-------|--------|------------|
| 1 | Secure `habitat.eth` in cooperative multi-sig | Multi-sig setup |
| 2 | Issue founding member subnames | Member admission |
| 3 | Configure text records for founding members | Member onboarding |
| 4 | Integrate ENS resolution into Habitat treasury dashboard | Treasury reporting (Sprint 7) |
| 5 | Route Superfluid streams to ENS names | Superfluid mapping (Sprint 18) |
| 6 | Issue venture subnames as ventures form | Venture formation process |
| 7 | Integrate credit ledger with ENS identity | $CLOUD credits (Sprint 16) |

## Connection to the Pattern Stack

This sprint addresses Layer 1 (Identity) with a specific implementation choice: ENS as the public identity primitive. Every subsequent layer builds on it:

- **State** (Layer 2): Text records carry member attributes
- **Relationship** (Layer 3): Subname → root name = membership; text records = venture links
- **Event** (Layer 4): Onchain transactions reference ENS names
- **Flow** (Layer 5): Streams and distributions route to ENS names
- **Constraint** (Layer 6): Issuance/revocation = governance enforcement
- **View** (Layer 7): Dashboards show names, not addresses

Identity is not a feature added on top. It is the foundation that makes everything above it legible.

---

*Identity Strategy | February 8, 2026 | Habitat*
