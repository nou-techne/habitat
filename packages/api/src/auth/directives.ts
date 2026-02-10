/**
 * GraphQL Authorization Directives
 * 
 * Declarative authorization via @auth, @requireRole, @owner directives
 */

import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLSchema } from 'graphql'
import type { AuthContext } from './context.js'
import { requireAuth, requireRole } from './context.js'
import { canAccess } from './roles.js'
import type { Role } from './roles.js'

/**
 * @auth directive — require authentication
 * 
 * Usage: 
 *   type Query {
 *     myContributions: [Contribution!]! @auth
 *   }
 */
export function authDirective(directiveName: string = 'auth') {
  return {
    authDirectiveTypeDefs: `directive @${directiveName} on FIELD_DEFINITION`,
    authDirectiveTransformer: (schema: GraphQLSchema) =>
      mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
          const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0]
          if (authDirective) {
            const { resolve = defaultFieldResolver } = fieldConfig
            fieldConfig.resolve = async function (source, args, context, info) {
              requireAuth(context as AuthContext)
              return resolve(source, args, context, info)
            }
          }
          return fieldConfig
        },
      }),
  }
}

/**
 * @requireRole directive — require specific role
 * 
 * Usage:
 *   type Mutation {
 *     approveContribution(id: ID!): Contribution! @requireRole(roles: ["steward", "admin"])
 *   }
 */
export function requireRoleDirective(directiveName: string = 'requireRole') {
  return {
    requireRoleDirectiveTypeDefs: `directive @${directiveName}(roles: [String!]!) on FIELD_DEFINITION`,
    requireRoleDirectiveTransformer: (schema: GraphQLSchema) =>
      mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
          const roleDirective = getDirective(schema, fieldConfig, directiveName)?.[0]
          if (roleDirective) {
            const { resolve = defaultFieldResolver } = fieldConfig
            const { roles } = roleDirective
            fieldConfig.resolve = async function (source, args, context, info) {
              requireRole(context as AuthContext, ...(roles as Role[]))
              return resolve(source, args, context, info)
            }
          }
          return fieldConfig
        },
      }),
  }
}

/**
 * @owner directive — require ownership or elevated role
 * 
 * Usage:
 *   type Mutation {
 *     updateContribution(id: ID!, data: ContributionInput!): Contribution! @owner(field: "memberId")
 *   }
 */
export function ownerDirective(directiveName: string = 'owner') {
  return {
    ownerDirectiveTypeDefs: `directive @${directiveName}(field: String!) on FIELD_DEFINITION`,
    ownerDirectiveTransformer: (schema: GraphQLSchema) =>
      mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
          const ownerDirective = getDirective(schema, fieldConfig, directiveName)?.[0]
          if (ownerDirective) {
            const { resolve = defaultFieldResolver } = fieldConfig
            const { field } = ownerDirective
            fieldConfig.resolve = async function (source, args, context, info) {
              const authContext = context as AuthContext
              requireAuth(authContext)

              // Admins and stewards bypass ownership check
              if (authContext.role === 'admin' || authContext.role === 'steward') {
                return resolve(source, args, context, info)
              }

              // For members, verify ownership
              const ownerId = source[field] || args[field]
              if (ownerId !== authContext.memberId) {
                throw new Error('Access denied: not owner')
              }

              return resolve(source, args, context, info)
            }
          }
          return fieldConfig
        },
      }),
  }
}
