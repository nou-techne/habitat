/**
 * Input Validation & Sanitization
 * 
 * Prevents injection attacks and validates data types
 * Sanitizes user input before processing
 */

/**
 * Sanitize string input
 * Removes potential XSS vectors
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * Validate decimal amount
 */
export function validateAmount(amount: string): boolean {
  const amountRegex = /^\d+\.\d{2}$/
  return amountRegex.test(amount) && parseFloat(amount) >= 0
}

/**
 * Validate date format (ISO 8601)
 */
export function validateDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) return false
  
  const parsed = new Date(date)
  return !isNaN(parsed.getTime())
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Remove potentially dangerous keys
      if (key.startsWith('__') || key.startsWith('$')) {
        continue
      }
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }

  return obj
}

/**
 * Validate GraphQL input
 */
export function validateGraphQLInput(
  input: any,
  schema: Record<string, { type: string; required?: boolean; pattern?: RegExp }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const [field, rules] of Object.entries(schema)) {
    const value = input[field]

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${field}' is required`)
      continue
    }

    // Skip optional empty fields
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue
    }

    // Type validation
    switch (rules.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Field '${field}' must be a string`)
        }
        break

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Field '${field}' must be a number`)
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Field '${field}' must be a boolean`)
        }
        break

      case 'email':
        if (typeof value !== 'string' || !validateEmail(value)) {
          errors.push(`Field '${field}' must be a valid email`)
        }
        break

      case 'uuid':
        if (typeof value !== 'string' || !validateUUID(value)) {
          errors.push(`Field '${field}' must be a valid UUID`)
        }
        break

      case 'amount':
        if (typeof value !== 'string' || !validateAmount(value)) {
          errors.push(`Field '${field}' must be a valid amount (0.00 format)`)
        }
        break

      case 'date':
        if (typeof value !== 'string' || !validateDate(value)) {
          errors.push(`Field '${field}' must be a valid date (YYYY-MM-DD)`)
        }
        break
    }

    // Pattern validation
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors.push(`Field '${field}' does not match required pattern`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Input validation middleware
 */
export function createInputValidator(
  schema: Record<string, { type: string; required?: boolean; pattern?: RegExp }>
) {
  return function validateInput(req: any, res: any, next: any) {
    const result = validateGraphQLInput(req.body, schema)

    if (!result.valid) {
      res.status(400).json({
        error: 'Validation failed',
        errors: result.errors,
      })
      return
    }

    // Sanitize input
    req.body = sanitizeObject(req.body)

    next()
  }
}
