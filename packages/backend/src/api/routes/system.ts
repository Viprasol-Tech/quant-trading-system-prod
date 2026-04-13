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

      // Try to check Python service and IBKR status
      try {
        const pythonBaseUrl = process.env.PYTHON_SERVICE_URL || 'http://python-service:6105';
        const pythonHealthUrl = `${pythonBaseUrl}/health`;
        logger.info(`Fetching Python health from: ${pythonHealthUrl}`);
        const pythonResponse = await fetch(pythonHealthUrl, { signal: AbortSignal.timeout(2000) });
        logger.info(`Python health response status: ${pythonResponse.status} (ok: ${pythonResponse.ok})`);

        if (pythonResponse.ok) {
          status.services.python = 'ok';

          // Extract IBKR status from Python health response
          try {
            const pythonData = await pythonResponse.json() as any;
            logger.info(`Python health data: ${JSON.stringify(pythonData)}`);
            status.services.ibkr = pythonData?.ibkr_connected ? 'ok' : 'disconnected';
          } catch (parseErr) {
            logger.warn('Failed to parse Python health response');
            status.services.ibkr = 'unknown';
          }
        } else {
          status.services.python = 'unhealthy';
          status.services.ibkr = 'unavailable';
        }
      } catch (err) {
        logger.warn(`Python service check failed: ${err}`);
        status.services.python = 'unreachable';
        status.services.ibkr = 'unavailable';
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
