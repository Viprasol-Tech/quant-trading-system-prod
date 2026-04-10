"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsRoutes = wsRoutes;
const logger_1 = require("../../config/logger");
const wsManager_1 = require("../../services/wsManager");
const IBKRClient_1 = __importDefault(require("../../broker/IBKRClient"));
async function getSnapshotData() {
    try {
        const broker = IBKRClient_1.default;
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
                positions: positions.map((pos) => ({
                    symbol: pos.symbol,
                    qty: pos.qty.toString(),
                    avg_entry_price: pos.avg_entry_price?.toString(),
                    current_price: pos.current_price?.toString(),
                    market_value: pos.market_value?.toString() || '0',
                    unrealized_pl: pos.unrealized_gain?.toString() || '0',
                    unrealized_plpc: pos.unrealized_gain_pct?.toString() || '0'
                })),
                orders: orders.map((order) => ({
                    id: order.order_id,
                    symbol: order.symbol,
                    qty: order.qty?.toString() || '0',
                    side: order.side,
                    status: order.status,
                    created_at: order.created_at
                }))
            }
        };
    }
    catch (error) {
        logger_1.logger.error('Failed to get snapshot data:', error);
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
async function wsRoutes(app) {
    /**
     * GET /ws - WebSocket upgrade endpoint
     */
    app.get('/ws', { websocket: true }, async (connection) => {
        const socket = connection.socket;
        logger_1.logger.info('WebSocket client connected');
        wsManager_1.wsManager.addClient(socket);
        try {
            // Send initial snapshot
            const snapshot = await getSnapshotData();
            socket.send(JSON.stringify(snapshot), (err) => {
                if (err) {
                    logger_1.logger.error('Failed to send initial snapshot:', err);
                }
                else {
                    logger_1.logger.info('Initial snapshot sent to client');
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error sending initial snapshot:', error);
        }
        // Handle incoming messages (if any)
        socket.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                logger_1.logger.debug('Received message from client:', message);
            }
            catch (error) {
                logger_1.logger.error('Invalid message format:', error);
            }
        });
        // Handle client disconnect
        socket.on('close', () => {
            logger_1.logger.info('WebSocket client disconnected');
            wsManager_1.wsManager.removeClient(socket);
        });
        socket.on('error', (error) => {
            logger_1.logger.error('WebSocket error:', error);
            wsManager_1.wsManager.removeClient(socket);
        });
    });
    /**
     * POST /api/ws-update - Receive updates from Python service and broadcast
     */
    app.post('/api/ws-update', async (request, reply) => {
        try {
            const payload = request.body;
            logger_1.logger.debug('Received WS update from Python service', {
                type: payload.type,
                timestamp: payload.timestamp
            });
            // Broadcast to all connected clients
            wsManager_1.wsManager.broadcast(payload);
            reply.send({
                success: true,
                clients: wsManager_1.wsManager.getClientCount()
            });
        }
        catch (error) {
            logger_1.logger.error('WS update failed:', error);
            reply.status(400).send({
                success: false,
                clients: 0
            });
        }
    });
}
exports.default = wsRoutes;
//# sourceMappingURL=ws.js.map