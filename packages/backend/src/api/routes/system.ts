import { FastifyInstance } from 'fastify';
import { logger } from '../../config/logger';

export async function systemRoutes(app: FastifyInstance) {
  // System health check endpoint - used by frontend connection status
  app.get<{ Reply: any }>('/api/system/status', async (request, reply) => {
    try {
      const uptime = process.uptime();
      
      // Basic health check
      const status = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime,
        environment: process.env.NODE_ENV || 'production',
        services: {
          backend: 'ok',
          ibkr: 'checking',
          database: 'checking',
          python: 'checking'
        },
        connected: true
      };

      // Try to check Python service
      try {
        const pythonResponse = await fetch(
          process.env.PYTHON_SERVICE_URL || 'http://python-service:6105' + '/health',
          { signal: AbortSignal.timeout(2000) }
        );
        status.services.python = pythonResponse.ok ? 'ok' : 'unhealthy';
      } catch (err) {
        status.services.python = 'unreachable';
        status.connected = false;
      }

      return reply.send(status);
    } catch (err) {
      logger.error('System status check failed:', err);
      return reply.status(500).send({
        status: 'error',
        message: 'System status check failed',
        timestamp: new Date().toISOString()
      });
    }
  });
}
