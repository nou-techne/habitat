/**
 * GraphQL Schema Contract Tests
 * 
 * Verifies GraphQL schema matches specifications and type definitions
 * Layer 3 (Relationship) validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { buildSchema, printSchema } from 'graphql';
import { schema } from '../../graphql/schema';

describe('GraphQL Schema Structure', () => {
  let schemaString: string;
  
  beforeAll(() => {
    schemaString = printSchema(schema);
  });
  
  it('should have Query type', () => {
    expect(schemaString).toContain('type Query');
  });
  
  it('should have Mutation type', () => {
    expect(schemaString).toContain('type Mutation');
  });
  
  describe('Query type fields', () => {
    it('should have member queries', () => {
      expect(schemaString).toContain('me: Member');
      expect(schemaString).toContain('member(id: ID!): Member');
      expect(schemaString).toContain('members(');
    });
    
    it('should have contribution queries', () => {
      expect(schemaString).toContain('contribution(id: ID!): Contribution');
      expect(schemaString).toContain('contributions(');
      expect(schemaString).toContain('memberContributions(memberId: ID!');
      expect(schemaString).toContain('pendingContributions');
    });
    
    it('should have allocation queries', () => {
      expect(schemaString).toContain('allocation(id: ID!): Allocation');
      expect(schemaString).toContain('allocations(');
      expect(schemaString).toContain('memberAllocations(memberId: ID!');
      expect(schemaString).toContain('periodAllocations(periodId: ID!');
    });
    
    it('should have period queries', () => {
      expect(schemaString).toContain('period(id: ID!): AllocationPeriod');
      expect(schemaString).toContain('periods(');
      expect(schemaString).toContain('currentPeriod: AllocationPeriod');
    });
    
    it('should have capital account queries', () => {
      expect(schemaString).toContain('capitalAccount(memberId: ID!): CapitalAccount');
      expect(schemaString).toContain('capitalAccountHistory(memberId: ID!');
    });
    
    it('should have agreement queries', () => {
      expect(schemaString).toContain('agreement(id: ID!): Agreement');
      expect(schemaString).toContain('agreements(');
      expect(schemaString).toContain('memberAgreements(memberId: ID!');
    });
  });
  
  describe('Mutation type fields', () => {
    it('should have authentication mutations', () => {
      expect(schemaString).toContain('login(email: String!, password: String!): AuthPayload');
      expect(schemaString).toContain('register(');
      expect(schemaString).toContain('logout: Boolean');
    });
    
    it('should have contribution mutations', () => {
      expect(schemaString).toContain('createContribution(');
      expect(schemaString).toContain('updateContribution(');
      expect(schemaString).toContain('approveContribution(id: ID!');
      expect(schemaString).toContain('rejectContribution(id: ID!');
    });
    
    it('should have period mutations', () => {
      expect(schemaString).toContain('createPeriod(');
      expect(schemaString).toContain('closePeriod(id: ID!');
      expect(schemaString).toContain('archivePeriod(id: ID!');
    });
    
    it('should have allocation mutations', () => {
      expect(schemaString).toContain('calculateAllocations(periodId: ID!');
      expect(schemaString).toContain('distributeAllocations(periodId: ID!');
    });
    
    it('should have agreement mutations', () => {
      expect(schemaString).toContain('createAgreement(');
      expect(schemaString).toContain('signAgreement(id: ID!');
    });
  });
  
  describe('Object Types', () => {
    it('should define Member type', () => {
      expect(schemaString).toContain('type Member');
      expect(schemaString).toMatch(/type Member.*\{[\s\S]*?id: ID![\s\S]*?email: String![\s\S]*?role: MemberRole![\s\S]*?\}/);
    });
    
    it('should define Contribution type', () => {
      expect(schemaString).toContain('type Contribution');
      expect(schemaString).toMatch(/type Contribution.*\{[\s\S]*?id: ID![\s\S]*?memberId: ID![\s\S]*?amount: String![\s\S]*?\}/);
    });
    
    it('should define Allocation type', () => {
      expect(schemaString).toContain('type Allocation');
      expect(schemaString).toMatch(/type Allocation.*\{[\s\S]*?id: ID![\s\S]*?memberId: ID![\s\S]*?amount: String![\s\S]*?\}/);
    });
    
    it('should define AllocationPeriod type', () => {
      expect(schemaString).toContain('type AllocationPeriod');
      expect(schemaString).toMatch(/type AllocationPeriod.*\{[\s\S]*?id: ID![\s\S]*?name: String![\s\S]*?status: PeriodStatus![\s\S]*?\}/);
    });
    
    it('should define CapitalAccount type', () => {
      expect(schemaString).toContain('type CapitalAccount');
      expect(schemaString).toMatch(/type CapitalAccount.*\{[\s\S]*?id: ID![\s\S]*?memberId: ID![\s\S]*?balance: String![\s\S]*?\}/);
    });
    
    it('should define Agreement type', () => {
      expect(schemaString).toContain('type Agreement');
      expect(schemaString).toMatch(/type Agreement.*\{[\s\S]*?id: ID![\s\S]*?title: String![\s\S]*?status: AgreementStatus![\s\S]*?\}/);
    });
  });
  
  describe('Enum Types', () => {
    it('should define MemberRole enum', () => {
      expect(schemaString).toContain('enum MemberRole');
      expect(schemaString).toMatch(/enum MemberRole[\s\S]*?MEMBER[\s\S]*?STEWARD[\s\S]*?ADMIN/);
    });
    
    it('should define ContributionType enum', () => {
      expect(schemaString).toContain('enum ContributionType');
      expect(schemaString).toMatch(/enum ContributionType[\s\S]*?LABOR[\s\S]*?CAPITAL[\s\S]*?PROPERTY/);
    });
    
    it('should define ContributionStatus enum', () => {
      expect(schemaString).toContain('enum ContributionStatus');
      expect(schemaString).toMatch(/enum ContributionStatus[\s\S]*?PENDING[\s\S]*?APPROVED[\s\S]*?REJECTED/);
    });
    
    it('should define PeriodStatus enum', () => {
      expect(schemaString).toContain('enum PeriodStatus');
      expect(schemaString).toMatch(/enum PeriodStatus[\s\S]*?OPEN[\s\S]*?CLOSED[\s\S]*?ARCHIVED/);
    });
    
    it('should define AllocationStatus enum', () => {
      expect(schemaString).toContain('enum AllocationStatus');
      expect(schemaString).toMatch(/enum AllocationStatus[\s\S]*?PENDING[\s\S]*?CALCULATED[\s\S]*?DISTRIBUTED/);
    });
  });
  
  describe('Input Types', () => {
    it('should define CreateContributionInput', () => {
      expect(schemaString).toContain('input CreateContributionInput');
      expect(schemaString).toMatch(/input CreateContributionInput[\s\S]*?periodId: ID![\s\S]*?contributionType: ContributionType![\s\S]*?amount: String!/);
    });
    
    it('should define UpdateContributionInput', () => {
      expect(schemaString).toContain('input UpdateContributionInput');
    });
    
    it('should define CreatePeriodInput', () => {
      expect(schemaString).toContain('input CreatePeriodInput');
      expect(schemaString).toMatch(/input CreatePeriodInput[\s\S]*?name: String![\s\S]*?startDate: String![\s\S]*?endDate: String!/);
    });
    
    it('should define PaginationInput', () => {
      expect(schemaString).toContain('input PaginationInput');
      expect(schemaString).toMatch(/input PaginationInput[\s\S]*?limit: Int[\s\S]*?offset: Int/);
    });
  });
  
  describe('Pagination Types', () => {
    it('should define PageInfo type', () => {
      expect(schemaString).toContain('type PageInfo');
      expect(schemaString).toMatch(/type PageInfo[\s\S]*?hasNextPage: Boolean![\s\S]*?hasPreviousPage: Boolean![\s\S]*?total: Int!/);
    });
    
    it('should define paginated result types', () => {
      expect(schemaString).toContain('type MemberConnection');
      expect(schemaString).toContain('type ContributionConnection');
      expect(schemaString).toContain('type AllocationConnection');
      expect(schemaString).toContain('type PeriodConnection');
    });
  });
  
  describe('Directive Usage', () => {
    it('should use @auth directive for protected fields', () => {
      // Auth directive should be applied to mutations and sensitive queries
      expect(schemaString).toMatch(/@auth|@requireAuth/);
    });
    
    it('should use @requireRole directive for role-based fields', () => {
      expect(schemaString).toMatch(/@requireRole|@hasRole/);
    });
  });
  
  describe('Field Arguments', () => {
    it('should have pagination arguments on list queries', () => {
      expect(schemaString).toMatch(/members\([^)]*limit:[^)]*\)/);
      expect(schemaString).toMatch(/contributions\([^)]*limit:[^)]*\)/);
      expect(schemaString).toMatch(/allocations\([^)]*limit:[^)]*\)/);
    });
    
    it('should have filter arguments on list queries', () => {
      expect(schemaString).toMatch(/contributions\([^)]*status:[^)]*\)/);
      expect(schemaString).toMatch(/periods\([^)]*status:[^)]*\)/);
    });
  });
  
  describe('Timestamp Formatting', () => {
    it('should use String type for timestamps (ISO 8601)', () => {
      // All timestamp fields should be String (for ISO 8601 formatting)
      expect(schemaString).toMatch(/createdAt: String!/);
      expect(schemaString).toMatch(/updatedAt: String!/);
      expect(schemaString).toMatch(/approvedAt: String/);
    });
  });
  
  describe('ID Type Usage', () => {
    it('should use ID type for identifiers', () => {
      expect(schemaString).toMatch(/id: ID!/);
      expect(schemaString).toMatch(/memberId: ID!/);
      expect(schemaString).toMatch(/periodId: ID!/);
    });
  });
  
  describe('Non-Null Modifiers', () => {
    it('should mark required fields as non-null', () => {
      expect(schemaString).toMatch(/email: String!/);
      expect(schemaString).toMatch(/name: String!/);
      expect(schemaString).toMatch(/amount: String!/);
      expect(schemaString).toMatch(/status: \w+Status!/);
    });
    
    it('should allow null for optional fields', () => {
      expect(schemaString).toMatch(/description: String[^!]/);
      expect(schemaString).toMatch(/approvedBy: ID[^!]/);
      expect(schemaString).toMatch(/closedAt: String[^!]/);
    });
  });
  
  describe('Schema Completeness', () => {
    it('should define all queries from specification', () => {
      const expectedQueries = [
        'me', 'member', 'members',
        'contribution', 'contributions', 'memberContributions', 'pendingContributions',
        'allocation', 'allocations', 'memberAllocations', 'periodAllocations',
        'period', 'periods', 'currentPeriod',
        'capitalAccount', 'capitalAccountHistory',
        'agreement', 'agreements', 'memberAgreements',
      ];
      
      for (const query of expectedQueries) {
        expect(schemaString).toContain(query);
      }
    });
    
    it('should define all mutations from specification', () => {
      const expectedMutations = [
        'login', 'register', 'logout',
        'createContribution', 'updateContribution', 'approveContribution', 'rejectContribution',
        'createPeriod', 'closePeriod', 'archivePeriod',
        'calculateAllocations', 'distributeAllocations',
        'createAgreement', 'signAgreement',
      ];
      
      for (const mutation of expectedMutations) {
        expect(schemaString).toContain(mutation);
      }
    });
  });
});

describe('GraphQL Schema Validation', () => {
  it('should be a valid GraphQL schema', () => {
    expect(() => {
      buildSchema(printSchema(schema));
    }).not.toThrow();
  });
  
  it('should not have syntax errors', () => {
    const schemaString = printSchema(schema);
    expect(schemaString).toBeTruthy();
    expect(schemaString.length).toBeGreaterThan(100);
  });
});

describe('GraphQL Schema Documentation', () => {
  it('should have descriptions on types', () => {
    // Schema types should include descriptions
    // This is a reminder to add documentation
    const schemaString = printSchema(schema);
    
    // Check for description pattern ("""Description""")
    // GraphQL uses triple-quote for descriptions
    expect(schemaString).toMatch(/"""/); // At least some descriptions exist
  });
});
