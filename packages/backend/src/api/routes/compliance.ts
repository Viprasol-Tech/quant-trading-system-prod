import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import MuslimXchangeClient from '../../services/MuslimXchangeClient';
import { config } from '../../config/environment';
import { logger } from '../../config/logger';

export async function setupComplianceRoutes(app: FastifyInstance) {
  // Initialize Muslim Xchange client
  const muslimXchangeUsername = process.env.MUSLIM_XCHANGE_USERNAME || 'alharthyinvestment';
  const muslimXchangePassword = process.env.MUSLIM_XCHANGE_API_PASSWORD || '3D0qxeFdEzHsc02R8lwwZUS0';
  const mxClient = new MuslimXchangeClient(muslimXchangeUsername, muslimXchangePassword);

  /**
   * GET /api/compliance/screen/:symbol
   * Screen a single stock for Shariah compliance
   */
  app.get<{ Params: { symbol: string } }>(
    '/api/compliance/screen/:symbol',
    async (request: FastifyRequest<{ Params: { symbol: string } }>, reply: FastifyReply) => {
      try {
        const { symbol } = request.params;
        logger.info(`Screening ${symbol} for Shariah compliance`);

        const complianceData = await mxClient.screenTicker(symbol);

        reply.send({
          success: true,
          data: complianceData,
          score: mxClient.getComplianceScore(complianceData)
        });
      } catch (error) {
        logger.error('Error screening stock:', error);
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to screen stock'
        });
      }
    }
  );

  /**
   * POST /api/compliance/batch
   * Screen multiple stocks at once
   */
  app.post<{ Body: { symbols: string[] } }>(
    '/api/compliance/batch',
    async (request: FastifyRequest<{ Body: { symbols: string[] } }>, reply: FastifyReply) => {
      try {
        const { symbols } = request.body;

        if (!Array.isArray(symbols) || symbols.length === 0) {
          return reply.status(400).send({
            success: false,
            error: 'symbols array required'
          });
        }

        logger.info(`Screening ${symbols.length} stocks`);
        const results = await mxClient.batchScreenTickers(symbols);

        reply.send({
          success: true,
          data: results,
          compliant: results.filter(r => r.compliant).length,
          nonCompliant: results.filter(r => !r.compliant).length
        });
      } catch (error) {
        logger.error('Error in batch screening:', error);
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Batch screening failed'
        });
      }
    }
  );

  /**
   * GET /api/compliance/market/:market
   * Screen entire market
   */
  app.get<{ Params: { market: string } }>(
    '/api/compliance/market/:market',
    async (request: FastifyRequest<{ Params: { market: string } }>, reply: FastifyReply) => {
      try {
        const { market } = request.params;
        logger.info(`Screening ${market} market`);

        const results = await mxClient.screenMarket(market);

        reply.send({
          success: true,
          market,
          total: results.length,
          compliant: results.filter(r => r.compliant).length,
          data: results
        });
      } catch (error) {
        logger.error('Error screening market:', error);
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Market screening failed'
        });
      }
    }
  );

  /**
   * POST /api/compliance/filter
   * Filter compliant stocks from a list
   */
  app.post<{ Body: { symbols: string[] } }>(
    '/api/compliance/filter',
    async (request: FastifyRequest<{ Body: { symbols: string[] } }>, reply: FastifyReply) => {
      try {
        const { symbols } = request.body;

        if (!Array.isArray(symbols) || symbols.length === 0) {
          return reply.status(400).send({
            success: false,
            error: 'symbols array required'
          });
        }

        const compliantStocks = await mxClient.filterCompliantStocks(symbols);

        reply.send({
          success: true,
          compliant: compliantStocks,
          count: compliantStocks.length,
          filtered: symbols.length - compliantStocks.length
        });
      } catch (error) {
        logger.error('Error filtering stocks:', error);
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Filtering failed'
        });
      }
    }
  );

  /**
   * GET /api/compliance/cache/clear
   * Clear the compliance cache
   */
  app.get('/api/compliance/cache/clear', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      mxClient.clearCache();
      reply.send({
        success: true,
        message: 'Cache cleared'
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: 'Failed to clear cache'
      });
    }
  });

  logger.info('Shariah compliance routes registered');
}

export default setupComplianceRoutes;
