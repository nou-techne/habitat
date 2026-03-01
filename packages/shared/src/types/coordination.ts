/**
 * Coordination Proposal types — P03
 * Reflects coordination_requests table including P07 extensions.
 * All downstream sprints (P09–P37) reference this as the canonical entity.
 */

import type { UUID, Timestamp, JSONObject } from './common'

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export type CoordinationProposalStatus =
  | 'open'
  | 'claimed'
  | 'in_progress'
  | 'testing'
  | 'complete'
  | 'cancelled'

export type CoordinationPriority = 'low' | 'normal' | 'high' | 'critical'

export type ProgressLogEntry = {
  /** ISO timestamp of this log entry */
  at: Timestamp
  /** Human-readable note on progress */
  note: string
  /** Optional percentage 0–100 */
  pct?: number
}

// ---------------------------------------------------------------------------
// Core entity
// ---------------------------------------------------------------------------

/**
 * A coordination request / sprint proposal tracked through the full
 * claim → progress → complete lifecycle (WC-028 protocol).
 *
 * Base fields map to coordination_requests; extended fields added in P07.
 */
export interface CoordinationProposal {
  // --- Identity ---
  id: UUID
  title: string
  description: string

  // --- Status ---
  status: CoordinationProposalStatus
  priority?: CoordinationPriority

  // --- Participants ---
  /** Agent or human who submitted the request */
  requested_by: string
  /** Roles proposed to fulfil the sprint (e.g. ['nou', 'dianoia']) */
  proposed_roles?: string[]
  /** Agent or human who claimed the sprint */
  claimed_by?: string
  claimed_at?: Timestamp

  // --- Roadmap threading (P07) ---
  /** Reference to parent roadmap identifier (e.g. 'Patronage-Ventures-v2.1') */
  roadmap_id?: string
  /** Phase label within that roadmap (e.g. 'Block 2 — State Layer') */
  roadmap_phase?: string

  // --- Execution context (P07) ---
  /**
   * External artifact refs: spec URLs, doc links, test scripts.
   * Stored as TEXT[] in Postgres.
   */
  context_refs?: string[]
  /**
   * Structured progress log — append-only, ordered by `at`.
   * Stored as JSONB; callers should treat as immutable history.
   */
  progress_log?: ProgressLogEntry[]
  /**
   * URL or content digest proving the sprint is complete.
   * Set when status transitions to 'complete'.
   */
  completion_proof?: string
  /**
   * Context injected by the coordination engine at sprint start.
   * Read-only from the executor's perspective.
   */
  injected_context?: JSONObject

  // --- Outcome ---
  result_summary?: string

  // --- Timestamps ---
  created_at: Timestamp
  updated_at?: Timestamp
}

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

/** Body for POST /coordination-request (new sprint) */
export interface CoordinationProposalCreate {
  title: string
  description: string
  requested_by: string
  priority?: CoordinationPriority
  proposed_roles?: string[]
  roadmap_id?: string
  roadmap_phase?: string
  context_refs?: string[]
}

/** Body for POST /coordination-request (lifecycle action) */
export interface CoordinationProposalAction {
  request_id: UUID
  action: 'claim' | 'progress' | 'complete' | 'cancel'
  /** Required when action = 'progress' */
  progress_note?: string
  progress_pct?: number
  /** Required when action = 'complete' */
  result_summary?: string
  completion_proof?: string
}

/** Response envelope from /coordination-request */
export interface CoordinationProposalResponse {
  ok: boolean
  data?: CoordinationProposal
  error?: string
}

/** Response envelope from /coordination-list */
export interface CoordinationListResponse {
  ok: boolean
  data?: {
    requests: CoordinationProposal[]
    total: number
  }
  error?: string
}
