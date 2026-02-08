# Member Allocation Statements

*Sprint 15 — Building on: [K-1 Data Assembly](k1-data-assembly.md)*

---

## Overview

Sprint 14 assembled the data the accountant needs. This sprint addresses the data the member needs — a statement that explains, in plain language, what their allocation is, how it was calculated, and what it means for their stake in the cooperative.

Most members are not accountants. They should not need to be. The allocation statement translates the patronage formula's output into something a person can read and understand in under two minutes. If a member finishes reading their statement and still doesn't understand why they received what they received, the statement has failed.

This completes Phase 3 (Allocation / Agreements MVP).

## The Statement

```
╔══════════════════════════════════════════════════════════════╗
║                   MEMBER ALLOCATION STATEMENT                ║
║                        Q1 2026                               ║
║                        Alice Chen                            ║
╚══════════════════════════════════════════════════════════════╝

YOUR CONTRIBUTIONS THIS QUARTER

  Labor                    60 hours          $6,000.00
  Revenue generated                          $4,000.00
  Cash contributed                           $2,000.00
  Community participation  10 hours            $500.00
                                           ──────────
  Total contributions                      $12,500.00


HOW YOUR ALLOCATION WAS CALCULATED

  The cooperative earned $3,000.00 in net income this quarter.
  Your share was determined by your contributions, weighted by
  category importance:

  Category        Your Value    Weight    Weighted Value
  ─────────────────────────────────────────────────────
  Labor            $6,000.00    ×40%       $2,400.00
  Revenue          $4,000.00    ×30%       $1,200.00
  Cash             $2,000.00    ×20%         $400.00
  Community          $500.00    ×10%          $50.00
                                          ──────────
  Your weighted total                      $4,050.00

  All members' weighted total              $9,250.00

  Your patronage percentage    4,050 / 9,250 = 43.78%


YOUR ALLOCATION

  Net income          $3,000.00
  Your share (43.78%) $1,313.40

  This amount has been credited to your capital account.


YOUR CAPITAL ACCOUNT

  Balance at start of quarter              $5,000.00
  + Contributions (cash)                   $2,000.00
  + Patronage allocation                   $1,313.40
  − Distributions                              $0.00
                                          ──────────
  Balance at end of quarter                $8,313.40

  Your capital account represents your economic stake in the
  cooperative. It grows through contributions and allocations,
  and decreases through distributions.


WHAT THIS MEANS FOR YOUR TAXES

  Your share of the cooperative's income will be reported on
  Schedule K-1, which you'll receive from the accountant.
  You may owe taxes on your allocated share ($1,313.40) plus
  any guaranteed payments you received, regardless of whether
  cash was distributed to you.

  This is not tax advice. Consult your tax preparer.

╔══════════════════════════════════════════════════════════════╗
║  Questions? Contact the operations steward.                  ║
║  Calculation ID: calc-2026-q1-final                          ║
║  Generated: April 5, 2026                                    ║
╚══════════════════════════════════════════════════════════════╝
```

## Design Principles

**Show the math, not the jargon.** "Your value × weight = weighted value" is comprehensible. "Your IRC 704(b) book-basis capital account was adjusted per Treas. Reg. § 1.704-1(b)(2)(iv)" is not. The compliance details exist in the system; the statement speaks in human terms.

**Make it comparative without being competitive.** The statement shows the member's own weighted total and the cooperative's total, which is enough to understand the percentage. It does not show other members' individual contributions or allocations. Members can see their own position without ranking against peers.

**End with what matters.** The capital account balance is the bottom line — your stake in the cooperative. The tax note prepares members for their K-1 without overstepping into tax advice.

**Link to detail.** The calculation ID lets any member (or their tax preparer) request the full calculation record for verification. The statement is a summary; the detail is available on request.

## Statement Sections

| Section | Purpose | Source |
|---------|---------|--------|
| Contributions | What you put in this period | People — applied contributions for member + period |
| Calculation | How your percentage was determined | Allocation calculation record (Sprint 12) |
| Allocation | What you received | Allocation output × net income |
| Capital Account | Your running stake | Treasury — 3100-{member} book capital movements |
| Tax Note | What to expect on your K-1 | Static guidance text + allocation amount |

## Delivery

Statements are generated automatically when period close completes (Sprint 13, Step 7) and delivered through the member's preferred channel:

| Channel | Format | Notes |
|---------|--------|-------|
| Dashboard (Glide) | Interactive | Default view; member can drill into contribution detail |
| Email | PDF attachment | Formal record; auto-sent on period close |
| Secure portal | PDF download | Available on-demand for any closed period |
| API | JSON | For members integrating with personal finance tools |

Members receive a notification when their statement is ready: "Your Q1 2026 allocation statement is available. You received 43.78% ($1,313.40) of this quarter's net income."

## Historical Access

Members can view statements for any closed period. The system maintains the full archive:

```
My Statements

Period      Net Income    My Share    My Allocation    Capital Balance
───────────────────────────────────────────────────────────────────────
Q1 2026      $3,000       43.78%       $1,313.40         $8,313.40
Q4 2025      $4,200       41.20%       $1,730.40         $5,000.00
Q3 2025      $2,800       38.50%       $1,078.00         $3,269.60
Q2 2025      $1,500       45.10%         $676.50         $2,191.60
Q1 2025        $500       50.00%         $250.00         $1,515.10
```

The historical view reveals trends: is my share growing or shrinking? Is the cooperative's net income increasing? Am I contributing more or less over time? These patterns help members make informed decisions about their participation.

## Edge Cases

### Zero Net Income

If the cooperative breaks even or runs a loss:

```
YOUR ALLOCATION

  The cooperative had net income of $0.00 this quarter.
  No patronage allocation was made.

  Your contributions are recorded and will be reflected in
  your patronage percentage for future quarters if the
  organization's allocation formula accounts for cumulative
  contribution history.
```

### Loss Allocation

If net income is negative, losses are allocated by the same patronage formula:

```
YOUR ALLOCATION

  The cooperative had a net loss of ($2,000.00) this quarter.
  Your share of the loss (43.78%): ($875.60)

  This reduces your capital account but may provide a tax
  deduction. Consult your tax preparer.
```

The loss allocation must still satisfy 704(b) — the member's capital account cannot go negative without DRO coverage (Sprint 2). If the allocation would drive the account negative, the system applies the Qualified Income Offset: the member's loss allocation is limited to their capital account balance, and the excess is reallocated to members with sufficient balances.

### New Members (Partial Period)

Members who joined mid-period receive allocation based on contributions made during their membership, not for the full period. The statement notes the join date:

```
  Note: You joined the cooperative on February 15, 2026.
  Your contributions reflect activity from that date through
  the end of the quarter.
```

### No Contributions

A member who made no contributions in a period:

```
YOUR CONTRIBUTIONS THIS QUARTER

  No contributions were recorded for this period.

  Your patronage percentage: 0.00%
  Your allocation: $0.00

  Your capital account balance is unchanged at $5,000.00.
```

Transparent, not punitive. The member sees the result without judgment.

## Phase 3 Validation

With Sprints 12–15 complete, Phase 3 is done:

**Does the calculation match manual verification?**

- [x] Patronage formula with configurable weights (Sprint 12)
- [x] Period close workflow finalizing all inputs (Sprint 13)
- [x] K-1 data assembly with verification checks (Sprint 14)
- [x] Member statements translating results into plain language (Sprint 15)

A member can read their statement, see their contributions, follow the math to their percentage, and verify that the allocation matches. An accountant can export the K-1 data, recalculate from contribution records, and confirm the numbers. The system is legible to both audiences.

## Connection to Next Phase

Phase 4 (Extensions) begins with Sprint 16: Service Credit Integration. The three-phase core is complete — Treasury, People, and Agreements each have their MVP specified. The extensions build on this foundation: service credits as a new revenue type, revaluation events for member admission, Superfluid for continuous-flow allocation, distribution mechanics, and governance controls.

---

*Sprint 15 | February 8, 2026 | Habitat*
