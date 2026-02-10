/**
 * Health Check Endpoint
 * 
 * Standalone health check server for container orchestration
 * Runs on separate port from GraphQL API
 */

import http from 'http'
import { createDatabaseClient } from './db/client.js'
import { getConfig } from './config.js'
import { healthCheck } from './server.js'

async function startHealthServer() {
  const config = getConfig()
  const db = await createDatabaseClient(config.database)

  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' || req.url === '/healthz') {
      const health = await healthCheck(db)

      res.writeHead(health.status === 'healthy' ? 200 : 503, {
        'Content-Type': 'application/json',
      })
      res.end(JSON.stringify(health, null, 2))
    } else if (req.url === '/ready' || req.url === '/readyz') {
      // Readiness check (stricter than liveness)
      const health = await healthCheck(db)
      
      res.writeHead(health.status === 'healthy' ? 200 : 503, {
        'Content-Type': 'application/json',
      })
      res.end(JSON.stringify({ ready: health.status === 'healthy' }))
    } else {
      res.writeHead(404)
      res.end('Not Found')
    }
  })

  const port = config.server.healthPort || 3001
  server.listen(port, () => {
    console.log(`💚 Health check server running on http://localhost:${port}`)
    console.log(`   GET /health  - Liveness probe`)
    console.log(`   GET /ready   - Readiness probe`)
  })
}

startHealthServer().catch((error) => {
  console.error('Failed to start health server:', error)
  process.exit(1)
})
