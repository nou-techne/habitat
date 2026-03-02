// P22 — Venture Patronage Reconciliation Workflow Types
// Block 5 (Workflows) — Final Sprint
// Specification: 6 types for venture revenue → patronage reconciliation flow
// Imports: patronage-events.ts, sprint-workflow.ts

import type {
  PatronageEventType,
  EventContext,
  EventHandlerInput,
  EventHandlerOutput,
} from './patronage-events.js';
import type {
  SprintWorkflowState,
  SprintWorkflowContext,
} from './sprint-workflow.js';

/**
 * Venture Patronage Reconciliation States
 * Tracks the lifecycle of venture revenue flowing back to cooperative capital accounts
 */
export enum VenturePatronageState {
  /** Revenue commitment registered, awaiting first revenue */
  Proposed = 'proposed',
  /** Venture actively generating revenue, reconciliation scheduled */
  Active = 'active',
  /** Revenue received, reconciliation in progress */
  Reconciling = 'reconciling',
  /** Patronage allocated to capital accounts, awaiting distribution */
  Allocated = 'allocated',
  /** Distribution executed, reconciliation complete */
  Distributed = 'distributed',
  /** Venture sunset or paused, reconciliation archived */
  Archived = 'archived',
}

/**
 * State transition definition for venture patronage flow
 */
export interface VenturePatronageTransition {
  /** Current state */
  from: VenturePatronageState;
  /** Target state */
  to: VenturePatronageState;
  /** Event type triggering transition */
  event: PatronageEventType | 'REVENUE_RECEIVED' | 'ALLOCATION_COMPUTED' | 'DISTRIBUTION_EXECUTED';
  /** Guard function key */
  guard?: string;
  /** Action function key */
  action?: string;
}

/**
 * Context for venture patronage reconciliation workflow
 * Links ventures, revenue periods, contributions, and capital accounts
 */
export interface VenturePatronageContext {
  /** Venture registry ID */
  ventureId: string;
  /** Venture name */
  ventureName: string;
  /** Patronage allocation period ID */
  periodId: string;
  /** Period start date (ISO 8601) */
  periodStart: string;
  /** Period end date (ISO 8601) */
  periodEnd: string;
  /** Total revenue received (USD cents) */
  totalRevenue: number;
  /** Reciprocity percentage (e.g., 1.0 = 1%) */
  reciprocityRate: number;
  /** Calculated reciprocity amount (USD cents) */
  reciprocityAmount: number;
  /** Contributions eligible for patronage allocation */
  eligibleContributions: Array<{
    contributionId: string;
    memberId: string;
    laborWeight: number;
    revenueWeight: number;
  }>;
  /** Allocation formula weights */
  allocationWeights: {
    labor: number;    // e.g., 0.40 = 40%
    revenue: number;  // e.g., 0.30 = 30%
    cash: number;     // e.g., 0.20 = 20%
    community: number; // e.g., 0.10 = 10%
  };
  /** Computed allocations per member */
  allocations?: Array<{
    memberId: string;
    amount: number; // USD cents
    capitalAccountId: string;
  }>;
  /** Sprint context if reconciliation is part of a sprint */
  sprint?: Pick<SprintWorkflowContext, 'sprintId' | 'sprintName'>;
  /** Event context for audit trail */
  event: EventContext;
}

/**
 * Guard functions for venture patronage workflow
 * Enforce preconditions before state transitions
 */
export interface ReconciliationGuard {
  /** Guard function name */
  name: string;
  /** Async evaluation of precondition */
  evaluate: (context: VenturePatronageContext) => Promise<boolean>;
  /** Human-readable reason if guard fails */
  failureReason?: string;
}

/**
 * Action functions for venture patronage workflow
 * Execute side effects during state transitions
 */
export interface ReconciliationAction {
  /** Action function name */
  name: string;
  /** Async execution of side effect */
  execute: (context: VenturePatronageContext) => Promise<VenturePatronageContext>;
  /** Rollback function if action fails */
  rollback?: (context: VenturePatronageContext) => Promise<void>;
}

/**
 * Complete venture patronage reconciliation workflow
 * Orchestrates revenue → capital account flow
 */
export interface VenturePatronageWorkflow {
  /** Workflow instance ID */
  workflowId: string;
  /** Current state */
  currentState: VenturePatronageState;
  /** Workflow context */
  context: VenturePatronageContext;
  /** State machine transitions */
  transitions: VenturePatronageTransition[];
  /** Guard functions registry */
  guards: Record<string, ReconciliationGuard>;
  /** Action functions registry */
  actions: Record<string, ReconciliationAction>;
  /** Transition history */
  history: Array<{
    from: VenturePatronageState;
    to: VenturePatronageState;
    timestamp: string;
    triggeredBy: string;
  }>;
  /** Execute a transition */
  transition: (event: string, input: EventHandlerInput) => Promise<EventHandlerOutput>;
  /** Get available transitions from current state */
  getAvailableTransitions: () => VenturePatronageTransition[];
  /** Check if transition is valid */
  canTransition: (to: VenturePatronageState) => Promise<boolean>;
}
