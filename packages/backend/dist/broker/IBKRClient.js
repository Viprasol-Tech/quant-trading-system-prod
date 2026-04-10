"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IBKRClient = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
const logger_1 = require("../config/logger");
const environment_1 = require("../config/environment");
const axios_1 = __importDefault(require("axios"));
/**
 * IBKR Gateway Client
 * Connects to IBKR Gateway via socket and provides REST-like interface
 *
 * Default ports:
 * - Paper trading: 4002
 * - Live trading: 4001
 */
class IBKRClient {
    constructor(host = environment_1.config.ibkr?.gatewayHost || '127.0.0.1', port = environment_1.config.ibkr?.gatewayPort || 4002, clientId = 1) {
        this.connected = false;
        this.accountId = null;
        this.orderIdCounter = 1;
        this.orders = new Map();
        this.positions = new Map();
        this.lastUpdate = 0;
        this.cache = new Map();
        this.cacheTTL = 5000; // 5 seconds
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.gatewayHost = host;
        this.gatewayPort = port;
        this.clientId = clientId;
        logger_1.logger.info(`IBKRClient initialized: ${host}:${port} (clientId: ${clientId})`);
    }
    /**
     * Connect to IBKR Gateway
     */
    async connect() {
        try {
            logger_1.logger.info(`Connecting to IBKR Gateway at ${this.gatewayHost}:${this.gatewayPort}`);
            // Test connection via health endpoint
            const healthUrl = `http://${this.gatewayHost}:${this.gatewayPort}/health`;
            const response = await axios_1.default.get(healthUrl, { timeout: 5000 });
            if (response.status === 200) {
                this.connected = true;
                this.reconnectAttempts = 0;
                logger_1.logger.info('Connected to IBKR Gateway successfully');
            }
            else {
                throw new Error(`Gateway health check failed: ${response.status}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to connect to IBKR Gateway:`, error);
            // Exponential backoff reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                const waitTime = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
                logger_1.logger.info(`Retrying in ${waitTime}ms...`);
                this.reconnectAttempts++;
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                return this.connect();
            }
            throw new Error(`Failed to connect to IBKR Gateway after ${this.maxReconnectAttempts} attempts`);
        }
    }
    /**
     * Disconnect from IBKR Gateway
     */
    async disconnect() {
        this.connected = false;
        logger_1.logger.info('Disconnected from IBKR Gateway');
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
    /**
     * Get account information
     */
    async getAccount() {
        this.ensureConnected();
        const cacheKey = 'account';
        const cached = this.getCachedData(cacheKey);
        if (cached)
            return cached;
        try {
            logger_1.logger.debug('Fetching account information');
            // Mock implementation - replace with actual IBKR API call
            const account = {
                account_id: 'DU123456',
                account_type: 'INDIVIDUAL',
                status: 'Active',
                currency: 'USD',
                buying_power: new decimal_js_1.default(100000).toString(),
                cash: new decimal_js_1.default(50000).toString(),
                portfolio_value: new decimal_js_1.default(150000).toString(),
                equity: new decimal_js_1.default(150000).toString(),
                long_market_value: new decimal_js_1.default(100000).toString(),
                short_market_value: new decimal_js_1.default(0).toString(),
                multiplier: '1',
                shorting_enabled: false,
                day_trading_buying_power: new decimal_js_1.default(100000).toString(),
                net_liquidation_value: new decimal_js_1.default(150000).toString(),
                gross_position_value: new decimal_js_1.default(100000).toString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                daytrade_count: 0,
                margin_requirement: new decimal_js_1.default(0).toString(),
                maintenance_excess: new decimal_js_1.default(100000).toString(),
                available_funds: new decimal_js_1.default(100000).toString(),
            };
            this.cacheData(cacheKey, account);
            return account;
        }
        catch (error) {
            logger_1.logger.error('Error fetching account:', error);
            throw error;
        }
    }
    /**
     * Get all positions
     */
    async getPositions() {
        this.ensureConnected();
        const cacheKey = 'positions';
        const cached = this.getCachedData(cacheKey);
        if (cached)
            return cached;
        try {
            logger_1.logger.debug('Fetching all positions');
            // Mock implementation - replace with actual IBKR API call
            const positions = [];
            this.cacheData(cacheKey, positions);
            return positions;
        }
        catch (error) {
            logger_1.logger.error('Error fetching positions:', error);
            throw error;
        }
    }
    /**
     * Get specific position
     */
    async getPosition(symbol) {
        this.ensureConnected();
        try {
            logger_1.logger.debug(`Fetching position for ${symbol}`);
            const positions = await this.getPositions();
            return positions.find((p) => p.symbol === symbol) || null;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching position for ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Submit order
     */
    async submitOrder(params) {
        this.ensureConnected();
        try {
            logger_1.logger.info(`Submitting order: ${params.side} ${params.qty} ${params.symbol}@${params.order_type}`);
            const orderId = `${this.orderIdCounter++}`;
            const clientOrderId = params.client_order_id || `order-${Date.now()}`;
            const order = {
                order_id: orderId,
                client_order_id: clientOrderId,
                symbol: params.symbol.toUpperCase(),
                qty: new decimal_js_1.default(params.qty).toString(),
                filled_qty: '0',
                avg_filled_price: '',
                order_type: params.order_type.toUpperCase(),
                side: params.side.toUpperCase(),
                status: 'Submitted',
                time_in_force: (params.time_in_force || 'day').toUpperCase(),
                limit_price: params.limit_price ? new decimal_js_1.default(params.limit_price).toString() : undefined,
                stop_price: params.stop_price ? new decimal_js_1.default(params.stop_price).toString() : undefined,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                submitted_at: new Date().toISOString(),
            };
            this.orders.set(orderId, order);
            logger_1.logger.info(`Order submitted: ${orderId}`);
            return order;
        }
        catch (error) {
            logger_1.logger.error('Error submitting order:', error);
            throw error;
        }
    }
    /**
     * Cancel specific order
     */
    async cancelOrder(orderId) {
        this.ensureConnected();
        try {
            logger_1.logger.info(`Canceling order: ${orderId}`);
            const order = this.orders.get(orderId);
            if (order) {
                order.status = 'Cancelled';
                order.canceled_at = new Date().toISOString();
                order.updated_at = new Date().toISOString();
            }
            logger_1.logger.info(`Order canceled: ${orderId}`);
        }
        catch (error) {
            logger_1.logger.error(`Error canceling order ${orderId}:`, error);
            throw error;
        }
    }
    /**
     * Cancel all orders
     */
    async cancelAllOrders() {
        this.ensureConnected();
        try {
            logger_1.logger.info('Canceling all orders');
            for (const [orderId, order] of this.orders) {
                if (order.status !== 'Filled' && order.status !== 'Cancelled') {
                    await this.cancelOrder(orderId);
                }
            }
            logger_1.logger.info('All orders canceled');
        }
        catch (error) {
            logger_1.logger.error('Error canceling all orders:', error);
            throw error;
        }
    }
    /**
     * Get order details
     */
    async getOrder(orderId) {
        this.ensureConnected();
        try {
            logger_1.logger.debug(`Fetching order: ${orderId}`);
            const order = this.orders.get(orderId);
            if (!order) {
                throw new Error(`Order not found: ${orderId}`);
            }
            return order;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching order ${orderId}:`, error);
            throw error;
        }
    }
    /**
     * Get orders with optional filtering
     */
    async getOrders(params) {
        this.ensureConnected();
        try {
            logger_1.logger.debug('Fetching orders');
            let orders = Array.from(this.orders.values());
            if (params?.status) {
                orders = orders.filter((o) => o.status === params.status);
            }
            if (params?.symbols) {
                const symbols = params.symbols.split(',');
                orders = orders.filter((o) => symbols.includes(o.symbol));
            }
            if (params?.limit) {
                orders = orders.slice(0, params.limit);
            }
            return orders;
        }
        catch (error) {
            logger_1.logger.error('Error fetching orders:', error);
            throw error;
        }
    }
    /**
     * Close position
     */
    async closePosition(symbol, qty) {
        this.ensureConnected();
        try {
            logger_1.logger.info(`Closing position: ${symbol}`);
            const position = await this.getPosition(symbol);
            if (!position) {
                throw new Error(`No position found for ${symbol}`);
            }
            const closeQty = qty || position.qty;
            const order = await this.submitOrder({
                symbol,
                qty: closeQty,
                side: position.side === 'long' ? 'sell' : 'buy',
                order_type: 'market',
            });
            logger_1.logger.info(`Position closed: ${symbol}`);
            return order;
        }
        catch (error) {
            logger_1.logger.error(`Error closing position ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Get account configuration
     */
    async getAccountConfig() {
        this.ensureConnected();
        try {
            logger_1.logger.debug('Fetching account configuration');
            return {
                dtbp_check: 'both',
                trade_blocked_reason: '',
                day_trading_buying_power_multiplier: 4,
                requirements: {
                    equity_multi: 2,
                    commodity_multiplier: 1,
                },
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching account config:', error);
            throw error;
        }
    }
    /**
     * Get market calendar
     */
    async getCalendar(params) {
        try {
            logger_1.logger.debug('Fetching market calendar');
            // Mock calendar data
            return [
                {
                    date: new Date().toISOString().split('T')[0],
                    open: '09:30',
                    close: '16:00',
                    session: 'regular',
                },
            ];
        }
        catch (error) {
            logger_1.logger.error('Error fetching calendar:', error);
            throw error;
        }
    }
    /**
     * Get market clock
     */
    async getClock() {
        try {
            logger_1.logger.debug('Fetching market clock');
            const now = new Date();
            const isMarketOpen = this.isMarketOpen(now);
            return {
                timestamp: now.toISOString(),
                is_open: isMarketOpen,
                next_open: new Date(now.getTime() + 86400000).toISOString(),
                next_close: new Date(now.getTime() + 86400000).toISOString(),
            };
        }
        catch (error) {
            logger_1.logger.error('Error fetching clock:', error);
            throw error;
        }
    }
    /**
     * Test connection to IBKR Gateway
     */
    async testConnection() {
        try {
            await this.connect();
            return this.isConnected();
        }
        catch {
            return false;
        }
    }
    /**
     * Private helper: Ensure connected
     */
    ensureConnected() {
        if (!this.connected) {
            throw new Error('Not connected to IBKR Gateway. Call connect() first.');
        }
    }
    /**
     * Private helper: Get cached data
     */
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            logger_1.logger.debug(`Cache hit: ${key}`);
            return cached.data;
        }
        return null;
    }
    /**
     * Private helper: Cache data
     */
    cacheData(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
    /**
     * Private helper: Check if market is open
     */
    isMarketOpen(date) {
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        // Market open 9:30-16:00 EST, Monday-Friday
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const isMarketHours = hour >= 9 && hour < 16;
        return isWeekday && isMarketHours;
    }
}
exports.IBKRClient = IBKRClient;
exports.default = new IBKRClient();
//# sourceMappingURL=IBKRClient.js.map