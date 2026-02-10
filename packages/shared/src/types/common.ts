/**
 * Common types used across all bounded contexts
 */

/** UUID string format */
export type UUID = string

/** ISO 8601 timestamp string */
export type Timestamp = string

/** Money amount in smallest currency unit (e.g., cents for USD) */
export type MoneyAmount = number

/** Decimal number stored as string for precision */
export type Decimal = string

/** JSON object */
export type JSONObject = Record<string, unknown>

/** Event metadata */
export interface EventMetadata {
  correlationId?: string
  causationId?: string
  userId?: string
  timestamp: Timestamp
  [key: string]: unknown
}

/** Pagination info */
export interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor?: string
  endCursor?: string
}

/** Connection edge for pagination */
export interface Edge<T> {
  node: T
  cursor: string
}

/** Connection for paginated results */
export interface Connection<T> {
  edges: Edge<T>[]
  pageInfo: PageInfo
  totalCount?: number
}
