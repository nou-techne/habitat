/**
 * Monitoring Middleware
 * 
 * Captures metrics for HTTP requests and GraphQL operations
 */

import { Request, Response, NextFunction } from 'express';
import {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestErrors,
  graphqlOperationDuration,
  graphqlOperationTotal,
  graphqlErrors,
} from './metrics';

/**
 * HTTP request monitoring middleware
 */
export function httpMetricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  
  // Capture response finish
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const route = req.route?.path || req.path;
    const method = req.method;
    const status = res.statusCode;
    
    // Record duration
    httpRequestDuration.labels(method, route, status.toString()).observe(duration);
    
    // Record total
    httpRequestTotal.labels(method, route, status.toString()).inc();
    
    // Record errors
    if (status >= 400) {
      const errorType = status >= 500 ? 'server_error' : 'client_error';
      httpRequestErrors.labels(method, route, errorType).inc();
    }
  });
  
  next();
}

/**
 * GraphQL operation monitoring
 */
export function captureGraphQLMetrics(
  operationName: string,
  operationType: 'query' | 'mutation' | 'subscription',
  duration: number,
  success: boolean,
  error?: Error
) {
  // Record duration
  graphqlOperationDuration
    .labels(operationName, operationType)
    .observe(duration / 1000);
  
  // Record total
  const status = success ? 'success' : 'error';
  graphqlOperationTotal
    .labels(operationName, operationType, status)
    .inc();
  
  // Record errors
  if (error) {
    const errorType = error.name || 'UnknownError';
    graphqlErrors
      .labels(operationName, errorType)
      .inc();
  }
}

/**
 * Database query monitoring
 */
export function captureDbMetrics(
  queryType: 'select' | 'insert' | 'update' | 'delete',
  table: string,
  duration: number,
  error?: Error
) {
  const { dbQueryDuration, dbQueryErrors } = require('./metrics');
  
  // Record duration
  dbQueryDuration
    .labels(queryType, table)
    .observe(duration / 1000);
  
  // Record errors
  if (error) {
    const errorType = error.name || 'UnknownError';
    dbQueryErrors
      .labels(queryType, errorType)
      .inc();
  }
}
