/**
 * JWT Security
 * 
 * JWT token generation, validation, expiry, and refresh
 * Implements secure token management practices
 */

export interface JWTPayload {
  userId: string
  memberId: string
  role: string
  iat?: number // Issued at
  exp?: number // Expiration
}

export interface JWTConfig {
  secret: string
  accessTokenTTL: number // seconds
  refreshTokenTTL: number // seconds
  issuer: string
  audience: string
}

/**
 * JWT Token Manager
 */
export class JWTTokenManager {
  private config: JWTConfig

  constructor(config: JWTConfig) {
    this.config = config
  }

  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    const now = Math.floor(Date.now() / 1000)

    const fullPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + this.config.accessTokenTTL,
    }

    // In real implementation, would use jsonwebtoken library
    // For now, return base64-encoded payload (NOT SECURE - example only)
    return this.encodeToken(fullPayload)
  }

  /**
   * Generate refresh token (long-lived)
   */
  generateRefreshToken(userId: string): string {
    const now = Math.floor(Date.now() / 1000)

    const payload = {
      userId,
      type: 'refresh',
      iat: now,
      exp: now + this.config.refreshTokenTTL,
    }

    return this.encodeToken(payload)
  }

  /**
   * Verify and decode token
   */
  verifyToken(token: string): { valid: boolean; payload?: JWTPayload; error?: string } {
    try {
      const payload = this.decodeToken(token)

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: 'Token expired' }
      }

      // Check issuer
      if (payload.iss !== this.config.issuer) {
        return { valid: false, error: 'Invalid issuer' }
      }

      // Check audience
      if (payload.aud !== this.config.audience) {
        return { valid: false, error: 'Invalid audience' }
      }

      return { valid: true, payload }
    } catch (error) {
      return { valid: false, error: 'Invalid token' }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): {
    success: boolean
    accessToken?: string
    error?: string
  } {
    const result = this.verifyToken(refreshToken)

    if (!result.valid) {
      return { success: false, error: result.error }
    }

    if (result.payload?.type !== 'refresh') {
      return { success: false, error: 'Not a refresh token' }
    }

    // In real implementation, would verify refresh token against database
    // to ensure it hasn't been revoked

    // Generate new access token
    const accessToken = this.generateAccessToken({
      userId: result.payload.userId,
      memberId: result.payload.memberId || '',
      role: result.payload.role || 'member',
    })

    return { success: true, accessToken }
  }

  /**
   * Revoke token (store in blacklist)
   */
  async revokeToken(token: string): Promise<void> {
    // In real implementation, would store token in Redis blacklist
    // with TTL = token expiration time
    console.log('Token revoked:', token)
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    // In real implementation, would check Redis blacklist
    return false
  }

  // HELPER METHODS (NOT SECURE - example only)
  // In production, use jsonwebtoken library with proper signing

  private encodeToken(payload: any): string {
    const header = { alg: 'HS256', typ: 'JWT' }
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
    const encodedPayload = Buffer.from(JSON.stringify({
      ...payload,
      iss: this.config.issuer,
      aud: this.config.audience,
    })).toString('base64url')
    
    // In real implementation, would generate HMAC signature
    const signature = 'EXAMPLE_SIGNATURE'
    
    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

  private decodeToken(token: string): any {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token format')
    }

    const payload = Buffer.from(parts[1], 'base64url').toString('utf8')
    return JSON.parse(payload)
  }
}

/**
 * JWT middleware
 */
export function createJWTMiddleware(tokenManager: JWTTokenManager) {
  return async function jwtMiddleware(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.authenticated = false
      next()
      return
    }

    const token = authHeader.substring(7)

    // Check blacklist
    if (await tokenManager.isTokenBlacklisted(token)) {
      res.status(401).json({ error: 'Token has been revoked' })
      return
    }

    const result = tokenManager.verifyToken(token)

    if (!result.valid) {
      res.status(401).json({ error: result.error })
      return
    }

    // Add user info to request
    req.authenticated = true
    req.userId = result.payload?.userId
    req.memberId = result.payload?.memberId
    req.role = result.payload?.role

    next()
  }
}

/**
 * Recommended JWT configuration
 */
export const JWT_CONFIG_DEFAULTS: Omit<JWTConfig, 'secret'> = {
  accessTokenTTL: 15 * 60, // 15 minutes
  refreshTokenTTL: 7 * 24 * 60 * 60, // 7 days
  issuer: 'habitat.eth',
  audience: 'habitat-api',
}
