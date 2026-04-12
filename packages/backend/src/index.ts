import 'reflect-metadata';
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { logger } from './config/logger';
import { config } from './config/environment';
import { setupRoutes } from './api/routes';
import { errorHandler } from './api/middleware/errorHandler';
import db from './database/db'; // Initialize database on startup

logger.info(`Database initialized: ${process.env.DB_PATH || './data/trading.db'}`);

const app = Fastify({
  logger: true,
  requestTimeout: 30000
});

// Error handling middleware
app.setErrorHandler(errorHandler);

// Health check endpoint
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  environment: config.node.env
}));

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  app.close().then(() => {
    logger.info('Server closed');
    process.exit(0);
  }).catch(err => {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
const start = async () => {
  try {
    // Register WebSocket plugin BEFORE setting up routes
    await app.register(fastifyWebsocket);
    logger.info('WebSocket plugin registered');

    // Register CORS plugin
    await app.register(fastifyCors, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    });
    logger.info('CORS plugin registered');

    // Setup routes - MUST be awaited
    await setupRoutes(app);
    logger.info('Routes setup completed successfully');

    await app.listen({ port: config.node.port, host: '0.0.0.0' });
    logger.info(`Server running on http://0.0.0.0:${config.node.port}`);
    logger.info(`Environment: ${config.node.env}`);
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

export default app;
