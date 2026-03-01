/**
 * Economic API HTTP Contract Types
 *
 * TypeScript interfaces for the economic/earning coordination API endpoints.
 * These types define request bodies, response envelopes, and query parameters
 * for contribution submission, verification (attestation), and CLOUD earning.
 *
 * Sprint: P10 — Economic API Contract Types
 * Roadmap: Patronage-Ventures v2.1 | Block 3 (API Contracts)
 * Date: 2026-03-01
 */

import { ApiResponse } from './coordination-api.js';

// =============================================================================
// 1. POST /contributions-submit
// =============================================================================

export interface ContributionSubmitRequest {
  title: string;
  description: string;
  contribution_type: 'labor' | 'revenue' | 'capital' | 'community';
  dimensions?: string[];
  evidence_url?: string;
  estimated_hours?: number;
  estimated_value?: number;
  project_id?: string;
  related_venture_id?: string;
}

export interface ContributionSubmitResponse extends ApiResponse<{
  contribution: ContributionRecord;
}> {}

// =============================================================================
// 2. GET /contributions-list
// =============================================================================

export interface ContributionListQuery {
  contributor_id?: string;
  contribution_type?: 'labor' | 'revenue' | 'capital' | 'community';
  project_id?: string;
  status?: 'pending' | 'verified' | 'rejected' | 'archived';
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

export interface ContributionListResponse extends ApiResponse<{
  contributions: ContributionRecord[];
  total?: number;
}> {}

// =============================================================================
// 3. POST /contribution-verify (create attestation)
// =============================================================================

export interface ContributionVerifyRequest {
  contribution_id: string;
  attestation_type: 'approve' | 'reject' | 'request_changes';
  verifier_notes?: string;
  verified_hours?: number;
  verified_value?: number;
}

export interface ContributionVerifyResponse extends ApiResponse<{
  attestation: AttestationRecord;
  contribution: ContributionRecord;
}> {}

// =============================================================================
// 4. GET /contribution-verify (list attestations)
// =============================================================================

export interface ContributionVerifyQuery {
  contribution_id?: string;
  verifier_id?: string;
  attestation_type?: 'approve' | 'reject' | 'request_changes';
  limit?: number;
  offset?: number;
}

export interface ContributionVerifyListResponse extends ApiResponse<{
  attestations: AttestationRecord[];
  total?: number;
}> {}

// =============================================================================
// 5. POST /cloud-earning (record earning)
// =============================================================================

export interface CloudEarningRequest {
  participant_id: string;
  amount: number;
  earning_rule: string;
  trigger_event: string;
  trigger_event_id?: string;
  period_id?: string;
  metadata?: Record<string, any>;
}

export interface CloudEarningResponse extends ApiResponse<{
  earning: EarningRecord;
}> {}

// =============================================================================
// 6. GET /cloud-earning (earning history)
// =============================================================================

export interface CloudEarningQuery {
  participant_id?: string;
  earning_rule?: string;
  period_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
  order?: 'asc' | 'desc';
}

export interface CloudEarningListResponse extends ApiResponse<{
  earnings: EarningRecord[];
  total?: number;
  total_amount?: number;
}> {}

// =============================================================================
// Supporting Types
// =============================================================================

export interface ContributionRecord {
  id: string;
  contributor_id: string;
  title: string;
  description: string;
  contribution_type: 'labor' | 'revenue' | 'capital' | 'community';
  dimensions: string[];
  evidence_url: string | null;
  estimated_hours: number | null;
  estimated_value: number | null;
  verified_hours: number | null;
  verified_value: number | null;
  project_id: string | null;
  related_venture_id: string | null;
  status: 'pending' | 'verified' | 'rejected' | 'archived';
  created_at: string;
  updated_at: string;
  verified_at: string | null;
}

export interface AttestationRecord {
  id: string;
  contribution_id: string;
  verifier_id: string;
  attestation_type: 'approve' | 'reject' | 'request_changes';
  verifier_notes: string | null;
  verified_hours: number | null;
  verified_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface EarningRecord {
  id: string;
  participant_id: string;
  amount: number;
  earning_rule: string;
  trigger_event: string;
  trigger_event_id: string | null;
  period_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  applied_at: string | null;
}
