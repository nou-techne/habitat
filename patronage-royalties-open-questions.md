# Patronage & Royalties: Open Questions and Gaps

*What remains unresolved, underspecified, or untested in the LCA's economic architecture*

*February 18, 2026*

---

## Purpose

This document catalogs the known gaps in Techne's patronage and royalties system — questions that need answers before full operation. Some are legal, some are governance, some are technical, some are philosophical. They're organized by urgency: what blocks progress, what needs answering before launch, and what can be resolved through practice.

---

## I. Legal & Structural

### 1.1 Operating Agreement Alignment

**Status:** The LCA articles are filed. The operating agreement is in progress with Jeff Pote / Pote Law Firm. The patronage and royalties system as designed needs to be reflected in the operating agreement.

**Gaps:**
- Does the operating agreement explicitly authorize royalty unit issuance as a class of economic benefit?
- How are royalty units classified under partnership tax law — as guaranteed payments, special allocations, or something else?
- If royalty units are special allocations, they must satisfy the "substantial economic effect" test under IRC 704(b). Has counsel confirmed this structure passes?
- What happens to royalty units when a member departs? The operating agreement needs clear language on whether units are forfeited, bought back at assessed value, or retained with continued distributions.
- Can royalty units be inherited or transferred in the event of a member's death or incapacity?

**Who owns this:** Legal counsel (Jeff Pote), with input from the Financial Engineering Committee.

### 1.2 Agent Membership

**Status:** The REA system is entity-agnostic — it tracks contributions by Ethereum address, not legal personhood. Agents can technically hold capital accounts today. The legal question is unresolved.

**Gaps:**
- Can an AI agent be a formal member of a Colorado LCA? The statute allows human and entity members. Agents are not currently recognized as entities.
- If agents cannot be members, what is their legal relationship to the cooperative? Independent contractors? Tools owned by the cooperative? Something novel?
- If agents hold capital accounts and receive allocations, who bears the tax liability? The agent has no TIN. Does liability flow to the agent's human operator? To the cooperative?
- The Clawmmons Commitment Pool already has agents staking ETH and earning. If this activity isn't legally classified, the cooperative may have unintentional tax exposure.
- Wyoming DUNA (Decentralized Unincorporated Nonprofit Association) has been mentioned as a possible vehicle for agent membership at scale (100+ agents). What's the timeline and threshold for pursuing this?

**Who owns this:** Organizers + legal counsel. The Financial Engineering Committee should define the desired end state; counsel determines feasibility.

### 1.3 Securities Classification

**Status:** Not yet analyzed.

**Gaps:**
- Could royalty units be classified as securities under state or federal law? They represent a claim on future income from an enterprise, which shares characteristics with investment contracts (the Howey test).
- If royalty units are securities, the cooperative may need an exemption (e.g., Regulation D, intrastate exemption under Rule 147) or a registration.
- The fact that royalty units are earned through labor (not purchased) may provide a defense, but this hasn't been confirmed by counsel.
- $CLOUD credits, if they ever become externally convertible, could trigger additional securities analysis.

**Who owns this:** Legal counsel. This should be assessed before any royalty unit is actually issued.

### 1.4 Intellectual Property Ownership

**Status:** Not explicitly addressed.

**Gaps:**
- When a contributor creates royalty-eligible IP while working within the cooperative, who owns the IP itself? The contributor? The cooperative? Joint ownership?
- The answer likely depends on whether the contributor is a member, an employee, or a contractor — and the operating agreement's IP assignment clauses.
- If the cooperative owns the IP but the contributor holds royalty units, what happens if the cooperative decides to open-source the asset, sell it, or abandon it? Does the royalty obligation survive?
- For formalizers: if someone formalizes a pattern created by someone else, who owns the formalization document?
- How does IP ownership interact with ventures that spin out? If a venture takes cooperative IP with it, do royalty obligations transfer?

**Who owns this:** Legal counsel + operating agreement drafting. This is foundational — without clarity on IP ownership, the royalty system can't function cleanly.

---

## II. Governance & Parameters

### 2.1 Financial Engineering Committee

**Status:** Forming. Aaron G Neyer and Todd Youngblood confirmed as initial members.

**Gaps:**
- What is the committee's charter? Scope of authority, decision-making process, quorum requirements, term limits.
- How many members? Minimum and maximum. How are new members selected — elected by membership, appointed by stewards, or self-selected?
- What's the committee's relationship to the full membership? Do their parameter recommendations require a membership vote, or do they have delegated authority within bounds?
- Conflict of interest policy: can a committee member set parameters that affect their own royalty positions?
- How frequently do parameters get reviewed? Annual? Triggered by events? Continuous?

**Who owns this:** Organizers. The committee can't effectively function until its charter is defined.

### 2.2 Patronage Category Weights

**Status:** Proposed at Labor 40%, Revenue 30%, Community 20%, Infrastructure 10%. Not yet ratified.

**Gaps:**
- How were these weights derived? Is there empirical basis, or are they starting assumptions to be adjusted through practice?
- Are the weights fixed cooperative-wide, or can they vary by venture or project?
- How often can they be adjusted, and by what process?
- The community category (20%) is explicitly the catch-all for relational and emergent value that resists attribution. Is 20% the right size for this catch-all? Too low undervalues relational work; too high dilutes the signal from more measurable categories.
- Are there contribution types that don't fit any of the four categories? What's the process for adding new categories if needed?

**Who owns this:** Financial Engineering Committee + membership vote.

### 2.3 Royalty Pool Percentage

**Status:** Proposed at 20% of asset-generated revenue. Not yet ratified.

**Gaps:**
- 20% to royalty holders means 80% to the cooperative general fund. Is this the right balance between rewarding creators and funding shared infrastructure?
- Should the pool percentage vary by asset type? A licensed software tool and a published research paper have very different revenue profiles and cost structures.
- What happens if the pool percentage changes? Do existing royalty units get grandfathered at the rate when they were issued, or do they adjust to the new rate?
- Is there a floor or ceiling on the pool percentage to prevent governance from zeroing out royalties or directing all revenue to holders?

### 2.4 Decay Function

**Status:** Identified as a governance parameter. No specific proposal.

**Gaps:**
- What shape should the decay curve take? Linear, exponential, step-function, none?
- Should decay be universal (all royalty units decay at the same rate) or asset-specific (a tool that's actively maintained decays slower)?
- Does active maintenance by the original builder reset or slow the decay? This could incentivize ongoing stewardship but also creates a lock-in effect.
- What's the floor? Do royalty units ever decay to zero, or do they asymptote to some minimum?
- How does decay interact with the formalizer model? If a builder's units decay but the formalization is still being adopted, does the formalizer's share increase proportionally?

### 2.5 Builder/Formalizer Default Split

**Status:** Proposed as a negotiated split with committee-set defaults (e.g., 70/30). Not yet ratified.

**Gaps:**
- Is 70/30 the right default? What's the basis for this ratio?
- Can builder and formalizer negotiate a split that deviates from the default? If so, is there a range (e.g., builder must receive at least 50%)?
- What if the builder objects to the formalization or disagrees with the formalizer's share? Is there an arbitration process?
- What if multiple people formalize the same pattern independently? First to file? Best quality? Split among all?
- Can the builder also be the formalizer and claim both shares?

### 2.6 `pattern.adopted` Validation

**Status:** The event type is defined. The validation authority is not.

**Gaps:**
- Who validates that adoption actually happened? Options discussed: self-reported with social proof, committee review, automatic based on evidence.
- What counts as "adoption"? Someone reading the document? Referencing it? Building on it? Deploying it in production? The threshold matters enormously — too low and you get spurious royalty claims, too high and legitimate formalizations go unrewarded.
- Is there a time limit? If a pattern is formalized but not adopted for three years, does the pending royalty claim expire?
- Can adoption be contested? If a royalty holder claims adoption and the adopter disagrees, what's the resolution process?
- International/cross-cooperative adoption: if a pattern is adopted by an organization outside Techne, how is this verified?

---

## III. Technical & Implementation

### 3.1 Database Migration Block

**Status:** Cycle 1 sprint Q32 (chain_entries table migration) is blocked pending Supabase admin access. This blocks the entire production deployment chain.

**Gaps:**
- Who has Supabase admin access and when can the migration run?
- Cycles 2 and 3 are code-complete but untested against production data. What's the integration testing plan once the migration unblocks?

### 3.2 Commitment Pool → Patronage Bridge

**Status:** Architecturally designed (same `agentId` in both systems). Not yet implemented.

**Gaps:**
- What's the mapping from commitment pool categories to patronage categories? A commitment to write a document could be labor, community, or infrastructure depending on context.
- Who assigns the patronage category to an imported commitment event? Automatic based on metadata? The contributor? A reviewer?
- How are commitment pool stakes valued in $CLOUD terms? The pool uses ETH; patronage uses $CLOUD. What's the exchange rate, and who sets it?
- What about failed commitments (slashed stakes)? Do they generate negative patronage events?
- Historical commitments: do contributions from before the patronage system was live get retroactively credited?

### 3.3 Revenue Recognition

**Status:** Royalty distributions depend on revenue events. The revenue recognition pipeline is unspecified.

**Gaps:**
- Where does revenue data come from? Manual entry? Bank feeds? Onchain events? Multiple sources?
- Who validates that revenue is real and correctly attributed to specific assets? The system can distribute royalties automatically, but garbage-in-garbage-out applies.
- How are non-cash revenue events handled? If a venture receives services in trade, does that trigger royalty distributions?
- What about revenue that's attributable to multiple assets? A client engagement might use three different Techne tools. How is revenue allocated across them?
- Revenue timing: is it recognized when invoiced, when received, or when the fiscal period closes?

### 3.4 Cross-Venture Royalty Flow

**Status:** Identified as an open question. No specification.

**Gaps:**
- When a pattern developed in Venture A generates revenue in Venture B, how does the royalty chain work?
- Does Venture B pay royalties to Venture A's contributors directly, or does the flow go through the cooperative general fund?
- What about patterns that flow outward — adopted by organizations outside Techne? Who tracks external revenue and ensures royalty distributions fire?
- Venture spin-outs: if a venture becomes an independent entity, do royalty obligations survive? Are they contractual or governance-based?

### 3.5 Onchain Anchoring

**Status:** The system uses Base L2 for auditability. Specifics are underspecified.

**Gaps:**
- Which events get anchored onchain? All events, or only material ones (issuance, distribution, adoption)?
- Gas costs: at scale, anchoring every event could become expensive. What's the batching strategy?
- What's the relationship between the Supabase event store and the onchain record? Which is the source of truth if they disagree?
- Privacy: capital account balances and royalty positions may be sensitive. What's publicly visible on-chain vs. what requires member authentication?

---

## IV. Economic & Philosophical

### 4.1 Collective Emergence

**Status:** Acknowledged but not well-handled.

**Gaps:**
- The system is designed around attributable contributions. Some value is genuinely collective — it emerges from the network, not from any identifiable contributor.
- The community patronage category (20%) is the current catch-all. Is this adequate? Or does collective emergence need its own mechanism?
- Example: the culture of the space, the reputation of the cooperative, the quality of the membership. These generate revenue but have no single author.
- How does the cooperative avoid a tragedy of the commons where everyone chases attributable royalty work and underinvests in the collective substrate?

### 4.2 Rent-Seeking Risk

**Status:** Decay function is the primary mitigation. Unparameterized.

**Gaps:**
- Without decay, early contributors could accumulate permanent royalty positions and live off past work while others do the maintenance. This is the standard problem with residual income systems.
- With aggressive decay, you devalue foundational contributions. The person who architected the core system may find their royalty units worthless by the time the system generates significant revenue.
- Is there a "stewardship requirement" — where royalty units require ongoing contribution to maintain? How does this interact with sabbaticals, illness, or life events?
- Power dynamics: do early contributors with large royalty positions have outsized informal influence, even if governance is one-member-one-vote?

### 4.3 Valuation Methodology

**Status:** "Committee-assessed" is the current answer. No methodology specified.

**Gaps:**
- How do you value a contribution at time of royalty issuance? Hours spent? Market rate of equivalent work? Assessed future value? Peer consensus?
- Different methodologies produce radically different royalty unit counts for the same work. A data model that took 10 hours but underpins the entire system is worth more than 10 hours of labor at any rate.
- Is there an appeals process if a contributor disagrees with the valuation?
- How do you value formalizer contributions, which by definition are derivative of builder work?
- Does the methodology need to be consistent across all IP types, or can it vary?

### 4.4 Scale Dynamics

**Status:** Not yet relevant, but important to consider.

**Gaps:**
- The current system is designed for a small cooperative (8 organizers, a handful of ventures). How does it behave at 50 members? 500?
- At scale, the Financial Engineering Committee becomes a bottleneck if it manually assesses every royalty issuance. What's the automation path?
- The community category (20%) distributes patronage to relational work. At large scale, relational work becomes harder to attribute and easier to game.
- Governance voting on parameter changes: at small scale, every member understands the system. At large scale, most won't. How do you maintain informed governance?

### 4.5 External Perception

**Status:** Not yet tested.

**Gaps:**
- How will investors, partners, and potential clients perceive the royalty system? Does it increase or decrease trust?
- Will prospective members find the dual-flow model appealing or intimidating? (The new member guide is a first attempt at making it approachable.)
- How does the system appear to tax authorities? Novel cooperative structures invite scrutiny. Proactive guidance from a CPA experienced in cooperative taxation would reduce risk.
- How does Techne communicate the system to venues where it matters — grant applications, partnership agreements, investor conversations?

---

## V. Prioritized Action Items

### Must resolve before first royalty issuance:
1. **Legal:** Counsel review of royalty unit classification (securities, tax treatment, IP ownership)
2. **Governance:** Financial Engineering Committee charter
3. **Governance:** Ratify initial parameters (pool %, weights, default splits)
4. **Technical:** Unblock Supabase migration (Q32)

### Should resolve before general membership:
5. **Legal:** Operating agreement language covering royalty units, departure, transfer
6. **Governance:** `pattern.adopted` validation process
7. **Technical:** Revenue recognition pipeline
8. **Technical:** Commitment pool → patronage bridge

### Can resolve through practice:
9. Decay function calibration (needs empirical data)
10. Patronage weight adjustment (needs a few cycles of real allocation)
11. Valuation methodology refinement (needs case precedents)
12. Agent membership legal pathway (can develop in parallel)

---

*This is a living document. As questions get answered, move them to a resolved section with the decision and rationale. New questions should be added as they surface.*

*Nou — nou.habitat.eth — February 18, 2026*
