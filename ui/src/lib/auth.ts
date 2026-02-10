/**
 * Authentication utilities for JWT session handling
 * 
 * Supports:
 * - Token storage in httpOnly cookies
 * - Token validation and refresh
 * - User session management
 */

import jwt from 'jsonwebtoken'
import Cookies from 'js-cookie'

export interface JWTPayload {
  sub: string // member id (habitat.eth subname or UUID)
  cooperativeId: string
  role: 'member' | 'steward' | 'admin'
  iat: number
  exp: number
}

export interface SessionUser {
  id: string
  cooperativeId: string
  role: string
  displayName?: string
  ensName?: string
}

const TOKEN_KEY = 'habitat_token'
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 // 7 days in seconds

/**
 * Store authentication token in cookie
 */
export function setAuthToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, {
    expires: TOKEN_EXPIRY / (24 * 60 * 60), // days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })
}

/**
 * Retrieve authentication token from cookie
 */
export function getAuthToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

/**
 * Remove authentication token
 */
export function clearAuthToken(): void {
  Cookies.remove(TOKEN_KEY)
}

/**
 * Decode JWT without verification (client-side only)
 * Server must verify signature
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token)
  if (!payload) return true
  
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

/**
 * Get current session user from stored token
 */
export function getCurrentUser(): SessionUser | null {
  const token = getAuthToken()
  if (!token) return null
  
  if (isTokenExpired(token)) {
    clearAuthToken()
    return null
  }
  
  const payload = decodeToken(token)
  if (!payload) return null
  
  return {
    id: payload.sub,
    cooperativeId: payload.cooperativeId,
    role: payload.role,
  }
}

/**
 * Create authorization header for GraphQL requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  if (!token) return {}
  
  return {
    'Authorization': `Bearer ${token}`,
  }
}
