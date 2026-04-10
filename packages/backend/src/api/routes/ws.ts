import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebSocket } from 'ws';
import { logger } from '../../config/logger';
import { wsManager } from '../../services/wsManager';
import IBKRClient from '../../broker/IBKRClient';

interface WsUpdatePayload {
  type: string;
  timestamp: string;
  data: {
    portfolio?: {
      totalEquity?: string;
      cash?: string;
      buyingPower?: string;
      dayPnL?: string;
      unrealizedPnL?: string;
    };
    positions?: Array<{
      symbol: string;
      qty: string;
      avg_entry_price?: string;
      current_price?: string;
      market_value: string;
      unrealized_pl: string;
      unrealized_plpc: string;
    }>;
    orders?: Array<{
      id: string;
      symbol: string;
      qty: string;
      side: string;
      status: string;
      created_at: string;
    }>;
  };
}

async function getSnapshotData(): Promise<WsUpdatePayload> {
  try {
    const broker = IBKRClient;
    const account = await broker.getAccount();
    const positions = await broker.getPositions();
    const orders = await broker.getOrders({});

    return {
      type: 'portfolio_update',
      timestamp: new Date().toISOString(),
      data: {
        portfolio: {
          totalEquity: account.equity?.toString() || '0',
          cash: account.cash?.toString() || '0',
          buyingPower: account.buying_power?.toString() || '0',
          dayPnL: account.day_trading_buying_power?.toString() || '0',
          unrealizedPnL: account.gross_position_value?.toString() || '0'
        },
        positions: positions.map((pos: any) => ({
          symbol: pos.symbol,
          qty: pos.qty.toString(),
          avg_entry_price: pos.avg_entry_price?.toString(),
          current_price: pos.current_price?.toString(),
          market_value: pos.market_value?.toString() || '0',
          unrealized_pl: pos.unrealized_gain?.toString() || '0',
          unrealized_plpc: pos.unrealized_gain_pct?.toString() || '0'
        })),
        orders: orders.map((order: any) => ({
          id: order.order_id,
          symbol: order.symbol,
          qty: order.qty?.toString() || '0',
          side: order.side,
          status: order.status,
          created_at: order.created_at
        }))
      }
    };
  } catch (error) {
    logger.error('Failed to get snapshot data:', error);
    // Return empty snapshot on error
    return {
      type: 'portfolio_update',
      timestamp: new Date().toISOString(),
      data: {
        portfolio: {
          totalEquity: '0',
          cash: '0',
          buyingPower: '0',
          dayPnL: '0',
          unrealizedPnL: '0'
        },
        positions: [],
        orders: []
      }
    };
  }
}

export async function wsRoutes(app: FastifyInstance) {
  /**
   * GET /ws - WebSocket upgrade endpoint
   */
  app.get<{ Reply: void }>(
    '/ws',
    { websocket: true },
    async (connection: any) => {
      const socket = connection.socket as WebSocket;

      logger.info('WebSocket client connected');
      wsManager.addClient(socket);

      try {
        // Send initial snapshot
        const snapshot = await getSnapshotData();
        socket.send(JSON.stringify(snapshot), (err) => {
          if (err) {
            logger.error('Failed to send initial snapshot:', err);
          } else {
            logger.info('Initial snapshot sent to client');
          }
        });
      } catch (error) {
        logger.error('Error sending initial snapshot:', error);
      }

      // Handle incoming messages (if any)
      socket.on('message', (data: any) => {
        try {
          const message = JSON.parse(data.toString());
          logger.debug('Received message from client:', message);
        } catch (error) {
          logger.error('Invalid message format:', error);
        }
      });

      // Handle client disconnect
      socket.on('close', () => {
        logger.info('WebSocket client disconnected');
        wsManager.removeClient(socket);
      });

      socket.on('error', (error: Error) => {
        logger.error('WebSocket error:', error);
        wsManager.removeClient(socket);
      });
    }
  );

  /**
   * POST /api/ws-update - Receive updates from Python service and broadcast
   */
  app.post<{
    Body: WsUpdatePayload;
    Reply: { success: boolean; clients: number };
  }>('/api/ws-update', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = request.body as WsUpdatePayload;

      logger.debug('Received WS update from Python service', {
        type: payload.type,
        timestamp: payload.timestamp
      });

      // Broadcast to all connected clients
      wsManager.broadcast(payload);

      reply.send({
        success: true,
        clients: wsManager.getClientCount()
      });
    } catch (error) {
      logger.error('WS update failed:', error);
      reply.status(400).send({
        success: false,
        clients: 0
      });
    }
  });
}

export default wsRoutes;
