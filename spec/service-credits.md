# $CLOUD Credit Protocol: An Open Specification

**A Prepaid Medium for Information Economy Infrastructure**

*v0.2 | February 2026*

---

## 1. Premise

The information economy runs on four primitive resources: **compute** (processing work), **transfer** (moving data between points), **long-term memory** (durable storage), and **short-term memory** (fast-access temporary state). Every digital service, from a static website to a machine learning pipeline, is a composition of these four primitives in varying proportions.

Yet the way we pay for them is fragmented across vendors, opaque in pricing, and locked into subscription models that obscure actual resource consumption.

This specification defines a **$CLOUD credit**: a prepaid unit of account, minted against USD held for service delivery, redeemable for defined quantities of these four resource primitives. The name carries an intentional duality — cloud as technological infrastructure (distributed computing) and cloud as natural phenomenon (water cycle, atmospheric commons). The credit model is designed to be adopted by any member-governed organization operating digital infrastructure. Credits issued by different organizations share a common accounting grammar, enabling interoperability without requiring a shared currency, a central authority, or speculative financial instruments.

The nearest analogy is the **postage stamp**. You prepay for a defined service. The value is tied to the work the stamp buys, not to speculation. $CLOUD credits are minted against USD held by the issuer — just as a post office mints stamps against its obligation to deliver mail. The backing is operational capacity: the issuer's commitment to deliver services. This specification generalizes that pattern into a protocol any cooperative, municipality, or civic institution can implement.

## 2. The Four Resource Primitives

| Primitive | Definition | Unit of Measure | Examples |
|-----------|-----------|-----------------|----------|
| **Compute** | Processing work performed on data | Compute-hours (normalized to a reference instance class) | API calls, rendering, model inference, database queries |
| **Transfer** | Data movement between network endpoints | GB transferred | Page loads, file downloads, streaming, API responses |
| **Long-term memory** | Durable, persistent data retention | GB-months | File hosting, database records, backups, archives |
| **Short-term memory** | Temporary fast-access state | GB-hours | Session caches, CDN edge state, in-memory queues |

These four primitives are intentionally abstract. Any digital service can be decomposed into them, which means any service provider can price its offerings in $CLOUD credits by publishing a **rate card** that maps credits to resource units. A web host, a database provider, an AI inference service, and a CDN can all accept the same credit, each redeeming it against a different mix of primitives. This shared grammar is what enables interoperability without centralization.

## 3. Credit Mechanics

### Issuance

$CLOUD credits are issued by any conforming organization (the "issuer"), minted against USD held for performance of labor and operations. The specification defines a stable conversion rate of **1 CLOUD = 10 USDC** (or equivalently, 10 CLOUD per 1 USD). The issuance price is fixed and does not change. Each issuer maintains its own ledger and its own rate card.

**Minting backing:** Credits are minted only against USD held in the issuer's deposit accounts. The backing is the issuer's operational capacity — its commitment to deliver services against the credits outstanding. This is not fractional reserve; it is prepaid obligation accounting.

### Infrastructure Integration

The $CLOUD credit system integrates three complementary infrastructure layers:

| Layer | Provider | Function |
|-------|----------|----------|
| **Payments** | Stripe | Fiat on-ramp, invoicing, subscription billing |
| **Banking** | Mercury | Deposit accounts, treasury management, USD custody |
| **Identity & Ledger** | Ethereum | Member identity (ENS), accounting ledger, credit lifecycle tracking |

These systems are interoperable and orchestrated: fiat flows in via Stripe/Mercury, $CLOUD credits are minted against the held USD, and the credit lifecycle is recorded on Ethereum. The architecture is **custodial and orchestrated** — the issuing organization manages the integration, not individual members.

### Redemption

The issuer publishes a **rate card** mapping $CLOUD credits to quantities of each primitive. The rate card is the variable in the system: it adjusts periodically (recommended: quarterly, with a 30-day notice window) to reflect actual infrastructure costs. When costs rise, a credit buys less. When costs fall, a credit buys more.

This means credits carry **no inherent expectation of value appreciation**, which is a critical property for regulatory classification (see Section 5).

### Use Cases

$CLOUD credits serve as the primary medium of exchange within the cooperative ecosystem:

1. **Engage Techne for building new tools** — project work paid in $CLOUD
2. **Primary invoice medium** — Techne project invoices denominated in $CLOUD credits
3. **Resource consumption** — compute, transfer, memory (the four primitives)

### Transfer

Credits are transferable between members of the issuing organization's network. Transfers are recorded on the issuer's ledger. Credits are **not tradeable on external exchanges or open markets**. This closed-loop constraint preserves the prepaid service character of the instrument and prevents secondary market speculation.

### Interoperability

When multiple issuers adopt this specification, their credits become **mutually legible** even though they are not fungible. Because every rate card expresses prices in credits-per-primitive-unit, a member holding credits from Issuer A can compare costs across providers.

Bilateral clearing agreements between issuers can enable cross-network redemption at an agreed exchange ratio derived from their respective rate cards, analogous to how national postal services clear international mail through the Universal Postal Union without sharing a single currency.

## 4. Staking & Revenue Share

### Member-Investor Staking

LCA member-investors can **stake $CLOUD credits** for an investor-determined duration. The staking mechanism follows a **compounding curve**: longer lock periods earn a higher percentage of the cooperative's revenue share. This provides capital access to Techne through liquidity operation commitments.

This is not speculation — it is a commitment to the cooperative's operational capacity. The curve rewards patience and alignment with cooperative time horizons.

### Liquidity Dynamics

Multi-year USDC commitments to the trust (deposit account) change the **liquidity needs and parameters** of the deposit pool. Longer commitments create a more stable capital base, enabling better operational planning and reducing the cooperative's cost of capital.

The staking curve is configured by the cooperative's governance body and published alongside the rate card.

## 5. Governance Template

This specification is governance-agnostic at the organizational level, but defines structural requirements that any issuing entity must satisfy to maintain protocol conformance.

| Requirement | Purpose |
|------------|---------|
| Published rate card with versioning and change log | Members can verify pricing history and anticipate cost shifts |
| Public reserve ratio: liquid reserves / outstanding credit liabilities | Ensures issuer can honor all outstanding credits at current rates |
| Member governance over rate card changes (notice + comment period) | Prevents unilateral devaluation of member holdings |
| Independent audit function (internal or via a Purpose Trust) | Separates operational decisions from accountability for credit integrity |
| Closed-loop transfer enforcement | Maintains prepaid service classification; prevents external speculation |
| Staking curve parameters published and governance-approved | Transparency in revenue share mechanics |

Cooperatives, municipalities, and other member-governed entities are natural fits. A for-profit corporation could implement the specification, but the transparency obligations align more naturally with cooperative and civic structures.

## 6. Regulatory Design Principles

The $CLOUD credit instrument is designed to fall outside securities classification under the **Howey test** (SEC v. W.J. Howey Co., 1946). The four Howey elements and corresponding design responses:

| Element | Design Response |
|---------|----------------|
| Investment of money | Purchase is for consumption. Legal precedent: transit cards, gift cards, stored-value instruments. |
| Common enterprise | No pooled investment interest. Credits are access rights, not equity or debt. |
| Expectation of profit | Fixed price + variable redemption rate eliminates appreciation mechanism. Rates may decline. |
| Efforts of others | Value derives from service delivery, not managerial effort to increase credit value. |

**Staking note:** The revenue share staking mechanism is available only to LCA member-investors (not the general public) and is structured as a cooperative patronage benefit, not a securities offering. The staking curve rewards operational commitment, not passive investment.

Issuers operating in jurisdictions with digital token exemptions (e.g., Colorado's Digital Token Act, Wyoming's utility token framework) should file for applicable exemptions before public issuance. All issuers should evaluate money transmitter obligations based on local law, noting that closed-loop stored-value instruments are generally exempt from money transmission licensing in most US jurisdictions.

## 7. Technical Implementation

| Component | Specification | Purpose |
|-----------|--------------|---------|
| Credit Ledger | Ethereum-based auditable record of issuance, redemption, and transfer | Verifiable credit lifecycle |
| Fiat On-Ramp | Stripe payment integration | USD collection for credit minting |
| Banking Layer | Mercury deposit accounts | USD custody backing outstanding credits |
| Rate Card Registry | Versioned, publicly accessible mapping of credits to primitive units | Transparent pricing across issuers |
| Usage Metering | Per-member telemetry across all four primitives | Accurate credit deduction |
| Member Identity | ENS subnames (`{name}.habitat.eth`) for closed-loop enforcement | Verifiable membership |
| Reserve Dashboard | Public view of reserves vs. outstanding liabilities | Audit support; member trust |
| Staking Registry | Lock duration, revenue share percentage, maturity tracking | Staking lifecycle management |
| Clearing Interface | API for bilateral credit exchange between conforming issuers | Cross-network interoperability |

The Ethereum ledger provides auditability by default — any member or auditor can independently verify total issuance, total redemption, and current outstanding supply. The custodial architecture means members interact through the cooperative's orchestrated interface, not directly with smart contracts.

## 8. The Ecological Connection

The name "$CLOUD" is a learning device. Cloud computing is named after the atmospheric phenomenon — distributed, ever-present, seemingly immaterial but carrying essential resources. The duality serves as an entry point for understanding what "the cloud" actually is:

- **Natural cloud:** Water cycle, weather systems, atmospheric commons — shared infrastructure that no entity owns but all depend on
- **Technological cloud:** Distributed computing, storage, transfer — shared infrastructure that appears seamless but runs on physical resources

$CLOUD credits make the connection explicit: digital infrastructure, like atmospheric infrastructure, is a commons that benefits from cooperative stewardship rather than extractive ownership.

## 9. Adoption Path

A single issuer operating alone provides transparent, member-governed infrastructure access with USD-backed credit stability.

Two or more issuers sharing this specification create a legible pricing layer across the web stack.

At scale, a network of conforming issuers constitutes a **civic information economy**: infrastructure priced in real resource units, governed by the communities that depend on it, interoperable without centralized coordination.

Each issuer is sovereign. Interoperability is opt-in, negotiated bilaterally, and grounded in the shared grammar of four primitives and a published rate card. No issuer needs to trust another's creditworthiness; they only need to read each other's rate cards.

---

*This specification is published as an open protocol template. It does not constitute legal advice. Issuers are responsible for obtaining jurisdiction-specific legal review before credit issuance.*
