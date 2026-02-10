import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { isAuthenticated, hasRole, initializeAuth } from '../lib/auth'
import { LoadingState } from './LoadingState'

export interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredRole?: 'member' | 'steward' | 'admin'
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter()
  const authenticated = isAuthenticated()

  useEffect(() => {
    // Initialize auth (check token expiry, refresh if needed)
    initializeAuth()

    // Redirect if not authenticated
    if (requireAuth && !authenticated) {
      router.push(redirectTo)
      return
    }

    // Check role requirement
    if (requiredRole && !hasRole(requiredRole)) {
      router.push('/unauthorized')
      return
    }
  }, [authenticated, requireAuth, requiredRole, redirectTo, router])

  // Show loading while checking auth
  if (requireAuth && !authenticated) {
    return <LoadingState text="Checking authentication..." />
  }

  // Show loading while checking role
  if (requiredRole && !hasRole(requiredRole)) {
    return <LoadingState text="Checking permissions..." />
  }

  return <>{children}</>
}
