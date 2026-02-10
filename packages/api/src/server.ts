/**
 * Apollo Server Setup
 * 
 * GraphQL API server with:
 * - Schema and resolvers
 * - Authentication middleware (JWT)
 * - CORS configuration
 * - Request logging
 * - Health checks
 * - Graceful shutdown
 */

import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { typeDefs } from './graphql/schema.js'
import { treasuryResolvers } from './graphql/resolvers/treasury.js'
import { peopleResolvers } from './graphql/resolvers/people.js'
import { agreementsResolvers } from './graphql/resolvers/agreements.js'
import { createDatabaseClient } from './db/client.js'
import { getConfig } from './config.js'
import type { DatabaseClient } from './db/client.js'

// ============================================================================
// Context Interface
// ============================================================================

export interface Context {
  db: DatabaseClient
  user?: {
    userId: string
    memberId?: string
    role: string
  }
}

// ============================================================================
// Resolver Merging
// ============================================================================

const resolvers = {
  Query: {
    ...treasuryResolvers.Query,
    ...peopleResolvers.Query,
    ...agreementsResolvers.Query,
  },
  Mutation: {
    ...treasuryResolvers.Mutation,
    ...peopleResolvers.Mutation,
    ...agreementsResolvers.Mutation,
  },
  // Type resolvers
  Account: treasuryResolvers.Account,
  Transaction: treasuryResolvers.Transaction,
  TransactionEntry: treasuryResolvers.TransactionEntry,
  Period: treasuryResolvers.Period,
  AccountBalance: treasuryResolvers.AccountBalance,
  Member: peopleResolvers.Member,
  Contribution: peopleResolvers.Contribution,
  Approval: peopleResolvers.Approval,
  PatronageSummary: peopleResolvers.PatronageSummary,
  Allocation: agreementsResolvers.Allocation,
  Distribution: agreementsResolvers.Distribution,
  CapitalAccount: agreementsResolvers.CapitalAccount,
  AllocationSummary: agreementsResolvers.AllocationSummary,
}

// ============================================================================
// JWT Authentication
// ============================================================================

interface JWTPayload {
  userId: string
  memberId?: string
  role: string
}

/**
 * Parse and validate JWT token
 * In production, use jsonwebtoken or jose library
 */
function parseJWT(token: string): JWTPayload | null {
  try {
    // Simplified JWT parsing (no signature validation)
    // Production should validate signature with public key
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    
    // Validate required fields
    if (!payload.userId || !payload.role) return null

    return {
      userId: payload.userId,
      memberId: payload.memberId,
      role: payload.role,
    }
  } catch (error) {
    console.error('JWT parse error:', error)
    return null
  }
}

/**
 * Extract user from Authorization header
 */
function getUserFromAuth(authHeader?: string): JWTPayload | undefined {
  if (!authHeader) return undefined

  const match = authHeader.match(/^Bearer (.+)$/)
  if (!match) return undefined

  const token = match[1]
  return parseJWT(token) || undefined
}

// ============================================================================
// Server Startup
// ============================================================================

export async function startServer() {
  const config = getConfig()

  // Create database client
  console.log('Connecting to database...')
  const db = await createDatabaseClient(config.database)

  // Create Apollo Server
  const server = new ApolloServer<Context>({
    typeDefs,
    resolvers,
    introspection: config.server.introspection,
    plugins: [
      // Logging plugin
      {
        async requestDidStart() {
          return {
            async didEncounterErrors(requestContext) {
              console.error('GraphQL Errors:', requestContext.errors)
            },
          }
        },
      },
    ],
  })

  // Start server
  const { url } = await startStandaloneServer(server, {
    listen: { port: config.server.port },
    context: async ({ req }) => {
      // Parse Authorization header
      const user = getUserFromAuth(req.headers.authorization)

      // Log request
      console.log(`${new Date().toISOString()} [GraphQL] ${req.method} ${req.url}`)
      if (user) {
        console.log(`  User: ${user.userId} (${user.role})`)
      }

      return {
        db,
        user,
      }
    },
  })

  console.log(`🚀 Habitat API ready at ${url}`)
  console.log(`📖 GraphQL Playground: ${url}`)

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down gracefully...')
    await server.stop()
    console.log('✓ Apollo Server stopped')
    
    // Close database connections
    if ('end' in db) {
      await (db as any).end()
      console.log('✓ Database connections closed')
    }
    
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return server
}

// ============================================================================
// Health Check Handler
// ============================================================================

export async function healthCheck(db: DatabaseClient): Promise<{
  status: 'healthy' | 'unhealthy'
  timestamp: string
  checks: Record<string, boolean>
}> {
  const timestamp = new Date().toISOString()
  const checks: Record<string, boolean> = {}

  // Check database connection
  try {
    if ('from' in db) {
      // Supabase - just check if client exists
      checks.database = true
    } else {
      // PostgreSQL - run simple query
      await db.query('SELECT 1')
      checks.database = true
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    checks.database = false
  }

  const allHealthy = Object.values(checks).every(Boolean)

  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp,
    checks,
  }
}

// ============================================================================
// Run if called directly
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })
}
