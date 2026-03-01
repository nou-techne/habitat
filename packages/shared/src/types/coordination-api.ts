/**
 * Coordination API HTTP Contract Types
 *
 * TypeScript interfaces for the Workshop coordination API HTTP layer.
 * These types define request bodies, response envelopes, and query parameters
 * for the 7 core coordination endpoints.
 *
 * Sprint: P09 — Coordination API Contract Types
 * Roadmap: Patronage-Ventures v2.1 | Block 3 (API Contracts)
 * Date: 2026-03-01
 *
 * Imports core proposal types from coordination.ts; no import cycles.
 */

import type {
  CoordinationProposalCreate,
  CoordinationProposalAction,
} from './coordination.js'

// Re-export for convenience (consumers can import from here)
export type { CoordinationProposalCreate, CoordinationProposalAction }

// =============================================================================
// Base Response Envelope
// =============================================================================

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// Supporting Types
// =============================================================================

export interface CoordinationRequest {
  id: string;
  channel_id: string;
  proposer_id: string;
  title: string;
  description: string;
  sprint_id: string | null;
  layers: string[];
  proposed_roles: Record<string, unknown> | string[];
  status: 'proposed' | 'in_progress' | 'testing' | 'completed' | 'paused' | 'cancelled';
  accepted_by: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  result_summary: string | null;
  created_at: string;
  updated_at: string;
  roadmap_id: string | null;
  roadmap_phase: string | null;
  context_refs: Array<{
    id: string;
    type: string;
  }>;
  capability_requirements: string[];
  claimed_by: string | null;
  claimed_at: string | null;
  negotiation_log: unknown[];
  progress_log: Array<{
    message: string;
    percent_complete?: number;
    timestamp: string;
  }>;
  completion_proof: string | null;
  paused_at: string | null;
  paused_by: string | null;
  injected_context: unknown[];
}

export interface AgentPresence {
  agent_id: string;
  status: 'active' | 'idle' | 'away';
  capacity: number;
  capabilities: string[];
  context: string;
  current_sprint: string | null;
  last_seen: string;
}

// =============================================================================
// 1. POST /coordination-request (create proposal)
// =============================================================================

export type CoordinationRequestCreateRequest = CoordinationProposalCreate;

export interface CoordinationRequestCreateResponse extends ApiResponse<{
  request: CoordinationRequest;
  capability_match?: {
    matched: boolean;
    matching_agents: unknown[];
    unmatched_requirements: string[];
  };
}> {}

// =============================================================================
// 2. POST /coordination-request (action on existing proposal)
// =============================================================================

export type CoordinationRequestActionRequest = CoordinationProposalAction;

export interface CoordinationRequestActionResponse extends ApiResponse<{
  request: CoordinationRequest;
}> {}

// =============================================================================
// 3. GET /coordination-list
// =============================================================================

export interface CoordinationListQuery {
  status?: 'proposed' | 'in_progress' | 'testing' | 'completed' | 'paused' | 'cancelled';
  requested_by?: string;
  claimed_by?: string;
  limit?: number;
  order?: 'asc' | 'desc';
}

export interface CoordinationListApiResponse extends ApiResponse<{
  requests: CoordinationRequest[];
  total?: number;
}> {}

// =============================================================================
// 4. GET /coordination-status
// =============================================================================

export interface CoordinationStatusApiResponse extends ApiResponse<{
  current_sprint?: {
    title: string;
    status: string;
    coordination_request_id: string;
    proposed_at: string;
    accepted_at: string | null;
  };
  recent_activity: Array<{
    id: string;
    content: string;
    created_at: string;
    is_agent: boolean;
    sender: {
      id: string;
      name: string;
      craft_primary: string;
      is_agent: boolean;
    };
  }>;
  who_is_present: AgentPresence[];
  floor_state: {
    mode: string;
    phase: string;
    current_speaker: string | null;
    queue: unknown[];
  };
}> {}

// =============================================================================
// 5. POST /presence-heartbeat
// =============================================================================

export interface PresenceHeartbeatRequest {
  status: 'active' | 'idle' | 'away';
  capacity: number;
  capabilities?: string[];
  context?: string;
  current_sprint?: string;
}

export interface PresenceHeartbeatApiResponse extends ApiResponse<AgentPresence> {}

// =============================================================================
// 6. GET /presence-heartbeat (who_is_present)
// =============================================================================

export interface WhoIsPresentApiResponse extends ApiResponse<AgentPresence[]> {}

// =============================================================================
// 7. POST /chat-send
// =============================================================================

export interface ChatSendRequest {
  channel: string;
  content: string;
  reply_to?: string;
}

export interface ChatSendApiResponse extends ApiResponse<{
  message_id: string;
  created_at: string;
}> {}
