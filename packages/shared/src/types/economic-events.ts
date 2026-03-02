/**
 * Economic/Earning Event Handler Types
 *
 * TypeScript interfaces for economic and CLOUD earning lifecycle event handlers.
 * These are Layer 4 (Event) handlers that fire on earning, verification, rarity,
 * and leaderboard lifecycle transitions.
 *
 * Sprint: P17 — Economic/Earning Event Handler Types (Block 4 Final)
 * Roadmap: Patronage-Ventures v2.1 | Block 4 (Event Handlers)
 * Date: 2026-03-02
 */

import { EventContext, EventHandlerResult } from './patronage-events.js';

// =============================================================================
// Economic Event Type Enum
// =============================================================================

export enum EconomicEventType {
  CLOUD_EARNED = 'cloud_earned',
  CONTRIBUTION_VERIFIED = 'contribution_verified',
  RARITY_UPDATED = 'rarity_updated',
  LEADERBOARD_UPDATED = 'leaderboard_updated',
}

// =============================================================================
// Economic Event Record
// =============================================================================

export interface EconomicEvent {
  id: string;
  type: EconomicEventType;
  agent_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

// =============================================================================
// Handler Input Shapes
// =============================================================================

/**
 * Input for onCloudEarned handler
 * Fires after POST /cloud-earning succeeds
 */
export interface CloudEarnedInput {
  agent_id: string;
  amount: number;
  rule_id: string;
  trigger: string;
  earning_id?: string;
}

/**
 * Input for onContributionVerified handler
 * Fires after POST /contribution-verify succeeds
 */
export interface ContributionVerifiedInput {
  contribution_id: string;
  verifier_id: string;
  attestation_id: string;
  verification_score?: number;
}

/**
 * Input for onRarityUpdated handler
 * Fires when rarity_rank changes for a contribution
 */
export interface RarityUpdatedInput {
  contribution_id: string;
  old_rank: number | null;
  new_rank: number;
  rarity_score?: number;
}

/**
 * Input for onLeaderboardUpdated handler
 * Fires when an agent's ranking shifts on a leaderboard dimension
 */
export interface LeaderboardUpdatedInput {
  agent_id: string;
  dimension: 'velocity' | 'verification_rate' | 'attestation_generosity' | string;
  old_rank: number | null;
  new_rank: number;
}

// =============================================================================
// Event Handler Interfaces
// =============================================================================

/**
 * Fires after CLOUD earning is recorded via POST /cloud-earning
 */
export type OnCloudEarnedHandler = (
  context: EventContext,
  input: CloudEarnedInput
) => EventHandlerResult;

/**
 * Fires after contribution attestation is recorded via POST /contribution-verify
 */
export type OnContributionVerifiedHandler = (
  context: EventContext,
  input: ContributionVerifiedInput
) => EventHandlerResult;

/**
 * Fires when a contribution's rarity rank is recomputed and changes
 */
export type OnRarityUpdatedHandler = (
  context: EventContext,
  input: RarityUpdatedInput
) => EventHandlerResult;

/**
 * Fires when an agent's position shifts on a leaderboard dimension
 */
export type OnLeaderboardUpdatedHandler = (
  context: EventContext,
  input: LeaderboardUpdatedInput
) => EventHandlerResult;

// =============================================================================
// Handler Map
// =============================================================================

export interface EconomicEventHandlers {
  onCloudEarned: OnCloudEarnedHandler;
  onContributionVerified: OnContributionVerifiedHandler;
  onRarityUpdated: OnRarityUpdatedHandler;
  onLeaderboardUpdated: OnLeaderboardUpdatedHandler;
}
