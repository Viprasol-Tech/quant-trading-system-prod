import { FastifyInstance } from 'fastify';
import { logger } from '../../config/logger';
import portfolioRoutes from './portfolio';
import positionsRoutes from './positions';
import ordersRoutes from './orders';
import dataRoutes from './data';
import { signalsRoutes } from './signals';
import { strategiesRoutes } from './strategies';
import { riskRoutes } from './risk';
import { setupComplianceRoutes } from './compliance';
import { wsRoutes } from './ws';
import { systemRoutes } from './system';
import { backtestRoutes } from './backtest';

export async function setupRoutes(app: FastifyInstance) {
  logger.info('Setting up API routes...');

  try {
    // Register System routes (status check, used by frontend)
    await app.register(systemRoutes);
    logger.info('✓ System routes registered');

    // Register Phase 1 routes
    await app.register(portfolioRoutes);
    logger.info('✓ Portfolio routes registered');

    await app.register(positionsRoutes);
    logger.info('✓ Positions routes registered');

    await app.register(ordersRoutes);
    logger.info('✓ Orders routes registered');

    await app.register(dataRoutes);
    logger.info('✓ Data routes registered');

    // Register Phase 2 routes
    await app.register(signalsRoutes);
    logger.info('✓ Signals routes registered');

    await app.register(strategiesRoutes);
    logger.info('✓ Strategies routes registered');

    await app.register(riskRoutes);
    logger.info('✓ Risk routes registered');

    // Register Shariah Compliance routes (Muslim Xchange)
    await setupComplianceRoutes(app);
    logger.info('✓ Shariah Compliance routes registered');

    // Register WebSocket routes
    await app.register(wsRoutes);
    logger.info('✓ WebSocket routes registered');

    // Register Backtest routes (Phase 4)
    await app.register(backtestRoutes);
    logger.info('✓ Backtest routes registered');

    logger.info('All routes registered successfully');
  } catch (error) {
    logger.error('Route registration failed:', error);
    throw error;
  }
}
