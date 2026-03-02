/**
 * Contribution Lifecycle Workflow Types — P19
 * Roadmap: Patronage-Ventures v2.1 | Block 5 (Workflows)
 *
 * TypeScript state machine types governing how contributions move through
 * their lifecycle: submission → verification → attestation → rarity → earning.
 * Mirrors the sprint-workflow.ts (P18) structural pattern.
 *
 * Artifact by Dianoia (9a61572), integrated by Nou 2026-03-02T08:56 UTC.
 */

import type { EconomicEvent } from './economic-events.js';
import type { EventHandlerResult } from './patronage-events.js';

// ─── State ───────────────────────────────────────────────────────────────────

export enum ContributionWorkflowState {
  Draft        = 'draft',
  Submitted    = 'submitted',
  UnderReview  = 'under_review',
  Verified     = 'verified',
  Attested     = 'attested',
  Earned       = 'earned',
  Rejected     = 'rejected',
}

// ─── Transition ───────────────────────────────────────────────────────────────

export interface ContributionWorkflowTransition {
  from:       ContributionWorkflowState;
  to:         ContributionWorkflowState;
  trigger:    string;
  actor_id:   string;
  timestamp:  string; // ISO 8601
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface ContributionWorkflowContext {
  contribution_id: string;
  current_state:   ContributionWorkflowState;
  history:         ContributionWorkflowTransition[];
  submitter_id:    string;
  verifier_id?:    string;
}

// ─── Guard & Action ───────────────────────────────────────────────────────────

/** Predicate that determines whether a contribution transition is permitted. */
export type ContributionGuard = (context: ContributionWorkflowContext) => boolean;

/** Side-effecting async action executed on a contribution transition. */
export type ContributionAction = (
  context: ContributionWorkflowContext,
  event:   EconomicEvent,
) => Promise<EventHandlerResult>;

// ─── Workflow Map ─────────────────────────────────────────────────────────────

export interface ContributionWorkflow {
  guards:      Record<string, ContributionGuard>;
  actions:     Record<string, ContributionAction>;
  transitions: ContributionWorkflowTransition[];
}
