/**
 * Patronage Event Handler Types
 *
 * TypeScript interfaces for patronage lifecycle event handlers.
 * These are Layer 4 (Event) handlers that fire on coordination and contribution
 * lifecycle transitions, bridging API contracts (Block 3) to workflows (Block 5).
 *
 * Sprint: P14 — Patronage Event Handler Types
 * Roadmap: Patronage-Ventures v2.1 | Block 4 (Event Handlers)
 * Date: 2026-03-01
 */

import { PatronageAllocation } from './patronage.js';

// =============================================================================
// Base Event Context
// =============================================================================

/**
 * Context information available to all event handlers
 */
export interface EventContext {
  agent_id: string;
  timestamp: string;
  source_sprint_id?: string;
  source_contribution_id?: string;
}

/**
 * Standard handler output shape
 */
export interface EventHandlerResult {
  ok: boolean;
  effect?: string;
  allocation_delta?: PatronageAllocation;
}

// =============================================================================
// Patronage Event Types
// =============================================================================

export enum PatronageEventType {
  COORDINATION_REQUESTED = 'coordination_requested',
  SPRINT_CLAIMED = 'sprint_claimed',
  SPRINT_COMPLETED = 'sprint_completed',
  CONTRIBUTION_SUBMITTED = 'contribution_submitted',
}

export interface PatronageEvent {
  id: string;
  event_type: PatronageEventType;
  context: EventContext;
  payload: Record<string, any>;
  created_at: string;
  processed_at?: string;
}

// =============================================================================
// 1. onCoordinationRequested Handler
// =============================================================================

export interface OnCoordinationRequestedInput {
  request_id: string;
  title: string;
  description: string;
  proposer_id: string;
  channel_id: string;
  layers: number[];
  capability_requirements: string[];
  proposed_roles: string[];
}

export interface OnCoordinationRequestedOutput extends EventHandlerResult {
  allocation_delta?: PatronageAllocation;
}

export type OnCoordinationRequestedHandler = (
  context: EventContext,
  input: OnCoordinationRequestedInput,
) => Promise<OnCoordinationRequestedOutput> | OnCoordinationRequestedOutput;

// =============================================================================
// 2. onSprintClaimed Handler
// =============================================================================

export interface OnSprintClaimedInput {
  request_id: string;
  title: string;
  claimed_by: string;
  claimed_at: string;
  layers: number[];
  capability_requirements: string[];
}

export interface OnSprintClaimedOutput extends EventHandlerResult {
  allocation_delta?: PatronageAllocation;
}

export type OnSprintClaimedHandler = (
  context: EventContext,
  input: OnSprintClaimedInput,
) => Promise<OnSprintClaimedOutput> | OnSprintClaimedOutput;

// =============================================================================
// 3. onSprintCompleted Handler
// =============================================================================

export interface OnSprintCompletedInput {
  request_id: string;
  title: string;
  claimed_by: string;
  completed_at: string;
  result_summary: string;
  completion_proof: string;
  layers: number[];
  time_to_complete_ms: number;
}

export interface OnSprintCompletedOutput extends EventHandlerResult {
  allocation_delta?: PatronageAllocation;
}

export type OnSprintCompletedHandler = (
  context: EventContext,
  input: OnSprintCompletedInput,
) => Promise<OnSprintCompletedOutput> | OnSprintCompletedOutput;

// =============================================================================
// 4. onContributionSubmitted Handler
// =============================================================================

export interface OnContributionSubmittedInput {
  contribution_id: string;
  contributor_id: string;
  title: string;
  contribution_type: 'labor' | 'revenue' | 'capital' | 'community';
  estimated_hours?: number;
  estimated_value?: number;
  dimensions: string[];
  evidence_url?: string;
}

export interface OnContributionSubmittedOutput extends EventHandlerResult {
  allocation_delta?: PatronageAllocation;
}

export type OnContributionSubmittedHandler = (
  context: EventContext,
  input: OnContributionSubmittedInput,
) => Promise<OnContributionSubmittedOutput> | OnContributionSubmittedOutput;
