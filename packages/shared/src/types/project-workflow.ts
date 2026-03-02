/**
 * Project Lifecycle Workflow Types — P20
 * Roadmap: Patronage-Ventures v2.1 | Block 5 (Workflows)
 *
 * TypeScript state machine types governing how projects move through their
 * lifecycle, with optional linkage to venture and sprint coordination.
 * Mirrors the sprint-workflow.ts (P18) structural pattern.
 *
 * Artifact by Dianoia (ac4bc98), integrated by Nou 2026-03-02T08:56 UTC.
 */

import type { EventHandlerResult } from './patronage-events.js';
import type { EconomicEvent } from './economic-events.js';
import type { SprintWorkflowContext } from './sprint-workflow.js';

// ─── State ───────────────────────────────────────────────────────────────────

export enum ProjectWorkflowState {
  Ideation   = 'ideation',
  Active     = 'active',
  Paused     = 'paused',
  Completed  = 'completed',
  Archived   = 'archived',
  Cancelled  = 'cancelled',
}

// ─── Transition ───────────────────────────────────────────────────────────────

export interface ProjectWorkflowTransition {
  from:       ProjectWorkflowState;
  to:         ProjectWorkflowState;
  trigger:    string;
  actor_id:   string;
  timestamp:  string; // ISO 8601
}

// ─── Context ─────────────────────────────────────────────────────────────────

export interface ProjectWorkflowContext {
  project_id:       string;
  current_state:    ProjectWorkflowState;
  history:          ProjectWorkflowTransition[];
  venture_id?:      string;
  active_sprints?:  SprintWorkflowContext[];
  milestones?:      string[];
  contribution_ids?: string[];
}

// ─── Guard & Action ───────────────────────────────────────────────────────────

/** Predicate that determines whether a project transition is permitted. */
export type ProjectWorkflowGuard = (context: ProjectWorkflowContext) => boolean | Promise<boolean>;

/** Side-effecting async action executed on a project transition. */
export type ProjectWorkflowAction = (
  context: ProjectWorkflowContext,
  event?:  EconomicEvent,
) => Promise<EventHandlerResult | void>;

// ─── Workflow Map ─────────────────────────────────────────────────────────────

export interface ProjectWorkflow {
  guards:      Record<string, ProjectWorkflowGuard>;
  actions:     Record<string, ProjectWorkflowAction>;
  transitions: ProjectWorkflowTransition[];
}
