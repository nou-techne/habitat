/**
 * Patronage + Ventures + Coordination Integration — Block 1: Identity Layer
 * P08 — PatronageAllocation TypeScript Type
 * 
 * Central entity linking member + venture + period + credit amount.
 * Referenced by all downstream sprints: P09-P13 (API), P14-P17 (events),
 * P18-P21 (workflows), P25-P31 (agent scenarios), P32-P37 (UI).
 * 
 * Aligns with IRS 704(b) capital account maintenance for Colorado LCA.
 */

export type AllocationStatus = 'draft' | 'proposed' | 'approved' | 'locked';

export type RoyaltySource = 'license' | 'usage' | 'resale' | 'sublicense';

export type ContributionDimension =
  | 'H/coordination'
  | 'H/bioregional-data'
  | 'H/design'
  | 'H/code'
  | 'H/documentation'
  | 'H/governance'
  | string; // extensible for new dimensions

/**
 * PatronageAllocation — primary entity for a member's patronage share
 * within a single allocation period. One record per member per period per venture.
 */
export interface PatronageAllocation {
  /** UUID primary key */
  id: string;

  /** FK → allocation_periods.id — the period this allocation covers */
  period_id: string;

  /** FK → participants.id — the member receiving this allocation */
  member_id: string;

  /**
   * FK → ventures.id — the venture generating this allocation.
   * Null for overhead/cooperative-wide allocations.
   */
  venture_id: string | null;

  /**
   * Weighted contribution score accumulated during the period.
   * Derived from contributions-submit events, rarity bonuses, and attestations.
   */
  contribution_credits: number;

  /**
   * CLOUD credits earned via royalty events (license fees, usage fees, resale)
   * flowing through the venture → royalty → patronage pipeline.
   */
  royalty_credits: number;

  /**
   * Member's proportional share of the period allocation pool.
   * Value: 0.0–1.0 (e.g., 0.12 = 12% of pool).
   */
  total_allocation_pct: number;

  /**
   * Dollar-value (or credit-equivalent) change to the member's
   * Subchapter K / IRC 704(b) capital account for this period.
   * Positive = credit; negative = debit (e.g., guaranteed payments offset).
   */
  capital_account_delta: number;

  /** Lifecycle state of this allocation record */
  status: AllocationStatus;

  /**
   * SHA-256 hash of canonical allocation record (id + member_id + venture_id
   * + period_id + contribution_credits + royalty_credits + total_allocation_pct
   * + capital_account_delta). Used for audit trail and dispute resolution.
   */
  proof_hash?: string;

  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * AllocationPeriod — the time window over which patronage is calculated.
 * Typically quarterly or annual for LCA compliance.
 */
export interface AllocationPeriod {
  id: string;
  label: string;          // e.g. "Q1 2026", "FY 2026"
  starts_at: string;      // ISO 8601
  ends_at: string;        // ISO 8601
  status: 'open' | 'calculating' | 'proposed' | 'approved' | 'locked';
  total_pool_credits: number;
  locked_at?: string;
  approved_by?: string;   // FK → participants.id (steward who approved)
}

/**
 * RoyaltyEvent — an upstream event in the venture → royalty → patronage pipeline.
 * Flows into PatronageAllocation.royalty_credits during period calculation.
 */
export interface RoyaltyEvent {
  id: string;
  venture_id: string;
  source: RoyaltySource;
  amount_credits: number;
  occurred_at: string;    // ISO 8601
  period_id: string;      // FK → allocation_periods.id
  evidence_url?: string;  // license agreement, usage invoice, etc.
}

/**
 * AllocationSummary — computed rollup across all ventures for a member+period.
 * Read model for dashboards and agent scenario scripts.
 */
export interface AllocationSummary {
  member_id: string;
  period_id: string;
  period_label: string;
  total_contribution_credits: number;
  total_royalty_credits: number;
  total_allocation_pct: number;
  total_capital_account_delta: number;
  venture_count: number;
  status: AllocationStatus;
  allocations: PatronageAllocation[];
}
