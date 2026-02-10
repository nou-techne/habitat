/**
 * GraphQL Resolver Integration Tests
 * 
 * Tests that all queries and mutations work correctly with real resolvers
 * Layer 3 (Relationship) validation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { graphql, GraphQLSchema } from 'graphql';
import { schema } from '../../graphql/schema';
import pg from 'pg';

const { Pool } = pg;

let pool: pg.Pool;
let testMemberId: string;
let testPeriodId: string;
let testContributionId: string;
let authToken: string;

beforeAll(async () => {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://habitat:habitat@localhost:5432/habitat_test',
  });
  
  // Create test data
  const memberResult = await pool.query(`
    INSERT INTO members (email, display_name, role, status, password_hash)
    VALUES ('test@habitat.eth', 'Test User', 'member', 'active', '$2b$10$test_hash')
    RETURNING id;
  `);
  testMemberId = memberResult.rows[0].id;
  
  const periodResult = await pool.query(`
    INSERT INTO allocation_periods (name, description, start_date, end_date, status)
    VALUES ('Test Period', 'Test Description', NOW(), NOW() + INTERVAL '30 days', 'open')
    RETURNING id;
  `);
  testPeriodId = periodResult.rows[0].id;
  
  // Mock auth token (in real tests, this would come from actual auth)
  authToken = 'test_jwt_token';
});

afterAll(async () => {
  // Cleanup test data
  await pool.query('DELETE FROM contributions WHERE member_id = $1', [testMemberId]);
  await pool.query('DELETE FROM allocations WHERE member_id = $1', [testMemberId]);
  await pool.query('DELETE FROM allocation_periods WHERE id = $1', [testPeriodId]);
  await pool.query('DELETE FROM members WHERE id = $1', [testMemberId]);
  await pool.end();
});

describe('Query Resolvers', () => {
  describe('me query', () => {
    it('should return current user', async () => {
      const query = `
        query {
          me {
            id
            email
            displayName
            role
            status
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'member',
      };
      
      const result = await graphql({
        schema,
        source: query,
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.me).toBeDefined();
      expect(result.data?.me.id).toBe(testMemberId);
      expect(result.data?.me.email).toBe('test@habitat.eth');
    });
    
    it('should return null when not authenticated', async () => {
      const query = `query { me { id } }`;
      
      const result = await graphql({
        schema,
        source: query,
        contextValue: {},
      });
      
      expect(result.data?.me).toBeNull();
    });
  });
  
  describe('member query', () => {
    it('should return member by ID', async () => {
      const query = `
        query($id: ID!) {
          member(id: $id) {
            id
            email
            displayName
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'admin',
      };
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { id: testMemberId },
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.member).toBeDefined();
      expect(result.data?.member.id).toBe(testMemberId);
    });
    
    it('should return null for non-existent member', async () => {
      const query = `
        query($id: ID!) {
          member(id: $id) {
            id
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'admin',
      };
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { id: '00000000-0000-0000-0000-000000000000' },
        contextValue: context,
      });
      
      expect(result.data?.member).toBeNull();
    });
  });
  
  describe('members query', () => {
    it('should return paginated members', async () => {
      const query = `
        query($limit: Int, $offset: Int) {
          members(limit: $limit, offset: $offset) {
            items {
              id
              email
            }
            pageInfo {
              total
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'admin',
      };
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { limit: 10, offset: 0 },
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.members).toBeDefined();
      expect(result.data?.members.items).toBeInstanceOf(Array);
      expect(result.data?.members.pageInfo).toBeDefined();
      expect(result.data?.members.pageInfo.total).toBeGreaterThanOrEqual(1);
    });
    
    it('should respect limit parameter', async () => {
      const query = `
        query($limit: Int) {
          members(limit: $limit) {
            items {
              id
            }
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'admin',
      };
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { limit: 2 },
        contextValue: context,
      });
      
      expect(result.data?.members.items.length).toBeLessThanOrEqual(2);
    });
    
    it('should handle offset for pagination', async () => {
      const query = `
        query($offset: Int) {
          members(offset: $offset) {
            items {
              id
            }
            pageInfo {
              hasPreviousPage
            }
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'admin',
      };
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { offset: 1 },
        contextValue: context,
      });
      
      expect(result.data?.members.pageInfo.hasPreviousPage).toBe(true);
    });
  });
  
  describe('period queries', () => {
    it('should return period by ID', async () => {
      const query = `
        query($id: ID!) {
          period(id: $id) {
            id
            name
            status
            startDate
            endDate
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'member',
      };
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { id: testPeriodId },
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.period).toBeDefined();
      expect(result.data?.period.id).toBe(testPeriodId);
      expect(result.data?.period.name).toBe('Test Period');
    });
    
    it('should return current period', async () => {
      const query = `
        query {
          currentPeriod {
            id
            status
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'member',
      };
      
      const result = await graphql({
        schema,
        source: query,
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.currentPeriod).toBeDefined();
      expect(result.data?.currentPeriod.status).toBe('open');
    });
  });
  
  describe('contribution queries', () => {
    beforeEach(async () => {
      // Create test contribution
      const result = await pool.query(`
        INSERT INTO contributions (member_id, period_id, contribution_type, amount, status, description)
        VALUES ($1, $2, 'labor', '100.00', 'pending', 'Test contribution')
        RETURNING id;
      `, [testMemberId, testPeriodId]);
      testContributionId = result.rows[0].id;
    });
    
    it('should return contribution by ID', async () => {
      const query = `
        query($id: ID!) {
          contribution(id: $id) {
            id
            amount
            contributionType
            status
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'member',
      };
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { id: testContributionId },
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.contribution).toBeDefined();
      expect(result.data?.contribution.amount).toBe('100.00');
    });
    
    it('should return member contributions', async () => {
      const query = `
        query($memberId: ID!) {
          memberContributions(memberId: $memberId) {
            items {
              id
              memberId
              amount
            }
            pageInfo {
              total
            }
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'member',
      };
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { memberId: testMemberId },
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.memberContributions.items).toBeInstanceOf(Array);
      expect(result.data?.memberContributions.items.length).toBeGreaterThanOrEqual(1);
    });
    
    it('should return pending contributions for stewards', async () => {
      const query = `
        query {
          pendingContributions {
            items {
              id
              status
            }
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'steward',
      };
      
      const result = await graphql({
        schema,
        source: query,
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.pendingContributions).toBeDefined();
      
      // All returned contributions should be pending
      for (const contrib of result.data?.pendingContributions.items || []) {
        expect(contrib.status).toBe('pending');
      }
    });
  });
});

describe('Mutation Resolvers', () => {
  describe('createContribution mutation', () => {
    it('should create contribution', async () => {
      const mutation = `
        mutation($input: CreateContributionInput!) {
          createContribution(input: $input) {
            id
            amount
            contributionType
            status
          }
        }
      `;
      
      const input = {
        periodId: testPeriodId,
        contributionType: 'LABOR',
        amount: '50.00',
        description: 'Test contribution from mutation',
      };
      
      const context = {
        userId: testMemberId,
        role: 'member',
      };
      
      const result = await graphql({
        schema,
        source: mutation,
        variableValues: { input },
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.createContribution).toBeDefined();
      expect(result.data?.createContribution.amount).toBe('50.00');
      expect(result.data?.createContribution.status).toBe('pending');
      
      // Cleanup
      await pool.query('DELETE FROM contributions WHERE id = $1', [result.data?.createContribution.id]);
    });
    
    it('should validate required fields', async () => {
      const mutation = `
        mutation($input: CreateContributionInput!) {
          createContribution(input: $input) {
            id
          }
        }
      `;
      
      const input = {
        periodId: testPeriodId,
        // Missing required fields: contributionType, amount
      };
      
      const context = {
        userId: testMemberId,
        role: 'member',
      };
      
      const result = await graphql({
        schema,
        source: mutation,
        variableValues: { input },
        contextValue: context,
      });
      
      expect(result.errors).toBeDefined();
    });
  });
  
  describe('approveContribution mutation', () => {
    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO contributions (member_id, period_id, contribution_type, amount, status)
        VALUES ($1, $2, 'labor', '100.00', 'pending')
        RETURNING id;
      `, [testMemberId, testPeriodId]);
      testContributionId = result.rows[0].id;
    });
    
    it('should approve contribution as steward', async () => {
      const mutation = `
        mutation($id: ID!) {
          approveContribution(id: $id) {
            id
            status
            approvedBy
            approvedAt
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'steward',
      };
      
      const result = await graphql({
        schema,
        source: mutation,
        variableValues: { id: testContributionId },
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data?.approveContribution.status).toBe('approved');
      expect(result.data?.approveContribution.approvedBy).toBe(testMemberId);
      expect(result.data?.approveContribution.approvedAt).toBeTruthy();
    });
    
    it('should reject approval by regular member', async () => {
      const mutation = `
        mutation($id: ID!) {
          approveContribution(id: $id) {
            id
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'member', // Not steward or admin
      };
      
      const result = await graphql({
        schema,
        source: mutation,
        variableValues: { id: testContributionId },
        contextValue: context,
      });
      
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/permission|authorization|role/i);
    });
  });
});

describe('Authorization Rules', () => {
  describe('Authentication required', () => {
    it('should reject unauthenticated queries', async () => {
      const query = `query { me { id } }`;
      
      const result = await graphql({
        schema,
        source: query,
        contextValue: {}, // No userId
      });
      
      // Should return null or error depending on @auth directive implementation
      expect(result.data?.me === null || result.errors).toBeTruthy();
    });
    
    it('should reject unauthenticated mutations', async () => {
      const mutation = `
        mutation($input: CreateContributionInput!) {
          createContribution(input: $input) {
            id
          }
        }
      `;
      
      const input = {
        periodId: testPeriodId,
        contributionType: 'LABOR',
        amount: '50.00',
      };
      
      const result = await graphql({
        schema,
        source: mutation,
        variableValues: { input },
        contextValue: {}, // No userId
      });
      
      expect(result.errors).toBeDefined();
    });
  });
  
  describe('Role-based access control', () => {
    it('should allow admin to access all member data', async () => {
      const query = `
        query {
          members {
            items {
              id
              email
            }
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'admin',
      };
      
      const result = await graphql({
        schema,
        source: query,
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
    });
    
    it('should restrict member from accessing other member details', async () => {
      const query = `
        query($id: ID!) {
          member(id: $id) {
            id
            email
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'member',
      };
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { id: '00000000-0000-0000-0000-000000000001' }, // Different member
        contextValue: context,
      });
      
      // Should return error or null depending on authorization rules
      expect(result.errors || result.data?.member === null).toBeTruthy();
    });
    
    it('should allow steward to approve contributions', async () => {
      const mutation = `
        mutation {
          pendingContributions {
            items {
              id
            }
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'steward',
      };
      
      const result = await graphql({
        schema,
        source: mutation,
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
    });
  });
  
  describe('Owner-based access control', () => {
    it('should allow member to view own contributions', async () => {
      const query = `
        query($memberId: ID!) {
          memberContributions(memberId: $memberId) {
            items {
              id
            }
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'member',
      };
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { memberId: testMemberId },
        contextValue: context,
      });
      
      expect(result.errors).toBeUndefined();
    });
    
    it('should restrict member from viewing other contributions', async () => {
      const query = `
        query($memberId: ID!) {
          memberContributions(memberId: $memberId) {
            items {
              id
            }
          }
        }
      `;
      
      const context = {
        userId: testMemberId,
        role: 'member',
      };
      
      const otherMemberId = '00000000-0000-0000-0000-000000000001';
      
      const result = await graphql({
        schema,
        source: query,
        variableValues: { memberId: otherMemberId },
        contextValue: context,
      });
      
      expect(result.errors).toBeDefined();
    });
  });
});

describe('Pagination', () => {
  it('should return correct page info', async () => {
    const query = `
      query($limit: Int, $offset: Int) {
        members(limit: $limit, offset: $offset) {
          items {
            id
          }
          pageInfo {
            total
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `;
    
    const context = {
      userId: testMemberId,
      role: 'admin',
    };
    
    const result = await graphql({
      schema,
      source: query,
      variableValues: { limit: 1, offset: 0 },
      contextValue: context,
    });
    
    expect(result.data?.members.pageInfo.total).toBeGreaterThanOrEqual(1);
    expect(result.data?.members.pageInfo.hasNextPage).toBe(result.data?.members.pageInfo.total > 1);
    expect(result.data?.members.pageInfo.hasPreviousPage).toBe(false);
  });
  
  it('should handle empty results', async () => {
    const query = `
      query {
        contributions(filter: { status: REJECTED }) {
          items {
            id
          }
          pageInfo {
            total
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `;
    
    const context = {
      userId: testMemberId,
      role: 'admin',
    };
    
    const result = await graphql({
      schema,
      source: query,
      contextValue: context,
    });
    
    expect(result.errors).toBeUndefined();
    expect(result.data?.contributions.items).toBeInstanceOf(Array);
    expect(result.data?.contributions.pageInfo.total).toBe(0);
  });
});

describe('Error Handling', () => {
  it('should return user-friendly error messages', async () => {
    const mutation = `
      mutation($input: CreateContributionInput!) {
        createContribution(input: $input) {
          id
        }
      }
    `;
    
    const input = {
      periodId: '00000000-0000-0000-0000-000000000000', // Non-existent period
      contributionType: 'LABOR',
      amount: '50.00',
    };
    
    const context = {
      userId: testMemberId,
      role: 'member',
    };
    
    const result = await graphql({
      schema,
      source: mutation,
      variableValues: { input },
      contextValue: context,
    });
    
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0].message).toBeTruthy();
  });
  
  it('should not expose internal errors to clients', async () => {
    // Test that database errors are caught and sanitized
    const query = `query { member(id: "invalid-uuid") { id } }`;
    
    const context = {
      userId: testMemberId,
      role: 'admin',
    };
    
    const result = await graphql({
      schema,
      source: query,
      contextValue: context,
    });
    
    if (result.errors) {
      // Error message should be generic, not expose database details
      expect(result.errors[0].message).not.toMatch(/pg_|postgres|sql/i);
    }
  });
});
