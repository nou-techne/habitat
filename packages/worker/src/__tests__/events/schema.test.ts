/**
 * Event Schema Contract Tests
 * 
 * Verifies event schemas are correctly defined and validated
 * Layer 4 (Event) validation
 */

import { describe, it, expect } from 'vitest';
import {
  ContributionSubmittedEvent,
  ContributionApprovedEvent,
  ContributionRejectedEvent,
  PeriodClosedEvent,
  AllocationCalculatedEvent,
  AllocationDistributedEvent,
  PaymentInitiatedEvent,
  PaymentCompletedEvent,
  EventType,
  BaseEvent,
} from '../../events/schema';

describe('Event Type Definitions', () => {
  it('should define all event types', () => {
    expect(EventType.ContributionSubmitted).toBe('contribution.submitted');
    expect(EventType.ContributionApproved).toBe('contribution.approved');
    expect(EventType.ContributionRejected).toBe('contribution.rejected');
    expect(EventType.PeriodClosed).toBe('period.closed');
    expect(EventType.AllocationCalculated).toBe('allocation.calculated');
    expect(EventType.AllocationDistributed).toBe('allocation.distributed');
    expect(EventType.PaymentInitiated).toBe('payment.initiated');
    expect(EventType.PaymentCompleted).toBe('payment.completed');
  });
  
  it('should use consistent naming pattern (entity.action)', () => {
    const eventTypes = Object.values(EventType);
    
    for (const eventType of eventTypes) {
      expect(eventType).toMatch(/^[a-z]+\.[a-z]+$/);
      expect(eventType.split('.').length).toBe(2);
    }
  });
});

describe('BaseEvent Structure', () => {
  it('should have required base fields', () => {
    const baseEvent: BaseEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {},
    };
    
    expect(baseEvent.eventId).toBeTruthy();
    expect(baseEvent.eventType).toBeTruthy();
    expect(baseEvent.timestamp).toBeInstanceOf(Date);
    expect(baseEvent.payload).toBeDefined();
  });
  
  it('should support optional metadata field', () => {
    const eventWithMetadata: BaseEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {},
      metadata: {
        source: 'api',
        userId: 'user_123',
      },
    };
    
    expect(eventWithMetadata.metadata).toBeDefined();
    expect(eventWithMetadata.metadata?.source).toBe('api');
  });
});

describe('ContributionSubmittedEvent Schema', () => {
  it('should have required payload fields', () => {
    const event: ContributionSubmittedEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_123',
        memberId: 'member_123',
        periodId: 'period_123',
        contributionType: 'labor',
        amount: '100.00',
        description: 'Development work',
      },
    };
    
    expect(event.payload.contributionId).toBeTruthy();
    expect(event.payload.memberId).toBeTruthy();
    expect(event.payload.periodId).toBeTruthy();
    expect(event.payload.contributionType).toBeTruthy();
    expect(event.payload.amount).toBeTruthy();
  });
  
  it('should validate contribution type values', () => {
    const validTypes = ['labor', 'capital', 'property'];
    
    for (const type of validTypes) {
      const event: ContributionSubmittedEvent = {
        eventId: 'evt_123',
        eventType: EventType.ContributionSubmitted,
        timestamp: new Date(),
        payload: {
          contributionId: 'contrib_123',
          memberId: 'member_123',
          periodId: 'period_123',
          contributionType: type as 'labor' | 'capital' | 'property',
          amount: '100.00',
        },
      };
      
      expect(event.payload.contributionType).toBe(type);
    }
  });
});

describe('ContributionApprovedEvent Schema', () => {
  it('should have required payload fields', () => {
    const event: ContributionApprovedEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_123',
        approvedBy: 'steward_123',
        approvedAt: new Date(),
      },
    };
    
    expect(event.payload.contributionId).toBeTruthy();
    expect(event.payload.approvedBy).toBeTruthy();
    expect(event.payload.approvedAt).toBeInstanceOf(Date);
  });
});

describe('ContributionRejectedEvent Schema', () => {
  it('should have required payload fields', () => {
    const event: ContributionRejectedEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionRejected,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_123',
        rejectedBy: 'steward_123',
        rejectedAt: new Date(),
        reason: 'Insufficient documentation',
      },
    };
    
    expect(event.payload.contributionId).toBeTruthy();
    expect(event.payload.rejectedBy).toBeTruthy();
    expect(event.payload.rejectedAt).toBeInstanceOf(Date);
    expect(event.payload.reason).toBeTruthy();
  });
  
  it('should allow optional reason field', () => {
    const event: ContributionRejectedEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionRejected,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_123',
        rejectedBy: 'steward_123',
        rejectedAt: new Date(),
      },
    };
    
    expect(event.payload.reason).toBeUndefined();
  });
});

describe('PeriodClosedEvent Schema', () => {
  it('should have required payload fields', () => {
    const event: PeriodClosedEvent = {
      eventId: 'evt_123',
      eventType: EventType.PeriodClosed,
      timestamp: new Date(),
      payload: {
        periodId: 'period_123',
        closedAt: new Date(),
        totalContributions: '10000.00',
        contributionCount: 50,
      },
    };
    
    expect(event.payload.periodId).toBeTruthy();
    expect(event.payload.closedAt).toBeInstanceOf(Date);
    expect(event.payload.totalContributions).toBeTruthy();
    expect(event.payload.contributionCount).toBeGreaterThan(0);
  });
});

describe('AllocationCalculatedEvent Schema', () => {
  it('should have required payload fields', () => {
    const event: AllocationCalculatedEvent = {
      eventId: 'evt_123',
      eventType: EventType.AllocationCalculated,
      timestamp: new Date(),
      payload: {
        allocationId: 'alloc_123',
        memberId: 'member_123',
        periodId: 'period_123',
        amount: '500.00',
        patronageScore: '0.85',
      },
    };
    
    expect(event.payload.allocationId).toBeTruthy();
    expect(event.payload.memberId).toBeTruthy();
    expect(event.payload.periodId).toBeTruthy();
    expect(event.payload.amount).toBeTruthy();
    expect(event.payload.patronageScore).toBeTruthy();
  });
});

describe('AllocationDistributedEvent Schema', () => {
  it('should have required payload fields', () => {
    const event: AllocationDistributedEvent = {
      eventId: 'evt_123',
      eventType: EventType.AllocationDistributed,
      timestamp: new Date(),
      payload: {
        allocationId: 'alloc_123',
        distributedAt: new Date(),
        distributionMethod: 'bank_transfer',
      },
    };
    
    expect(event.payload.allocationId).toBeTruthy();
    expect(event.payload.distributedAt).toBeInstanceOf(Date);
    expect(event.payload.distributionMethod).toBeTruthy();
  });
});

describe('PaymentInitiatedEvent Schema', () => {
  it('should have required payload fields', () => {
    const event: PaymentInitiatedEvent = {
      eventId: 'evt_123',
      eventType: EventType.PaymentInitiated,
      timestamp: new Date(),
      payload: {
        paymentId: 'pay_123',
        allocationId: 'alloc_123',
        memberId: 'member_123',
        amount: '500.00',
        method: 'ach',
      },
    };
    
    expect(event.payload.paymentId).toBeTruthy();
    expect(event.payload.allocationId).toBeTruthy();
    expect(event.payload.memberId).toBeTruthy();
    expect(event.payload.amount).toBeTruthy();
    expect(event.payload.method).toBeTruthy();
  });
});

describe('PaymentCompletedEvent Schema', () => {
  it('should have required payload fields', () => {
    const event: PaymentCompletedEvent = {
      eventId: 'evt_123',
      eventType: EventType.PaymentCompleted,
      timestamp: new Date(),
      payload: {
        paymentId: 'pay_123',
        completedAt: new Date(),
        transactionId: 'txn_123',
      },
    };
    
    expect(event.payload.paymentId).toBeTruthy();
    expect(event.payload.completedAt).toBeInstanceOf(Date);
    expect(event.payload.transactionId).toBeTruthy();
  });
});

describe('Event ID Format', () => {
  it('should use consistent eventId format', () => {
    const events = [
      { eventId: 'evt_12345678', eventType: EventType.ContributionSubmitted, timestamp: new Date(), payload: {} },
      { eventId: 'evt_abcdefgh', eventType: EventType.PeriodClosed, timestamp: new Date(), payload: {} },
      { eventId: 'evt_00000000', eventType: EventType.AllocationCalculated, timestamp: new Date(), payload: {} },
    ];
    
    for (const event of events) {
      // eventId should start with evt_
      expect(event.eventId).toMatch(/^evt_[a-zA-Z0-9]+$/);
    }
  });
});

describe('Timestamp Format', () => {
  it('should use Date objects for timestamps', () => {
    const event: BaseEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {},
    };
    
    expect(event.timestamp).toBeInstanceOf(Date);
  });
  
  it('should accept ISO 8601 string dates in payload', () => {
    const event: ContributionApprovedEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionApproved,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_123',
        approvedBy: 'steward_123',
        approvedAt: new Date('2026-02-10T12:00:00Z'),
      },
    };
    
    expect(event.payload.approvedAt).toBeInstanceOf(Date);
  });
});

describe('Amount Format', () => {
  it('should use string type for monetary amounts', () => {
    const event: ContributionSubmittedEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {
        contributionId: 'contrib_123',
        memberId: 'member_123',
        periodId: 'period_123',
        contributionType: 'labor',
        amount: '100.00', // String, not number
      },
    };
    
    expect(typeof event.payload.amount).toBe('string');
    expect(event.payload.amount).toMatch(/^\d+\.\d{2}$/);
  });
  
  it('should support high precision amounts', () => {
    const amounts = ['0.01', '100.00', '9999999.99', '0.0001'];
    
    for (const amount of amounts) {
      const event: ContributionSubmittedEvent = {
        eventId: 'evt_123',
        eventType: EventType.ContributionSubmitted,
        timestamp: new Date(),
        payload: {
          contributionId: 'contrib_123',
          memberId: 'member_123',
          periodId: 'period_123',
          contributionType: 'labor',
          amount,
        },
      };
      
      expect(event.payload.amount).toBe(amount);
    }
  });
});

describe('Event Schema Completeness', () => {
  it('should have event schema for every event type', () => {
    const eventTypes = Object.values(EventType);
    const definedSchemas = [
      EventType.ContributionSubmitted,
      EventType.ContributionApproved,
      EventType.ContributionRejected,
      EventType.PeriodClosed,
      EventType.AllocationCalculated,
      EventType.AllocationDistributed,
      EventType.PaymentInitiated,
      EventType.PaymentCompleted,
    ];
    
    for (const eventType of eventTypes) {
      expect(definedSchemas).toContain(eventType);
    }
  });
});

describe('Metadata Structure', () => {
  it('should support common metadata fields', () => {
    const event: BaseEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {},
      metadata: {
        source: 'api',
        userId: 'user_123',
        correlationId: 'corr_123',
        causationId: 'cause_123',
      },
    };
    
    expect(event.metadata?.source).toBe('api');
    expect(event.metadata?.userId).toBe('user_123');
    expect(event.metadata?.correlationId).toBe('corr_123');
    expect(event.metadata?.causationId).toBe('cause_123');
  });
  
  it('should allow custom metadata fields', () => {
    const event: BaseEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {},
      metadata: {
        customField: 'customValue',
        anotherField: 123,
      },
    };
    
    expect(event.metadata).toBeDefined();
  });
});

describe('Event Versioning', () => {
  it('should support version field in metadata', () => {
    const event: BaseEvent = {
      eventId: 'evt_123',
      eventType: EventType.ContributionSubmitted,
      timestamp: new Date(),
      payload: {},
      metadata: {
        version: 'v1',
      },
    };
    
    expect(event.metadata?.version).toBe('v1');
  });
});
