import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Decimal from 'decimal.js';
import { logger } from '../../config/logger';
import IBKRClient, { IBKRPosition } from '../../broker/IBKRClient';
import { Position } from '../../types';

export async function positionsRoutes(app: FastifyInstance) {
  const broker = IBKRClient;

  /**
   * GET /api/positions - Get all open positions
   */
  app.get<{ Reply: { success: boolean; data?: Position[]; error?: string } }>(
    '/api/positions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logger.info('Fetching all positions');

        const ibkrPositions = await broker.getPositions();

        const positions: Position[] = ibkrPositions.map((pos: IBKRPosition) => ({
          symbol: pos.symbol,
          quantity: parseInt(pos.qty, 10),
          entryPrice: new Decimal(pos.avg_entry_price),
          currentPrice: new Decimal(pos.current_price),
          pnl: new Decimal(pos.unrealized_gain),
          pnlPercent: parseFloat(pos.unrealized_gain_pct),
          stopLoss: new Decimal(0), // Placeholder
          takeProfit: new Decimal(0), // Placeholder
          entryTime: new Date(), // Placeholder
          strategy: 'Unknown'
        }));

        logger.info(`Retrieved ${positions.length} positions`);

        reply.send({
          success: true,
          data: positions
        });
      } catch (error) {
        logger.error('Positions fetch failed:', error);
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/positions/:symbol - Get specific position
   */
  app.get<{
    Params: { symbol: string };
    Reply: { success: boolean; data?: Position; error?: string };
  }>('/api/positions/:symbol', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { symbol } = request.params as { symbol: string };
      logger.info(`Fetching position for ${symbol}`);

      const pos = await broker.getPosition(symbol);

      if (!pos) {
        return reply.status(404).send({
          success: false,
          error: `Position not found for ${symbol}`
        });
      }

      const position: Position = {
        symbol: pos.symbol,
        quantity: parseInt(pos.qty, 10),
        entryPrice: new Decimal(pos.avg_entry_price),
        currentPrice: new Decimal(pos.current_price),
        pnl: new Decimal(pos.unrealized_gain),
        pnlPercent: parseFloat(pos.unrealized_gain_pct),
        stopLoss: new Decimal(0),
        takeProfit: new Decimal(0),
        entryTime: new Date(),
        strategy: 'Unknown'
      };

      reply.send({
        success: true,
        data: position
      });
    } catch (error) {
      logger.error(`Position fetch failed:`, error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * DELETE /api/positions/:symbol - Close position
   */
  app.delete<{
    Params: { symbol: string };
    Reply: { success: boolean; message?: string; error?: string };
  }>('/api/positions/:symbol', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { symbol } = request.params as { symbol: string };
      logger.info(`Closing position for ${symbol}`);

      await broker.closePosition(symbol);

      reply.send({
        success: true,
        message: `Position for ${symbol} closed`
      });
    } catch (error) {
      logger.error(`Position close failed:`, error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export default positionsRoutes;
