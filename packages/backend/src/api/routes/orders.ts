import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../config/logger';
import { pythonService } from '../../services/PythonServiceClient';

export async function ordersRoutes(app: FastifyInstance) {

  /**
   * GET /api/orders - Get all orders - REAL DATA from IBKR
   */
  app.get('/api/orders', async (request: FastifyRequest<{
    Querystring: { status?: string; limit?: number }
  }>, reply: FastifyReply) => {
    try {
      const { status, limit = 50 } = request.query as any;

      logger.info(`Fetching orders (status: ${status || 'all'}, limit: ${limit})`);

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

      let orders = await pythonService.getOrders();

      // Filter by status if specified
      if (status && status !== 'all') {
        orders = orders.filter(o => o.status.toLowerCase() === status.toLowerCase());
      }

      // Apply limit
      orders = orders.slice(0, limit);

      return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          orders: orders.map(order => ({
            id: order.order_id,
            symbol: order.symbol,
            qty: order.qty,
            filledQty: order.filled_qty,
            side: order.side,
            type: order.order_type,
            status: order.status,
            limitPrice: order.limit_price,
            stopPrice: order.stop_price,
            createdAt: order.created_at
          })),
          count: orders.length
        }
      });
    } catch (error: any) {
      logger.error('Orders fetch failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ORDERS_FETCH_FAILED',
          message: error.message
        }
      });
    }
  });

  /**
   * GET /api/orders/:orderId - Get specific order - REAL DATA
   */
  app.get('/api/orders/:orderId', async (request: FastifyRequest<{
    Params: { orderId: string }
  }>, reply: FastifyReply) => {
    try {
      const { orderId } = request.params;

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

      const orders = await pythonService.getOrders();
      const order = orders.find(o => o.order_id === orderId);

      if (!order) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: `Order ${orderId} not found`
          }
        });
      }

      return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          id: order.order_id,
          symbol: order.symbol,
          qty: order.qty,
          filledQty: order.filled_qty,
          side: order.side,
          type: order.order_type,
          status: order.status,
          limitPrice: order.limit_price,
          stopPrice: order.stop_price,
          createdAt: order.created_at
        }
      });
    } catch (error: any) {
      logger.error('Order fetch failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ORDER_FETCH_FAILED',
          message: error.message
        }
      });
    }
  });

  /**
   * POST /api/orders - Submit new order - REAL ORDER to IBKR
   */
  app.post('/api/orders', async (request: FastifyRequest<{
    Body: {
      symbol: string;
      quantity: number;
      side: 'BUY' | 'SELL';
      orderType: 'MKT' | 'LMT' | 'STP';
      limitPrice?: number;
      stopPrice?: number;
    }
  }>, reply: FastifyReply) => {
    try {
      const { symbol, quantity, side, orderType, limitPrice, stopPrice } = request.body;

      logger.info(`Submitting order: ${side} ${quantity} ${symbol} @ ${orderType}`);

      const isConnected = await pythonService.isConnected();
      if (!isConnected) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'IBKR_DISCONNECTED',
            message: 'Not connected to IBKR. Cannot submit orders.'
          }
        });
      }

      // Validate
      if (!symbol || !quantity || !side || !orderType) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_ORDER',
            message: 'Missing required fields: symbol, quantity, side, orderType'
          }
        });
      }

      if (orderType === 'LMT' && !limitPrice) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_ORDER',
            message: 'Limit price required for LMT orders'
          }
        });
      }

      // Submit to IBKR
      const order = await pythonService.submitOrder({
        symbol: symbol.toUpperCase(),
        quantity,
        order_type: orderType,
        price: limitPrice
      });

      if (!order) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'ORDER_SUBMISSION_FAILED',
            message: 'Failed to submit order to IBKR'
          }
        });
      }

      logger.info(`Order submitted: ${order.order_id}`);

      return reply.status(201).send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          orderId: order.order_id,
          symbol: symbol.toUpperCase(),
          quantity,
          side,
          type: orderType,
          status: order.status,
          message: 'Order submitted to IBKR'
        }
      });
    } catch (error: any) {
      logger.error('Order submission failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'ORDER_SUBMISSION_FAILED',
          message: error.message
        }
      });
    }
  });

  /**
   * DELETE /api/orders/:orderId - Cancel order - REAL CANCEL to IBKR
   */
  app.delete('/api/orders/:orderId', async (request: FastifyRequest<{
    Params: { orderId: string }
  }>, reply: FastifyReply) => {
    try {
      const { orderId } = request.params;

      logger.info(`Cancelling order: ${orderId}`);

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

      const success = await pythonService.cancelOrder(orderId);

      if (!success) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'CANCEL_FAILED',
            message: `Failed to cancel order ${orderId}`
          }
        });
      }

      return reply.send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          orderId,
          status: 'CANCELLED',
          message: 'Order cancellation submitted'
        }
      });
    } catch (error: any) {
      logger.error('Order cancellation failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CANCEL_FAILED',
          message: error.message
        }
      });
    }
  });
}

export default ordersRoutes;
