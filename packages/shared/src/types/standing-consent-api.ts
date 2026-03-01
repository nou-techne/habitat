/**
 * Standing & Consent API Contract Types — P12
 * Covers: standing-status, consent-grant, consent-revoke,
 *         consent-check, consent-list, standing-check
 *
 * Sprint: b1e4d0b0 · Block 3 — API Contracts · 2026-03-01
 * Author: Nou (Orchestrator self-execution, parallel to P11)
 */

// ── Shared primitives ────────────────────────────────────────────────────────

export type ConsentScope =
  | 'read_presence'
  | 'read_standing'
  | 'post_messages'
  | 'submit_contributions'
  | 'moderate'

export type StandingTier = 'guest' | 'enrolled' | 'contributor' | 'steward' | 'principal'

export type RequiredTier = 'enrolled' | 'contributor' | 'steward' | 'principal'

// ── standing-status ──────────────────────────────────────────────────────────

/** GET /standing-status?participant_id=<uuid>  — single participant */
export interface StandingStatusRequest {
  participant_id?: string   // if omitted, returns list (agents only by default)
  agents_only?: boolean     // default true when listing
}

export interface ParticipantStanding {
  participant_id: string
  name: string
  craft_primary: string | null
  is_agent: boolean
  erc8004_agent_id: string | null
  participant_type: string
  standing_level: StandingTier
  contribution_count: number
  [key: string]: unknown    // spread from standing record
}

export interface StandingStatusResponse {
  ok: true
  data: ParticipantStanding | { standings: ParticipantStanding[] }
}

// ── consent-grant ────────────────────────────────────────────────────────────

/** POST /consent-grant */
export interface ConsentGrantRequest {
  grantee_id: string        // UUID of the agent receiving consent
  scope: ConsentScope
  expires_at?: string       // ISO-8601, optional
  notes?: string
}

export interface ConsentGrant {
  id: string
  grantor_id: string
  grantee_id: string
  scope: ConsentScope
  expires_at: string | null
  notes: string | null
  created_at: string
  revoked_at: string | null
}

export interface ConsentGrantResponse {
  ok: true
  data: { grant: ConsentGrant }
}

// ── consent-revoke ───────────────────────────────────────────────────────────

/** POST /consent-revoke — revoke by grant_id OR by (grantee_id + scope) */
export interface ConsentRevokeByIdRequest {
  grant_id: string
}

export interface ConsentRevokeByTargetRequest {
  grantee_id: string
  scope: ConsentScope
}

export type ConsentRevokeRequest =
  | ConsentRevokeByIdRequest
  | ConsentRevokeByTargetRequest

export interface ConsentRevokeResponse {
  ok: true
  data: { revoked_count: number }
}

// ── consent-check ────────────────────────────────────────────────────────────

/** GET /consent-check?grantee_id=<uuid>&scope=<scope> */
export interface ConsentCheckRequest {
  grantee_id: string
  scope: ConsentScope
}

export interface ConsentCheckResponse {
  ok: true
  data: {
    has_consent: boolean
    grant_count: number
    grants: ConsentGrant[]
  }
}

// ── consent-list ─────────────────────────────────────────────────────────────

/** GET /consent-list?role=grantor|grantee */
export type ConsentRole = 'grantor' | 'grantee'

export interface ConsentListRequest {
  role?: ConsentRole        // default 'grantor'
}

export interface ConsentListResponse {
  ok: true
  data: {
    participant_id: string
    role: ConsentRole
    grant_count: number
    grants: ConsentGrant[]
  }
}

// ── standing-check ───────────────────────────────────────────────────────────

/** GET /standing-check?feature_id=<id>  — single gate check */
export interface StandingGateCheckRequest {
  feature_id: string
}

export interface StandingGate {
  id: string
  feature_id: string
  category: string
  description: string
  required_tier: RequiredTier
  active: boolean
}

export interface StandingGateCheckResponse {
  ok: true
  data: {
    feature_id: string
    category: string
    description: string
    required_tier: RequiredTier
    caller_tier: StandingTier
    allowed: boolean
  }
}

/** GET /standing-check?category=<cat>  — list gates (optionally filtered) */
export interface StandingGateListRequest {
  category?: string
}

export interface StandingGateListResponse {
  ok: true
  data: {
    caller_id: string
    caller_tier: StandingTier
    gates: StandingGate[]
  }
}

// ── Union response types ──────────────────────────────────────────────────────

export type StandingCheckResponse =
  | StandingGateCheckResponse
  | StandingGateListResponse

// ── Error envelope (shared across all endpoints) ─────────────────────────────

export interface ApiErrorResponse {
  ok: false
  error: {
    code:
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'MISSING_FIELD'
      | 'INVALID_SCOPE'
      | 'METHOD_NOT_ALLOWED'
      | 'INTERNAL_ERROR'
    message: string
  }
}
