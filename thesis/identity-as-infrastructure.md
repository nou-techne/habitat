# Identity as Infrastructure: habitat.eth

*Companion to [The Craft of Coordination](integrated-thesis.md)*

---

## The Problem with Organizational Identity

Most organizations identify their members in a database. The database lives on a server the organization controls. The member's identity exists only within that system — it cannot be verified, carried, or composed with anything outside it.

This is fine for a single firm. It breaks down the moment organizations need to coordinate. A member of one cooperative who contributes to a venture incubated by another has no portable proof of either relationship. A $CLOUD credit issued by one organization cannot be redeemed at another without a bilateral integration project. A social graph of contributors, ventures, and shared infrastructure exists only as scattered spreadsheets and memory.

The coordination infrastructure described in [The Craft of Coordination](integrated-thesis.md) requires an identity layer that is public, composable, and self-sovereign. Not identity *for* the organization. Identity *of* the organization — its members, its ventures, its agents, its infrastructure — legible to anyone, controlled by the holders themselves, governed at the collective level.

## ENS as the Identity Primitive

The Ethereum Name Service provides exactly this. A name like `habitat.eth` resolves to an Ethereum address and carries arbitrary metadata in text records. Subnames — `nou.habitat.eth`, `treasury.habitat.eth` — inherit this capability while remaining under the governance of the parent name.

What makes ENS suitable is not that it is onchain. It is that it is **composable without integration**. Any ENS-aware application can resolve a name, read its records, and act on them. No API key, no bilateral agreement, no vendor dependency. The namespace is a public good maintained by the ENS protocol itself.

## The Namespace

```
habitat.eth                              The cooperative
│
├── Members
│   ├── {handle}.habitat.eth             Human participants
│   └── nou.habitat.eth                  Agent participants
│
├── Ventures
│   └── {venture}.habitat.eth            Incubated ventures
│
├── Infrastructure
│   ├── treasury.habitat.eth             Cooperative treasury
│   ├── credits.habitat.eth              $CLOUD credit issuance
│   └── commons.habitat.eth              Shared pattern library
│
└── Functional
    ├── studio.habitat.eth               The venture studio
    └── events.habitat.eth               Gatherings
```

All subnames are direct children of `habitat.eth`. Flat, not nested. Simplicity enables discoverability — anyone can enumerate the namespace to understand the network's composition.

## One Name, Seven Layers

The subname structure maps directly to the seven-layer pattern stack:

| Layer | What the subname provides |
|-------|--------------------------|
| **Identity** | The name itself — `nou.habitat.eth` — distinguishes this participant from all others |
| **State** | Text records carry attributes: role, skills, join date, affiliated ventures |
| **Relationship** | The subname → parent relationship *is* membership. Venture records create cross-links |
| **Event** | Onchain transactions referencing the name create an auditable history |
| **Flow** | Superfluid streams, token transfers, and $CLOUD credits route to the name |
| **Constraint** | Issuance and revocation are governance acts — the cooperative controls who enters the namespace |
| **View** | ENS-aware interfaces render the name, its records, and its relationships as a readable profile |

This is not a metaphor. Each layer is operationally real. The name resolves to an address that receives streams. The text records are queryable by any application. The issuance event is an onchain transaction governed by the cooperative's multi-sig. Layer 1 of the pattern stack, made literal on a public ledger, carrying all six layers above it.

## The Social Graph

Text records transform the namespace from a directory into a graph:

```
{member}.habitat.eth
├── role: "ventures-operations-steward"
├── joined: "2026-02-06"
├── ventures: "habitat,learnvibe"
├── skills: "information-design,systems-composition"
└── url: "https://..."

nou.habitat.eth
├── role: "collective-intelligence-agent"
├── joined: "2026-02-04"
├── streams.inbound: "ethx,sup"
├── skills: "pattern-recognition,rea-accounting"
└── url: "https://github.com/nou-techne"
```

The graph is:

- **Public** — readable by any ENS-aware application without authentication
- **Self-sovereign** — each name holder controls their own records
- **Curated** — the cooperative governs who enters the namespace
- **Composable** — other protocols and applications can build on the graph without permission

This combination is rare. Social platforms offer public graphs but control the data. Self-sovereign identity systems offer individual control but lack curation. Corporate directories offer curation but lock the data in a proprietary system. ENS subnames provide all three properties simultaneously because the namespace governance (cooperative) and the record governance (individual) operate at different levels.

## Identity and Economic Infrastructure

The identity layer connects to every piece of Habitat's coordination infrastructure:

### Treasury

Distributions route to `{name}.habitat.eth` instead of raw addresses. The treasury dashboard displays names, not hex strings. Members verify their capital account by checking their name's associated address.

### Streams

Superfluid streams flow to and from ENS names. A continuous patronage distribution to `alice.habitat.eth` is legible in a way that a stream to `0x7a3b...` is not. The economic watershed becomes readable.

### $CLOUD Credits

Credits transfer between `{name}.habitat.eth` holders. The credit ledger references names. For cross-network interoperability — credits issued by one cooperative, redeemed at another — ENS provides identity resolution without a central authority. If `otherco.eth` issues credits to `alice.otherco.eth`, and Alice is also `alice.habitat.eth`, the clearing agreement between the two cooperatives can resolve her identity across both namespaces through ENS.

### Agreements

Digital agreements reference ENS names as parties. A patronage agreement between `habitat.eth` and `alice.habitat.eth` is self-documenting — the parties are discoverable, their roles are readable from text records, and the agreement's onchain execution routes to the correct addresses.

## Governance of the Namespace

| Action | Authority | Rationale |
|--------|-----------|-----------|
| Issue subname | Cooperative governance | Admission to the namespace is admission to the community |
| Revoke subname | Cooperative governance | Separation from the community |
| Update own records | Name holder | Self-sovereignty over personal data |
| Transfer root name | Multi-sig | No single point of failure for the namespace |

The root `habitat.eth` is held by a multi-sig (Safe) controlled by the cooperative's governance body. This ensures that namespace governance is distributed and accountable — no individual can unilaterally issue or revoke subnames.

Members control their own text records after issuance. The cooperative does not dictate what a member writes in their profile — it only controls whether the member has a name in the first place. This mirrors the cooperative's governance philosophy: collective curation of membership, individual sovereignty within it.

## Scaling Without Centralization

If other cooperatives adopt the pattern, the identity system scales horizontally:

- Each cooperative controls its own namespace (`otherco.eth`, `thirdco.eth`)
- Cross-cooperative recognition is bilateral, like diplomatic recognition between states
- $CLOUD credit clearing uses ENS resolution for counterparty identification across namespaces
- The social graph extends across cooperatives through shared venture relationships and member cross-listing
- No central identity authority is needed at any scale

This is the coordination infrastructure thesis applied to identity itself. The same pattern — distributed governance, composable primitives, ecosystem enrichment — that describes the studio's organizational thesis also describes its identity architecture. The medium is the message.

## What This Is Not

This is not a token project. Subnames are not traded on a market. They are issued by a cooperative to its recognized participants and revoked when the relationship ends. Their value is membership, not speculation.

This is not a decentralized identity standard. It is a specific implementation choice by a specific cooperative, using existing infrastructure (ENS) for a concrete purpose (legible organizational identity). If others adopt the pattern, that is ecosystem compounding, not protocol governance.

This is not a replacement for legal identity. Members still sign legal agreements with legal names. The ENS subname is a *coordination identity* — the handle by which the cooperative's systems, streams, and social graph know a participant.

---

*Techne · Boulder, Colorado · Deep Winter 2026*
