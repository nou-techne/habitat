/**
 * Structured Logging
 * 
 * Winston-based logger with JSON output for production
 */

import winston from 'winston';

const { combine, timestamp, json, printf, colorize, errors } = winston.format;

// Custom format for development (human-readable)
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  
  return log;
});

// Create logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: {
    service: 'habitat-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [],
});

// Production: JSON logs to stdout/stderr
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.Console({
      format: json(),
    })
  );
} else {
  // Development: human-readable logs
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), devFormat),
    })
  );
}

// Log levels: error, warn, info, http, verbose, debug, silly

/**
 * Log HTTP request
 */
export function logRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
  userId?: string
) {
  logger.http('HTTP request', {
    method,
    path,
    status,
    duration_ms: duration,
    user_id: userId,
  });
}

/**
 * Log GraphQL operation
 */
export function logGraphQLOperation(
  operationName: string,
  operationType: string,
  duration: number,
  success: boolean,
  userId?: string,
  error?: Error
) {
  const logLevel = success ? 'info' : 'error';
  
  logger.log(logLevel, 'GraphQL operation', {
    operation_name: operationName,
    operation_type: operationType,
    duration_ms: duration,
    success,
    user_id: userId,
    error: error ? {
      message: error.message,
      stack: error.stack,
    } : undefined,
  });
}

/**
 * Log database query
 */
export function logDbQuery(
  queryType: string,
  table: string,
  duration: number,
  error?: Error
) {
  if (error) {
    logger.error('Database query error', {
      query_type: queryType,
      table,
      duration_ms: duration,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  } else if (duration > 1000) {
    // Log slow queries
    logger.warn('Slow database query', {
      query_type: queryType,
      table,
      duration_ms: duration,
    });
  } else {
    logger.debug('Database query', {
      query_type: queryType,
      table,
      duration_ms: duration,
    });
  }
}

/**
 * Log authentication event
 */
export function logAuth(
  event: 'login' | 'logout' | 'token_refresh' | 'token_revoke',
  userId: string,
  success: boolean,
  error?: Error
) {
  logger.info('Authentication event', {
    event,
    user_id: userId,
    success,
    error: error ? {
      message: error.message,
    } : undefined,
  });
}

/**
 * Log business event
 */
export function logBusinessEvent(
  event: string,
  data: Record<string, any>
) {
  logger.info('Business event', {
    event,
    ...data,
  });
}

/**
 * Log error
 */
export function logError(
  message: string,
  error: Error,
  context?: Record<string, any>
) {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  });
}
