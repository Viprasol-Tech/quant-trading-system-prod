import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../config/logger';
import { pythonService } from '../../services/PythonServiceClient';

export async function positionsRoutes(app: FastifyInstance) {

  /**
   * GET /api/positions - Get all positions - REAL DATA from IBKR
   */
  app.get('/api/positions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('Fetching positions');

      const isConnected = await pythonService.isConnected();
      if (!isConnected) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'IBKR_DISCONNECTED',
            message: 'Not connected to IBKR'
          }
        });
      }

      const positions = await pythonService.getPositions();

      return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          positions: positions.map(pos => ({
            symbol: pos.symbol,
            qty: pos.qty,
            side: pos.side,
            avgEntryPrice: pos.avg_entry_price,
            currentPrice: pos.current_price,
            marketValue: pos.market_value,
            unrealizedPl: pos.unrealized_pl,
            unrealizedPlpc: pos.unrealized_plpc
          })),
          count: positions.length
        }
      });
    } catch (error: any) {
      logger.error('Positions fetch failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'POSITIONS_FETCH_FAILED',
          message: error.message
        }
      });
    }
  });

  /**
   * GET /api/positions/:symbol - Get position for specific symbol - REAL DATA
   */
  app.get('/api/positions/:symbol', async (request: FastifyRequest<{
    Params: { symbol: string }
  }>, reply: FastifyReply) => {
    try {
      const { symbol } = request.params;
      const upperSymbol = symbol.toUpperCase();

      const isConnected = await pythonService.isConnected();
      if (!isConnected) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'IBKR_DISCONNECTED',
            message: 'Not connected to IBKR'
          }
        });
      }

      const positions = await pythonService.getPositions();
      const position = positions.find(p => p.symbol.toUpperCase() === upperSymbol);

      if (!position) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'POSITION_NOT_FOUND',
            message: `No position found for ${upperSymbol}`
          }
        });
      }

      return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          symbol: position.symbol,
          qty: position.qty,
          side: position.side,
          avgEntryPrice: position.avg_entry_price,
          currentPrice: position.current_price,
          marketValue: position.market_value,
          unrealizedPl: position.unrealized_pl,
          unrealizedPlpc: position.unrealized_plpc
        }
      });
    } catch (error: any) {
      logger.error('Position fetch failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'POSITION_FETCH_FAILED',
          message: error.message
        }
      });
    }
  });

  /**
   * POST /api/positions/:symbol/close - Close a position - REAL ORDER to IBKR
   */
  app.post('/api/positions/:symbol/close', async (request: FastifyRequest<{
    Params: { symbol: string },
    Body: { quantity?: number }
  }>, reply: FastifyReply) => {
    try {
      const { symbol } = request.params;
      const { quantity } = request.body || {};
      const upperSymbol = symbol.toUpperCase();

      const isConnected = await pythonService.isConnected();
      if (!isConnected) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'IBKR_DISCONNECTED',
            message: 'Not connected to IBKR'
          }
        });
      }

      // Get current position
      const positions = await pythonService.getPositions();
      const position = positions.find(p => p.symbol.toUpperCase() === upperSymbol);

      if (!position) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'POSITION_NOT_FOUND',
            message: `No position found for ${upperSymbol}`
          }
        });
      }

      const posQty = parseInt(position.qty, 10);
      const closeQty = quantity || Math.abs(posQty);

      // Submit closing order (opposite side)
      const order = await pythonService.submitOrder({
        symbol: upperSymbol,
        quantity: closeQty,
        order_type: 'MKT'
      });

      if (!order) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'CLOSE_ORDER_FAILED',
            message: 'Failed to submit closing order'
          }
        });
      }

      return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          orderId: order.order_id,
          symbol: upperSymbol,
          action: 'CLOSE',
          quantity: closeQty,
          status: order.status,
          message: 'Position close order submitted'
        }
      });
    } catch (error: any) {
      logger.error('Position close failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CLOSE_FAILED',
          message: error.message
        }
      });
    }
  });
}

export default positionsRoutes;
