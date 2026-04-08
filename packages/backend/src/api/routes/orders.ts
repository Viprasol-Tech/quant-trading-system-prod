import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Decimal from 'decimal.js';
import { logger } from '../../config/logger';
import IBKRClient, { IBKROrder } from '../../broker/IBKRClient';
import { Order } from '../../types';

export async function ordersRoutes(app: FastifyInstance) {
  const broker = IBKRClient;

  /**
   * GET /api/orders - Get all orders
   */
  app.get<{
    Querystring: { status?: string; limit?: number };
    Reply: { success: boolean; data?: Order[]; error?: string };
  }>('/api/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { status = 'all', limit = 50 } = request.query as {
        status?: string;
        limit?: number;
      };

      logger.info(`Fetching orders with status: ${status}`);

      const ibkrOrders = await broker.getOrders({
        status: status === 'all' ? undefined : status,
        limit
      });

      const mapStatus = (ibkrStatus: string): 'pending' | 'filled' | 'rejected' | 'cancelled' => {
        const status = ibkrStatus.toLowerCase();
        if (status === 'filled') return 'filled';
        if (status === 'inactive' || status === 'cancelled') return 'cancelled';
        if (status === 'apicancelled') return 'cancelled';
        return 'pending';
      };

      const orders: Order[] = ibkrOrders.map((order: IBKROrder) => ({
        id: order.order_id,
        symbol: order.symbol,
        quantity: order.qty ? parseInt(order.qty, 10) : 0,
        side: order.side.toLowerCase() as 'buy' | 'sell',
        type: order.order_type.toLowerCase().includes('lmt') ? 'limit' : 'market',
        price: order.limit_price ? new Decimal(order.limit_price) : undefined,
        status: mapStatus(order.status),
        filledQuantity: parseInt(order.filled_qty, 10),
        filledPrice: order.avg_filled_price ? new Decimal(order.avg_filled_price) : undefined,
        timestamp: new Date(order.created_at)
      }));

      reply.send({
        success: true,
        data: orders
      });
    } catch (error) {
      logger.error('Orders fetch failed:', error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/orders/:orderId - Get specific order
   */
  app.get<{
    Params: { orderId: string };
    Reply: { success: boolean; data?: Order; error?: string };
  }>('/api/orders/:orderId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orderId } = request.params as { orderId: string };
      logger.info(`Fetching order: ${orderId}`);

      const ibkrOrder = await broker.getOrder(orderId);

      const mapStatus = (ibkrStatus: string): 'pending' | 'filled' | 'rejected' | 'cancelled' => {
        const status = ibkrStatus.toLowerCase();
        if (status === 'filled') return 'filled';
        if (status === 'inactive' || status === 'cancelled') return 'cancelled';
        if (status === 'apicancelled') return 'cancelled';
        return 'pending';
      };

      const order: Order = {
        id: ibkrOrder.order_id,
        symbol: ibkrOrder.symbol,
        quantity: ibkrOrder.qty ? parseInt(ibkrOrder.qty, 10) : 0,
        side: ibkrOrder.side.toLowerCase() as 'buy' | 'sell',
        type: ibkrOrder.order_type.toLowerCase().includes('lmt') ? 'limit' : 'market',
        price: ibkrOrder.limit_price ? new Decimal(ibkrOrder.limit_price) : undefined,
        status: mapStatus(ibkrOrder.status),
        filledQuantity: parseInt(ibkrOrder.filled_qty, 10),
        filledPrice: ibkrOrder.avg_filled_price
          ? new Decimal(ibkrOrder.avg_filled_price)
          : undefined,
        timestamp: new Date(ibkrOrder.created_at)
      };

      reply.send({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Order fetch failed:', error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/orders - Submit new order
   */
  app.post<{
    Body: {
      symbol: string;
      qty?: number;
      notional?: number;
      side: 'buy' | 'sell';
      type?: 'market' | 'limit';
      limit_price?: number;
      time_in_force?: 'day' | 'gtc';
    };
    Reply: { success: boolean; data?: Order; error?: string };
  }>('/api/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { symbol, qty, notional, side, type = 'market', limit_price, time_in_force = 'day' } =
        request.body as {
          symbol: string;
          qty?: number;
          notional?: number;
          side: 'buy' | 'sell';
          type?: 'market' | 'limit';
          limit_price?: number;
          time_in_force?: 'day' | 'gtc';
        };

      if (!qty && !notional) {
        return reply.status(400).send({
          success: false,
          error: 'Either qty or notional must be provided'
        });
      }

      logger.info(`Submitting order: ${side} ${qty || notional} ${symbol}`);

      const ibkrOrder = await broker.submitOrder({
        symbol,
        qty: qty || 100, // IBKR requires qty
        side: side as 'buy' | 'sell',
        order_type: type as 'market' | 'limit',
        limit_price,
        time_in_force: time_in_force as 'day' | 'gtc'
      });

      const mapStatus = (ibkrStatus: string): 'pending' | 'filled' | 'rejected' | 'cancelled' => {
        const status = ibkrStatus.toLowerCase();
        if (status === 'filled') return 'filled';
        if (status === 'inactive' || status === 'cancelled') return 'cancelled';
        if (status === 'apicancelled') return 'cancelled';
        return 'pending';
      };

      const order: Order = {
        id: ibkrOrder.order_id,
        symbol: ibkrOrder.symbol,
        quantity: ibkrOrder.qty ? parseInt(ibkrOrder.qty, 10) : 0,
        side: ibkrOrder.side.toLowerCase() as 'buy' | 'sell',
        type: ibkrOrder.order_type.toLowerCase().includes('lmt') ? 'limit' : 'market',
        price: ibkrOrder.limit_price ? new Decimal(ibkrOrder.limit_price) : undefined,
        status: mapStatus(ibkrOrder.status),
        filledQuantity: parseInt(ibkrOrder.filled_qty, 10),
        filledPrice: ibkrOrder.avg_filled_price
          ? new Decimal(ibkrOrder.avg_filled_price)
          : undefined,
        timestamp: new Date(ibkrOrder.created_at)
      };

      reply.status(201).send({
        success: true,
        data: order
      });
    } catch (error) {
      logger.error('Order submission failed:', error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * DELETE /api/orders/:orderId - Cancel order
   */
  app.delete<{
    Params: { orderId: string };
    Reply: { success: boolean; message?: string; error?: string };
  }>('/api/orders/:orderId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orderId } = request.params as { orderId: string };
      logger.info(`Cancelling order: ${orderId}`);

      await broker.cancelOrder(orderId);

      reply.send({
        success: true,
        message: `Order ${orderId} cancelled`
      });
    } catch (error) {
      logger.error('Order cancellation failed:', error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export default ordersRoutes;
