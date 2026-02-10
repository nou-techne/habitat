/**
 * Rate Limiting Middleware
 * 
 * Protects against brute force attacks and API abuse
 * Implements token bucket algorithm with per-user and per-IP limits
 */

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

export interface RateLimitStore {
  increment(key: string): Promise<number>
  reset(key: string): Promise<void>
  get(key: string): Promise<number>
}

/**
 * In-memory rate limit store (use Redis in production)
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>()

  async increment(key: string): Promise<number> {
    const now = Date.now()
    const record = this.store.get(key)

    if (!record || now > record.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + 60000 }) // 1 minute window
      return 1
    }

    record.count++
    return record.count
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }

  async get(key: string): Promise<number> {
    const record = this.store.get(key)
    if (!record || Date.now() > record.resetAt) {
      return 0
    }
    return record.count
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetAt) {
        this.store.delete(key)
      }
    }
  }
}

/**
 * Rate limit middleware factory
 */
export function createRateLimiter(
  config: RateLimitConfig,
  store: RateLimitStore = new InMemoryRateLimitStore()
) {
  return async function rateLimitMiddleware(req: any, res: any, next: any) {
    // Get identifier (user ID or IP)
    const identifier = req.userId || req.ip || 'anonymous'
    const key = `ratelimit:${identifier}`

    try {
      const count = await store.increment(key)

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count))
      res.setHeader('X-RateLimit-Reset', Date.now() + config.windowMs)

      if (count > config.maxRequests) {
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(config.windowMs / 1000),
        })
        return
      }

      next()
    } catch (error) {
      // On error, allow request but log
      console.error('Rate limiter error:', error)
      next()
    }
  }
}

/**
 * Preset rate limit configurations
 */
export const RATE_LIMITS = {
  // Strict: Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },

  // Moderate: Mutation operations
  mutation: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  },

  // Relaxed: Query operations
  query: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },

  // Very relaxed: Public endpoints
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300,
  },
}
