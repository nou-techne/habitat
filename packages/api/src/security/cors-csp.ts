/**
 * CORS & Content Security Policy
 * 
 * Cross-Origin Resource Sharing configuration
 * Content Security Policy headers
 */

export interface CORSConfig {
  allowedOrigins: string[]
  allowedMethods: string[]
  allowedHeaders: string[]
  exposedHeaders?: string[]
  credentials: boolean
  maxAge?: number
}

/**
 * CORS middleware
 */
export function createCORSMiddleware(config: CORSConfig) {
  return function corsMiddleware(req: any, res: any, next: any) {
    const origin = req.headers.origin

    // Check if origin is allowed
    const isAllowed =
      config.allowedOrigins.includes('*') ||
      config.allowedOrigins.includes(origin)

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*')
    }

    res.setHeader('Access-Control-Allow-Methods', config.allowedMethods.join(', '))
    res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '))

    if (config.exposedHeaders) {
      res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(', '))
    }

    if (config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }

    if (config.maxAge) {
      res.setHeader('Access-Control-Max-Age', config.maxAge.toString())
    }

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    next()
  }
}

/**
 * Content Security Policy configuration
 */
export interface CSPConfig {
  defaultSrc: string[]
  scriptSrc: string[]
  styleSrc: string[]
  imgSrc: string[]
  fontSrc: string[]
  connectSrc: string[]
  frameSrc?: string[]
  objectSrc?: string[]
  mediaSrc?: string[]
  workerSrc?: string[]
  childSrc?: string[]
  formAction?: string[]
  frameAncestors?: string[]
  baseUri?: string[]
  manifestSrc?: string[]
  upgradeInsecureRequests?: boolean
  blockAllMixedContent?: boolean
}

/**
 * CSP middleware
 */
export function createCSPMiddleware(config: CSPConfig) {
  return function cspMiddleware(req: any, res: any, next: any) {
    const directives: string[] = []

    // Build CSP directives
    if (config.defaultSrc) {
      directives.push(`default-src ${config.defaultSrc.join(' ')}`)
    }

    if (config.scriptSrc) {
      directives.push(`script-src ${config.scriptSrc.join(' ')}`)
    }

    if (config.styleSrc) {
      directives.push(`style-src ${config.styleSrc.join(' ')}`)
    }

    if (config.imgSrc) {
      directives.push(`img-src ${config.imgSrc.join(' ')}`)
    }

    if (config.fontSrc) {
      directives.push(`font-src ${config.fontSrc.join(' ')}`)
    }

    if (config.connectSrc) {
      directives.push(`connect-src ${config.connectSrc.join(' ')}`)
    }

    if (config.frameSrc) {
      directives.push(`frame-src ${config.frameSrc.join(' ')}`)
    }

    if (config.objectSrc) {
      directives.push(`object-src ${config.objectSrc.join(' ')}`)
    }

    if (config.mediaSrc) {
      directives.push(`media-src ${config.mediaSrc.join(' ')}`)
    }

    if (config.formAction) {
      directives.push(`form-action ${config.formAction.join(' ')}`)
    }

    if (config.frameAncestors) {
      directives.push(`frame-ancestors ${config.frameAncestors.join(' ')}`)
    }

    if (config.baseUri) {
      directives.push(`base-uri ${config.baseUri.join(' ')}`)
    }

    if (config.upgradeInsecureRequests) {
      directives.push('upgrade-insecure-requests')
    }

    if (config.blockAllMixedContent) {
      directives.push('block-all-mixed-content')
    }

    res.setHeader('Content-Security-Policy', directives.join('; '))

    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

    next()
  }
}

/**
 * Production CORS configuration
 */
export const CORS_CONFIG_PRODUCTION: CORSConfig = {
  allowedOrigins: [
    'https://habitat.eth',
    'https://app.habitat.eth',
    'https://the-habitat.org',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
}

/**
 * Development CORS configuration (permissive)
 */
export const CORS_CONFIG_DEVELOPMENT: CORSConfig = {
  allowedOrigins: ['*'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  credentials: false,
}

/**
 * Production CSP configuration
 */
export const CSP_CONFIG_PRODUCTION: CSPConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid unsafe-inline in prod
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  connectSrc: ["'self'", 'https://api.habitat.eth'],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  upgradeInsecureRequests: true,
  blockAllMixedContent: true,
}
