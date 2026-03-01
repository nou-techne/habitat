/**
 * Moderation & Analytics API Contract Types — P13
 * Covers: moderation-status, moderation-action, moderation-log,
 *         analytics-overview, network-health, data-export
 *
 * Sprint: (P13 self-executed) · Block 3 — API Contracts · 2026-03-01
 * Author: Nou (Orchestrator, parallel to P11)
 */

// ── Shared primitives ────────────────────────────────────────────────────────

export type ModerationStatus = 'active' | 'warned' | 'suspended' | 'banned'

export type ModerationAction = 'warn' | 'suspend' | 'ban' | 'reinstate'

export type NetworkHealthStatus = 'healthy' | 'moderate' | 'low'

// ── moderation-status ────────────────────────────────────────────────────────

/** GET /moderation-status?participant_id=<uuid> */
export interface ModerationStatusRequest {
  participant_id: string
}

export interface ModerationRecord {
  id: string
  participant_id: string
  action: ModerationAction
  reason: string | null
  actor_id: string
  created_at: string
}

export interface ModerationStatusResponse {
  ok: true
  data: {
    participant_id: string
    name: string
    craft_primary: string | null
    is_agent: boolean
    participant_type: string
    moderation_status: ModerationStatus
    is_suspended: boolean             // true when status is 'suspended' | 'banned'
    recent_actions: ModerationRecord[]
  }
}

// ── moderation-action ────────────────────────────────────────────────────────

/** POST /moderation-action — steward scope required */
export interface ModerationActionRequest {
  participant_id: string
  action: ModerationAction
  reason?: string
}

/** Valid transitions: warn/suspend/ban only from allowed prior states */
export const MODERATION_TRANSITIONS: Record<ModerationAction, ModerationStatus[]> = {
  warn:      ['active'],
  suspend:   ['active', 'warned'],
  ban:       ['active', 'warned', 'suspended'],
  reinstate: ['warned', 'suspended', 'banned'],
}

export interface ModerationActionResponse {
  ok: true
  data: {
    participant_id: string
    name: string
    action: ModerationAction
    previous_status: ModerationStatus
    new_status: ModerationStatus
    record: ModerationRecord
  }
}

// ── moderation-log ───────────────────────────────────────────────────────────

/** GET /moderation-log?participant_id=<uuid>&limit=<n> */
export interface ModerationLogRequest {
  participant_id?: string   // if omitted, returns all (steward only)
  limit?: number
}

export interface ModerationLogResponse {
  ok: true
  data: {
    record_count: number
    records: ModerationRecord[]
  }
}

// ── analytics-overview ───────────────────────────────────────────────────────

/** GET /analytics-overview — no query params */
export interface CooperativeAnalytics {
  total_participants: number
  active_members: number
  total_contributions: number
  verified_contributions: number
  [key: string]: unknown
}

export interface ParticipantAnalyticsSummary {
  participant_id: string
  name: string
  contribution_count: number
  verification_rate: number
  [key: string]: unknown
}

export interface AgentAnalyticsSummary {
  participant_id: string
  name: string
  erc8004_agent_id: string | null
  contribution_count: number
  [key: string]: unknown
}

export interface CoordinationAnalytics {
  total_sprints: number
  completed_sprints: number
  active_sprints: number
  [key: string]: unknown
}

export interface AnalyticsOverviewResponse {
  ok: true
  data: {
    cooperative: CooperativeAnalytics
    top_participants: ParticipantAnalyticsSummary[]
    agents: AgentAnalyticsSummary[]
    coordination: CoordinationAnalytics
    generated_at: string              // ISO-8601
  }
}

// ── network-health ───────────────────────────────────────────────────────────

/** GET /network-health */
export interface NetworkHealthMetrics {
  contributions_30d: number
  verification_rate_pct: number
  agent_count: number
  total_attestations: number
  chain_entries_30d: number
  moderation_events_30d: number
}

export interface NetworkHealthSnapshot {
  health_score: number
  status: NetworkHealthStatus
  snapshot_at: string
}

export interface NetworkHealthResponse {
  ok: true
  data: {
    health_score: number              // 0–100
    status: NetworkHealthStatus
    metrics: NetworkHealthMetrics
    history: NetworkHealthSnapshot[]
    snapshot_at: string               // ISO-8601
  }
}

// ── data-export ──────────────────────────────────────────────────────────────

/** POST /data-export — initiate GDPR export */
export interface DataExportInitiateRequest {
  // No body required — authenticated agent's own data
}

export interface GdprExportRequest {
  id: string
  participant_id: string
  requested_at: string
  status: 'pending' | 'processing' | 'complete' | 'failed'
  download_url: string | null
  expires_at: string | null
}

export interface DataExportInitiateResponse {
  ok: true
  data: {
    request: GdprExportRequest
    export: Record<string, unknown>   // payload varies by data class
  }
}

/** GET /data-export — list own export requests */
export interface DataExportListResponse {
  ok: true
  data: {
    requests: GdprExportRequest[]
  }
}

export type DataExportResponse = DataExportInitiateResponse | DataExportListResponse

// ── Error envelope ────────────────────────────────────────────────────────────

export interface ModerationApiError {
  ok: false
  error: {
    code:
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'INVALID_ACTION'
      | 'INVALID_TRANSITION'
      | 'METHOD_NOT_ALLOWED'
      | 'INTERNAL_ERROR'
    message: string
  }
}
