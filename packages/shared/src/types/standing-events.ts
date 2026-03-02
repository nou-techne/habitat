/**
 * Patronage-Ventures v2.1 — Block 4: Event Handlers
 * P15 — Standing Event Handler Types
 *
 * TypeScript event handler interfaces for standing progression and consent
 * lifecycle. Mirrors the EventContext/HandlerInput/HandlerOutput pattern
 * established in P14 (patronage-events.ts).
 *
 * Self-executed by Nou (44-min Dianoia timeout) — 2026-03-02
 */

import type { EventContext, EventHandlerResult } from './patronage-events.js';

// ---------------------------------------------------------------------------
// StandingEventType enum
// ---------------------------------------------------------------------------

export enum StandingEventType {
  StandingEvaluated = 'standing_evaluated',
  StandingAdvanced  = 'standing_advanced',
  ConsentGranted    = 'consent_granted',
  ConsentRevoked    = 'consent_revoked',
}

// ---------------------------------------------------------------------------
// StandingEvent — record type for persisted standing event log entries
// ---------------------------------------------------------------------------

export interface StandingEvent {
  id: string;
  event_type: StandingEventType;
  context: EventContext;
  payload: Record<string, unknown>;
  result?: EventHandlerResult;
  created_at: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Handler: onStandingEvaluated
// ---------------------------------------------------------------------------

export type StandingLevel = 'enrolled' | 'contributor' | 'steward' | 'principal';

export interface OnStandingEvaluatedInput {
  /** The standing gate being checked (FK → standing_gates.id) */
  gate_id: string;
  /** The agent's current standing tier */
  current_level: StandingLevel;
  /** Whether the agent passed the gate check */
  passed: boolean;
  /** Human-readable reason for pass/fail, if available */
  reason?: string;
}

/**
 * Fires when GET /standing-check is called. Allows handlers to log
 * gate evaluations, trigger notifications, or record audit events.
 */
export type OnStandingEvaluatedHandler = (
  context: EventContext,
  input: OnStandingEvaluatedInput,
) => EventHandlerResult;

// ---------------------------------------------------------------------------
// Handler: onStandingAdvanced
// ---------------------------------------------------------------------------

export interface OnStandingAdvancedInput {
  /** The agent whose standing changed */
  agent_id: string;
  /** The tier before the transition */
  previous_level: StandingLevel;
  /** The tier after the transition */
  new_level: StandingLevel;
  /** ISO 8601 timestamp of the transition */
  advanced_at: string;
  /** FK → contributions.id — the contribution that triggered advancement, if any */
  trigger_contribution_id?: string;
}

/**
 * Fires when an agent's standing_level changes (enrolled → contributor →
 * steward → principal). Handlers may update patronage allocation weights,
 * unlock standing-gated features, or notify the agent.
 */
export type OnStandingAdvancedHandler = (
  context: EventContext,
  input: OnStandingAdvancedInput,
) => EventHandlerResult;

// ---------------------------------------------------------------------------
// Handler: onConsentGranted
// ---------------------------------------------------------------------------

export interface OnConsentGrantedInput {
  /** The agent granting consent */
  grantor_id: string;
  /** The agent receiving consent */
  grantee_id: string;
  /** The scope of consent granted (e.g., 'read:contributions', 'write:capacity') */
  scope: string;
  /** ISO 8601 timestamp of when consent was granted */
  granted_at: string;
  /** Optional expiry — null means indefinite */
  expires_at?: string | null;
}

/**
 * Fires after POST /consent-grant succeeds. Handlers may update
 * capability records, log consent events for audit, or notify grantee.
 */
export type OnConsentGrantedHandler = (
  context: EventContext,
  input: OnConsentGrantedInput,
) => EventHandlerResult;

// ---------------------------------------------------------------------------
// Handler: onConsentRevoked
// ---------------------------------------------------------------------------

export interface OnConsentRevokedInput {
  /** The agent revoking consent */
  grantor_id: string;
  /** The agent whose consent is being revoked */
  grantee_id: string;
  /** The scope being revoked */
  scope: string;
  /** ISO 8601 timestamp of revocation */
  revoked_at: string;
  /** Reason for revocation, if provided */
  reason?: string;
}

/**
 * Fires after POST /consent-revoke succeeds. Handlers should invalidate
 * any cached capability grants, log the revocation for audit, and
 * optionally notify the affected grantee.
 */
export type OnConsentRevokedHandler = (
  context: EventContext,
  input: OnConsentRevokedInput,
) => EventHandlerResult;
