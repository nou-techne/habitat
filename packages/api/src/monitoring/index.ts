/**
 * Monitoring Module
 * 
 * Exports metrics, middleware, and endpoints
 */

export * from './metrics';
export * from './middleware';
export * from './logger';

import { Router } from 'express';
import { register } from './metrics';

/**
 * Create monitoring router
 */
export function createMonitoringRouter(): Router {
  const router = Router();
  
  // Prometheus metrics endpoint
  router.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).end(error);
    }
  });
  
  // Health check endpoint (already exists, but add metrics)
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });
  
  return router;
}
