/**
 * Authentication utilities
 * 
 * Token management, user session, and protected routes
 */

export interface User {
  userId: string
  memberId: string
  name: string
  email: string
  role: 'member' | 'steward' | 'admin'
}

/**
 * Token storage keys
 */
const ACCESS_TOKEN_KEY = 'authToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'currentUser'

/**
 * Store authentication token
 */
export function setAuthToken(accessToken: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

/**
 * Get authentication token
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Remove authentication token
 */
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return
  
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Store current user
 */
export function setCurrentUser(user: User): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null
  
  const userJson = localStorage.getItem(USER_KEY)
  if (!userJson) return null
  
  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

/**
 * Remove current user
 */
export function removeCurrentUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null
}

/**
 * Check if user has specific role
 */
export function hasRole(role: 'member' | 'steward' | 'admin'): boolean {
  const user = getCurrentUser()
  if (!user) return false
  
  // Admin has all roles
  if (user.role === 'admin') return true
  
  // Steward has member role
  if (user.role === 'steward' && role === 'member') return true
  
  return user.role === role
}

/**
 * Logout user
 */
export function logout(): void {
  removeAuthToken()
  removeCurrentUser()
  
  // Redirect to login
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null
  
  try {
    // Call refresh endpoint
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })
    
    if (!response.ok) {
      throw new Error('Refresh failed')
    }
    
    const data = await response.json()
    
    if (data.accessToken) {
      setAuthToken(data.accessToken, data.refreshToken)
      return data.accessToken
    }
    
    return null
  } catch (error) {
    console.error('Token refresh failed:', error)
    logout()
    return null
  }
}

/**
 * Initialize auth on app load
 * Checks if token is expired and refreshes if needed
 */
export async function initializeAuth(): Promise<void> {
  const token = getAuthToken()
  if (!token) return
  
  // Decode token to check expiry (simplified - in production use jwt-decode)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const expiresAt = payload.exp * 1000 // Convert to milliseconds
    const now = Date.now()
    
    // Refresh if token expires in less than 5 minutes
    if (expiresAt - now < 5 * 60 * 1000) {
      await refreshAccessToken()
    }
  } catch (error) {
    console.error('Token validation failed:', error)
    logout()
  }
}
