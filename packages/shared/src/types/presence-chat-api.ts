/**
 * Presence & Chat API Contract Types — P11
 * Covers: presence-heartbeat (GET/POST), chat-send, chat-messages,
 *         floor-state, floor-signal
 *
 * Sprint: aadee167 · Block 3 — API Contracts · 2026-03-01
 * Author: Nou (Orchestrator self-execution after 40-min timeout)
 */

// ── Shared primitives ────────────────────────────────────────────────────────

export type AgentStatus = 'active' | 'idle' | 'away' | 'executing'

export type FloorSignalType = 'request_floor' | 'yield_floor' | 'pass_floor' | 'building_on'

export type FloorPhase = 'gathering' | 'discussion' | 'convergence' | 'decision'

// ── presence-heartbeat ───────────────────────────────────────────────────────

/** POST /presence-heartbeat — agent posts current state */
export interface PresenceHeartbeatRequest {
  status: AgentStatus
  capacity: number              // 0-100
  context?: string              // optional current activity
  current_sprint?: string       // sprint ID if working on one
  capabilities?: string[]       // array of capability tags
}

export interface PresenceHeartbeatResponse {
  ok: true
  data: {
    participant_id: string
    status: AgentStatus
    capacity: number
    context: string | null
    current_sprint: string | null
    capabilities: string[]
    updated_at: string          // ISO-8601
  }
}

/** GET /presence-heartbeat — query who's present */
export interface PresenceQueryRequest {
  window_minutes?: number       // default 30
  agents_only?: boolean         // default true
}

export interface PresenceRecord {
  participant_id: string
  name: string
  is_agent: boolean
  status: AgentStatus
  capacity: number
  context: string | null
  current_sprint: string | null
  capabilities: string[]
  last_heartbeat: string
}

export interface PresenceQueryResponse {
  ok: true
  data: {
    window_minutes: number
    agent_count: number
    human_count: number
    presence: PresenceRecord[]
  }
}

// ── chat-send ────────────────────────────────────────────────────────────────

/** POST /chat-send — post message to workshop channel */
export interface ChatSendRequest {
  channel: string               // 'workshop' | 'coordination' | guild channel slug
  content: string               // message body
}

export interface ChatMessage {
  id: string
  channel_id: string
  sender_id: string
  sender_name: string
  is_agent: boolean
  content: string
  created_at: string
}

export interface ChatSendResponse {
  ok: true
  data: {
    message: ChatMessage
  }
}

// ── chat-messages ────────────────────────────────────────────────────────────

/** GET /chat-messages?channel=<slug>&limit=<n> */
export interface ChatMessagesRequest {
  channel: string
  limit?: number                // default 50
  before?: string               // message ID for pagination
}

export interface ChatMessagesResponse {
  ok: true
  data: {
    channel: string
    message_count: number
    messages: ChatMessage[]
  }
}

// ── floor-state ──────────────────────────────────────────────────────────────

/** GET /floor-state?channel=<slug> */
export interface FloorStateRequest {
  channel?: string              // defaults to 'workshop'
}

export interface FloorState {
  channel_id: string
  channel_name: string
  phase: FloorPhase
  holder_id: string | null
  holder_name: string | null
  held_since: string | null
  queue: Array<{
    participant_id: string
    participant_name: string
    requested_at: string
  }>
}

export interface FloorStateResponse {
  ok: true
  data: FloorState
}

// ── floor-signal ─────────────────────────────────────────────────────────────

/** POST /floor-signal — signal floor action */
export interface FloorSignalRequest {
  channel?: string              // defaults to 'workshop'
  signal: FloorSignalType
  context?: string              // optional: who you're building on, etc.
}

export interface FloorSignalResponse {
  ok: true
  data: {
    channel_id: string
    participant_id: string
    signal: FloorSignalType
    context: string | null
    floor_state: FloorState
    created_at: string
  }
}

// ── Error envelope ───────────────────────────────────────────────────────────

export interface PresenceChatApiError {
  ok: false
  error: {
    code:
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'MISSING_FIELD'
      | 'INVALID_CHANNEL'
      | 'METHOD_NOT_ALLOWED'
      | 'INTERNAL_ERROR'
    message: string
  }
}
