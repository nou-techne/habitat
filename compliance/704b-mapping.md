# IRC Section 704(b) Compliance Mapping

## Purpose

Map the requirements of IRC Section 704(b) — which governs how partnership allocations must have "substantial economic effect" — onto the composable tool architecture. RegenHub, LCA is taxed as a partnership under Subchapter K. Every allocation of income, gain, loss, deduction, or credit to members must pass the 704(b) tests or the IRS can reallocate based on partners' interests in the partnership.

This document identifies what the law requires, which tool component delivers it, and where gaps exist.

---

## The Two-Part Test

### Part 1: Economic Effect

An allocation has economic effect if, throughout the full term of the partnership, three conditions are met:

| # | Requirement | What It Means | Tool Component |
|---|------------|---------------|----------------|
| 1 | **Capital account maintenance** | The partnership must maintain capital accounts for each partner in accordance with Treasury Regulation § 1.704-1(b)(2)(iv) | **Treasury** — Each member gets an equity-type Account (capital account). Every contribution, allocation, distribution, and adjustment is recorded as double-entry Transactions affecting that account. Event sourcing ensures the complete history is reconstructable. |
| 2 | **Liquidation in accordance with capital accounts** | Upon liquidation, proceeds must be distributed in accordance with positive capital account balances | **Agreements** — The operating agreement's distribution Term must specify liquidation follows capital account balances. This is a governance constraint, not a calculation — but the tool must enforce it by deriving liquidation distributions from Treasury balance data. |
| 3 | **Deficit restoration obligation (DRO)** | Partners with negative capital accounts must restore the deficit upon liquidation, OR the allocation must satisfy the "alternate test for economic effect" | **Agreements** — The operating agreement must contain either a DRO clause or a qualified income offset (QIO) provision. **Treasury** — Must track and flag negative capital account balances. **People** — Must associate DRO obligations with member profiles. |

### Part 2: Substantiality

Even if an allocation has economic effect, it must also be "substantial" — meaning there is a reasonable possibility that the allocation will substantially affect the dollar amounts received by the partners, independent of tax consequences.

| Requirement | What It Means | Tool Component |
|------------|---------------|----------------|
| **General substantiality** | The allocation must have real economic consequences beyond tax benefits | **Agreements** — Allocation formulas must be based on genuine economic factors (contribution, revenue, participation), not tax-motivated shifting. The weighted patronage formula (labor, revenue, cash, community) satisfies this when weights reflect real economic participation. |
| **Shifting test** | The allocation cannot merely shift tax consequences between partners in a way that benefits all (after tax) without changing economics | **Agreements** — Calculation records must capture the economic rationale. The inputs_snapshot in each Calculation provides the audit trail. |
| **Transitory test** | Allocations cannot be temporary arrangements designed to be reversed in a later year | **Treasury** — Event sourcing with temporal queries allows auditors to verify allocation patterns across periods. Period management prevents retroactive changes. |

---

## Capital Account Maintenance Rules (Reg. § 1.704-1(b)(2)(iv))

The capital account is the spine of 704(b) compliance. It must be adjusted as follows:

| Event | Capital Account Effect | Tool Flow |
|-------|----------------------|-----------|
| **Cash contribution** | Increase by amount of cash | People logs Contribution (type: cash) → Event bus → Treasury credits member's capital account |
| **Property contribution** | Increase by fair market value (FMV) at time of contribution | People logs Contribution (type: in-kind) with Valuation Rule applied at contribution time → Treasury credits at FMV |
| **Services contribution** | Generally no immediate increase (but LCA may elect under 704(c) principles) | People logs Contribution (type: labor) → Valuation Rule determines recognized amount → Treasury credits if agreement terms permit |
| **Allocation of income/gain** | Increase by allocated share | Agreements executes allocation Calculation → Treasury credits member's capital account, debits retained earnings |
| **Allocation of loss/deduction** | Decrease by allocated share | Same flow, reversed entries |
| **Cash distribution** | Decrease by amount of cash | Treasury records distribution Transaction → debits member's capital account |
| **Property distribution** | Decrease by FMV at time of distribution | Treasury records at FMV via Valuation Rule |

### Key Invariants for Compliance

1. **Capital accounts must never be adjusted by liabilities** — only by contributions, allocations, and distributions of actual economic value
2. **Revaluations** (book-ups/book-downs) permitted when new members are admitted — requires FMV determination of partnership assets and proportional adjustment of all capital accounts
3. **Section 704(c) principles** apply when contributed property has FMV ≠ tax basis — the tool must track both book value and tax basis separately
4. **Nonrecourse deductions** have special allocation rules under Reg. § 1.704-2 — requires tracking of partnership minimum gain

---

## Gaps in Current Architecture

| Gap | Description | Recommendation |
|-----|------------|----------------|
| **Book/tax basis tracking** | Current Treasury tracks one balance per account. 704(b) compliance requires maintaining both book (FMV) and tax basis values for capital accounts. | Extend Account to support dual-basis tracking, or create parallel account structures (book capital account + tax capital account per member). |
| **Revaluation events** | No explicit support for book-up/book-down when new members join or interests change. | Add a revaluation Event type that adjusts all capital accounts proportionally based on FMV determination. |
| **Minimum gain tracking** | Nonrecourse liabilities create "partnership minimum gain" that must be tracked for allocation compliance. | Add a tracking mechanism in Treasury for minimum gain, with corresponding allocation rules in Agreements. |
| **704(c) layers** | Contributed property with built-in gain/loss requires tracking the difference between book and tax value across the property's life. | Extend the Contribution entity to carry both book and tax basis, with depreciation/amortization schedules. |
| **K-1 generation** | The system context diagram shows K-1 export for accountants, but no tool component explicitly handles the Schedule K-1 data assembly. | Add a reporting module that assembles K-1 data from capital account movements, allocation calculations, and member profiles. |
| **QIO / DRO tracking** | The architecture doesn't explicitly model deficit restoration obligations or qualified income offset provisions. | Add to People/Agreements: DRO flag per member, QIO trigger threshold, automatic QIO allocation logic. |

---

## Compliance Validation Checklist

At each period close, the system should validate:

- [ ] All capital accounts have been adjusted for contributions received
- [ ] All capital accounts have been adjusted for distributions made
- [ ] Allocation calculations have been executed and applied
- [ ] All transactions balance to zero (double-entry integrity)
- [ ] No capital account has gone negative without DRO or QIO coverage
- [ ] Book and tax capital accounts are separately maintained
- [ ] Allocation formula reflects genuine economic factors (substantiality)
- [ ] Period is locked against retroactive changes

---

## Connection to $CLOUD Credits

$CLOUD credits (the postage stamp layer) interact with 704(b) through the revenue stream. When the cooperative issues and redeems $CLOUD credits:
- **Issuance** is a liability event (prepaid obligation) — Treasury records credit issued as liability
- **Redemption** is revenue recognition — Treasury records revenue when infrastructure service is delivered
- **Allocation** of that revenue follows the patronage formula, flowing through the 704(b)-compliant allocation calculation

The $CLOUD credit system must integrate with Treasury in a way that properly times revenue recognition and routes it through the allocation engine.

---

*Sprint 2 | February 7, 2026 | Patronage Accounting System*
