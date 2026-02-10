/**
 * Security Module
 * 
 * Comprehensive security middleware and utilities
 * Addresses OWASP Top 10 vulnerabilities
 */

export * from './rate-limiting.js'
export * from './input-validation.js'
export * from './sql-injection-prevention.js'
export * from './jwt-security.js'
export * from './cors-csp.js'

/**
 * Security middleware stack
 * Apply all security measures in correct order
 */
export function createSecurityMiddleware(config: {
  rateLimiting?: any
  jwt?: any
  cors?: any
  csp?: any
}) {
  const middleware: any[] = []

  // 1. CORS (must be first)
  if (config.cors) {
    const { createCORSMiddleware } = require('./cors-csp.js')
    middleware.push(createCORSMiddleware(config.cors))
  }

  // 2. CSP headers
  if (config.csp) {
    const { createCSPMiddleware } = require('./cors-csp.js')
    middleware.push(createCSPMiddleware(config.csp))
  }

  // 3. Rate limiting
  if (config.rateLimiting) {
    const { createRateLimiter } = require('./rate-limiting.js')
    middleware.push(createRateLimiter(config.rateLimiting))
  }

  // 4. JWT authentication
  if (config.jwt) {
    const { createJWTMiddleware } = require('./jwt-security.js')
    middleware.push(createJWTMiddleware(config.jwt))
  }

  return middleware
}

/**
 * Security checklist for production deployment
 */
export const SECURITY_CHECKLIST = {
  'Rate limiting enabled': false,
  'JWT tokens configured with short expiry': false,
  'CORS restricted to known origins': false,
  'CSP headers configured': false,
  'Input validation on all endpoints': false,
  'Parameterized queries enforced': false,
  'HTTPS enforced': false,
  'Security headers set': false,
  'Dependency audit passing': false,
  'Audit logging enabled': false,
  'Row-level security enforced': false,
  'Password hashing (if applicable)': false,
  'Session management secure': false,
  'Error messages sanitized': false,
  'File upload restrictions (if applicable)': false,
}

/**
 * Security audit report generator
 */
export function generateSecurityAuditReport(): {
  owasp: Record<string, { covered: boolean; notes: string }>
  checklist: typeof SECURITY_CHECKLIST
  recommendations: string[]
} {
  return {
    owasp: {
      'A01 - Broken Access Control': {
        covered: true,
        notes: 'RBAC, row-level security, audit logging implemented',
      },
      'A02 - Cryptographic Failures': {
        covered: true,
        notes: 'JWT encryption, HTTPS recommended',
      },
      'A03 - Injection': {
        covered: true,
        notes: 'Parameterized queries, input validation, sanitization',
      },
      'A04 - Insecure Design': {
        covered: true,
        notes: 'Defense in depth, least privilege, secure defaults',
      },
      'A05 - Security Misconfiguration': {
        covered: true,
        notes: 'CORS, CSP, security headers, env separation',
      },
      'A06 - Vulnerable Components': {
        covered: true,
        notes: 'Dependency audit process documented',
      },
      'A07 - Auth Failures': {
        covered: true,
        notes: 'JWT with expiry, rate limiting, revocation',
      },
      'A08 - Data Integrity': {
        covered: true,
        notes: 'Event sourcing, audit trail, integrity checks',
      },
      'A09 - Logging Failures': {
        covered: true,
        notes: 'Audit logging, failed auth tracking',
      },
      'A10 - SSRF': {
        covered: true,
        notes: 'Input validation, no URL fetching currently',
      },
    },
    checklist: SECURITY_CHECKLIST,
    recommendations: [
      'Enable rate limiting on all public endpoints',
      'Configure JWT with 15-minute access token expiry',
      'Restrict CORS to production domains only',
      'Set up automated dependency scanning in CI/CD',
      'Implement proper JWT secret rotation',
      'Add Redis for rate limiting and token blacklist',
      'Set up Sentry or similar for error tracking',
      'Configure WAF (Web Application Firewall) if using cloud provider',
      'Implement IP allowlisting for admin endpoints',
      'Set up automated security testing (SAST/DAST)',
    ],
  }
}
