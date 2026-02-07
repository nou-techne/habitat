# Service Credit Protocol: An Open Specification

**A Prepaid Medium for Information Economy Infrastructure**

*v0.1 | February 2026*

---

## 1. Premise

The information economy runs on four primitive resources: **compute** (processing work), **transfer** (moving data between points), **long-term memory** (durable storage), and **short-term memory** (fast-access temporary state). Every digital service, from a static website to a machine learning pipeline, is a composition of these four primitives in varying proportions.

Yet the way we pay for them is fragmented across vendors, opaque in pricing, and locked into subscription models that obscure actual resource consumption.

This specification defines a **service credit**: a prepaid unit of account redeemable for defined quantities of these four resource primitives. The credit model is designed to be adopted by any member-governed organization operating digital infrastructure. Credits issued by different organizations share a common accounting grammar, enabling interoperability without requiring a shared currency, a central authority, or speculative financial instruments.

The nearest analogy is the **postage stamp**. You prepay for a defined service. The value is tied to the work the stamp buys, not to speculation. The system is designed for use, not for holding. This specification generalizes that pattern into a protocol any cooperative, municipality, or civic institution can implement.

## 2. The Four Resource Primitives

| Primitive | Definition | Unit of Measure | Examples |
|-----------|-----------|-----------------|----------|
| **Compute** | Processing work performed on data | Compute-hours (normalized to a reference instance class) | API calls, rendering, model inference, database queries |
| **Transfer** | Data movement between network endpoints | GB transferred | Page loads, file downloads, streaming, API responses |
| **Long-term memory** | Durable, persistent data retention | GB-months | File hosting, database records, backups, archives |
| **Short-term memory** | Temporary fast-access state | GB-hours | Session caches, CDN edge state, in-memory queues |

These four primitives are intentionally abstract. Any digital service can be decomposed into them, which means any service provider can price its offerings in credits by publishing a **rate card** that maps credits to resource units. A web host, a database provider, an AI inference service, and a CDN can all accept the same credit, each redeeming it against a different mix of primitives. This shared grammar is what enables interoperability without centralization.

## 3. Credit Mechanics

### Issuance

Credits are issued by any conforming organization (the "issuer") at a fixed ratio to a stable reference currency. This specification recommends **10 credits per 1 unit of reference currency**. The issuance price is fixed and does not change. Each issuer maintains its own ledger and its own rate card.

### Redemption

The issuer publishes a **rate card** mapping credits to quantities of each primitive. The rate card is the variable in the system: it adjusts periodically (recommended: quarterly, with a 30-day notice window) to reflect actual infrastructure costs. When costs rise, a credit buys less. When costs fall, a credit buys more.

This means credits carry **no inherent expectation of value appreciation**, which is a critical property for regulatory classification (see Section 5).

### Transfer

Credits are transferable between members of the issuing organization's network. Transfers are recorded on the issuer's ledger. Credits are **not tradeable on external exchanges or open markets**. This closed-loop constraint preserves the prepaid service character of the instrument and prevents secondary market speculation.

### Interoperability

When multiple issuers adopt this specification, their credits become **mutually legible** even though they are not fungible. Because every rate card expresses prices in credits-per-primitive-unit, a member holding credits from Issuer A can compare costs across providers.

Bilateral clearing agreements between issuers can enable cross-network redemption at an agreed exchange ratio derived from their respective rate cards, analogous to how national postal services clear international mail through the Universal Postal Union without sharing a single currency.

## 4. Governance Template

This specification is governance-agnostic at the organizational level, but defines structural requirements that any issuing entity must satisfy to maintain protocol conformance.

| Requirement | Purpose |
|------------|---------|
| Published rate card with versioning and change log | Members can verify pricing history and anticipate cost shifts |
| Public reserve ratio: liquid reserves / outstanding credit liabilities | Ensures issuer can honor all outstanding credits at current rates |
| Member governance over rate card changes (notice + comment period) | Prevents unilateral devaluation of member holdings |
| Independent audit function (internal or via a Purpose Trust) | Separates operational decisions from accountability for credit integrity |
| Closed-loop transfer enforcement | Maintains prepaid service classification; prevents external speculation |

Cooperatives, municipalities, and other member-governed entities are natural fits. A for-profit corporation could implement the specification, but the transparency obligations align more naturally with cooperative and civic structures.

## 5. Regulatory Design Principles

The credit instrument is designed to fall outside securities classification under the **Howey test** (SEC v. W.J. Howey Co., 1946). The four Howey elements and corresponding design responses:

| Element | Design Response |
|---------|----------------|
| Investment of money | Purchase is for consumption. Legal precedent: transit cards, gift cards, stored-value instruments. |
| Common enterprise | No pooled investment interest. Credits are access rights, not equity or debt. |
| Expectation of profit | Fixed price + variable redemption rate eliminates appreciation mechanism. Rates may decline. |
| Efforts of others | Value derives from service delivery, not managerial effort to increase credit value. |

Issuers operating in jurisdictions with digital token exemptions (e.g., Colorado's Digital Token Act, Wyoming's utility token framework) should file for applicable exemptions before public issuance. All issuers should evaluate money transmitter obligations based on local law, noting that closed-loop stored-value instruments are generally exempt from money transmission licensing in most US jurisdictions.

## 6. Technical Implementation

| Component | Specification | Purpose |
|-----------|--------------|---------|
| Credit Ledger | Auditable record of issuance, redemption, and transfer (on-chain or off-chain) | Verifiable credit lifecycle |
| Rate Card Registry | Versioned, publicly accessible mapping of credits to primitive units | Transparent pricing across issuers |
| Usage Metering | Per-member telemetry across all four primitives | Accurate credit deduction |
| Member Identity | Membership verification tied to issuer's network | Closed-loop enforcement |
| Reserve Dashboard | Public view of reserves vs. outstanding liabilities | Audit support; member trust |
| Clearing Interface | API for bilateral credit exchange between conforming issuers | Cross-network interoperability |

The specification is agnostic on whether the ledger is blockchain-based or a conventional database. The critical requirement is **auditability**: any member or auditor must be able to independently verify total issuance, total redemption, and current outstanding supply. Blockchain provides this by default; a conventional system requires equivalent transparency through open APIs and independent audit access.

## 7. Adoption Path

A single issuer operating alone provides transparent, member-governed infrastructure access.

Two or more issuers sharing this specification create a legible pricing layer across the web stack.

At scale, a network of conforming issuers constitutes a **civic information economy**: infrastructure priced in real resource units, governed by the communities that depend on it, interoperable without centralized coordination.

Each issuer is sovereign. Interoperability is opt-in, negotiated bilaterally, and grounded in the shared grammar of four primitives and a published rate card. No issuer needs to trust another's creditworthiness; they only need to read each other's rate cards.

---

*This specification is published as an open protocol template. It does not constitute legal advice. Issuers are responsible for obtaining jurisdiction-specific legal review before credit issuance.*
