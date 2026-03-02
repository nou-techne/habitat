/**
 * Moderation Event Handler Types
 *
 * TypeScript interfaces for moderation lifecycle event handlers.
 * These are Layer 4 (Event) handlers that fire on moderation actions,
 * suspensions, reinstatements, and audit log entries.
 *
 * Sprint: P16 — Moderation Event Handler Types
 * Roadmap: Patronage-Ventures v2.1 | Block 4 (Event Handlers)
 * Date: 2026-03-02
 * Note: Self-executed by Nou (41-min Dianoia timeout). Block 4: 3/4.
 */

import { EventContext, EventHandlerResult } from './patronage-events.js';

// =============================================================================
// Moderation Event Types
// =============================================================================

/**
 * Enum of all moderation lifecycle event types
 */
export enum ModerationEventType {
  ModerationActionTaken = 'moderation_action_taken',
  AgentSuspended = 'agent_suspended',
  AgentReinstated = 'agent_reinstated',
  ModerationLogged = 'moderation_logged',
}

// =============================================================================
// Moderation Event Record
// =============================================================================

/**
 * Record of a moderation lifecycle event
 */
export interface ModerationEvent {
  event_type: ModerationEventType;
  agent_id: string;
  occurred_at: string;
  meta?: Record<string, unknown>;
}

// =============================================================================
// Handler Input Shapes
// =============================================================================

/**
 * Input for onModerationActionTaken — fires after POST /moderation-action succeeds
 */
export interface ModerationActionTakenInput {
  agent_id: string;
  action_type: string;
  reason: string;
  moderator_id: string;
}

/**
 * Input for onAgentSuspended — fires when an agent's standing drops to suspended
 */
export interface AgentSuspendedInput {
  agent_id: string;
  suspended_by: string;
  suspended_until?: string; // ISO timestamp; undefined = indefinite
  reason: string;
}

/**
 * Input for onAgentReinstated — fires when suspension is lifted
 */
export interface AgentReinstatedInput {
  agent_id: string;
  reinstated_by: string;
  prior_level: string; // standing level before suspension
}

/**
 * Input for onModerationLogged — fires after each moderation-log entry is created
 */
export interface ModerationLoggedInput {
  log_id: string;
  agent_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

// =============================================================================
// Event Handler Interfaces
// =============================================================================

/**
 * Fires after POST /moderation-action succeeds.
 * Records that a moderator took a formal action against an agent.
 */
export type OnModerationActionTakenHandler = (
  context: EventContext,
  input: ModerationActionTakenInput
) => EventHandlerResult;

/**
 * Fires when an agent's standing drops to suspended.
 * May be triggered by repeated violations or explicit moderator decision.
 */
export type OnAgentSuspendedHandler = (
  context: EventContext,
  input: AgentSuspendedInput
) => EventHandlerResult;

/**
 * Fires when a suspension is lifted and the agent is reinstated.
 * prior_level indicates the standing tier the agent returns to.
 */
export type OnAgentReinstatedHandler = (
  context: EventContext,
  input: AgentReinstatedInput
) => EventHandlerResult;

/**
 * Fires after each moderation-log audit entry is created.
 * Allows downstream systems to react to logged moderation events.
 */
export type OnModerationLoggedHandler = (
  context: EventContext,
  input: ModerationLoggedInput
) => EventHandlerResult;
