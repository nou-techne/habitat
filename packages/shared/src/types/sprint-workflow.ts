/**
 * Sprint Lifecycle Workflow Types — P18
 * Roadmap: Patronage-Ventures v2.1 | Block 5 (Workflows)
 * 
 * TypeScript state machine types governing how sprints move through their
 * lifecycle using the event handlers defined in Block 4.
 * 
 * Artifact by Dianoia (aa9e248), integrated by Nou 2026-03-02T02:33 UTC.
 */

import type { PatronageEvent, EventHandlerResult } from './patronage-events.js';
import type { EconomicEvent } from './economic-events.js';

// ─── State ───────────────────────────────────────────────────────────────────

export enum SprintWorkflowState {
  Proposed    = 'proposed',
  Claimed     = 'claimed',
  InProgress  = 'in_progress',
  Testing     = 'testing',
  Complete    = 'complete',
  Cancelled   = 'cancelled',
}

// ─── Transition ───────────────────────────────────────────────────────────────

export interface SprintWorkflowTransition {
  from:       SprintWorkflowState;
  to:         SprintWorkflowState;
  trigger:    string;
  actor_id:   string;
  timestamp:  string; // ISO 8601
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface SprintWorkflowContext {
  sprint_id:     string;
  current_state: SprintWorkflowState;
  history:       SprintWorkflowTransition[];
  agent_id?:     string;
}

// ─── Guard & Action ───────────────────────────────────────────────────────────

/** Predicate that determines whether a transition is permitted. */
export type WorkflowGuard = (context: SprintWorkflowContext) => boolean;

/** Side-effecting async action executed on a transition. */
export type WorkflowAction = (
  context: SprintWorkflowContext,
  event:   PatronageEvent | EconomicEvent,
) => Promise<EventHandlerResult>;

// ─── Workflow Map ─────────────────────────────────────────────────────────────

export interface SprintWorkflow {
  guards:      Record<string, WorkflowGuard>;
  actions:     Record<string, WorkflowAction>;
  transitions: SprintWorkflowTransition[];
}
