"use strict";
/**
 * Python Service Client
 * Connects to Python service (port 6105) for REAL IBKR data
 * NO MOCK DATA - everything from actual IBKR connection
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../config/logger");
class PythonServiceClient {
    constructor() {
        this.connected = false;
        this.lastHealthCheck = 0;
        this.healthCheckInterval = 10000; // 10 seconds
        // Python service runs on port 6105
        this.baseUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:6105';
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Response interceptor for logging
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug(`Python Service: ${response.config.method?.toUpperCase()} ${response.config.url} -> ${response.status}`);
            return response;
        }, (error) => {
            logger_1.logger.error(`Python Service Error: ${error.message}`);
            throw error;
        });
        logger_1.logger.info(`PythonServiceClient initialized: ${this.baseUrl}`);
    }
    /**
     * Check if Python service and IBKR are connected
     */
    async checkHealth() {
        try {
            const response = await this.client.get('/health');
            this.connected = response.data.ibkr_connected;
            this.lastHealthCheck = Date.now();
            return response.data;
        }
        catch (error) {
            this.connected = false;
            logger_1.logger.error('Python service health check failed:', error);
            return {
                status: 'unhealthy',
                ibkr_connected: false,
                timestamp: new Date().toISOString(),
            };
        }
    }
    /**
     * Get connection status (cached)
     */
    async isConnected() {
        // Re-check if stale
        if (Date.now() - this.lastHealthCheck > this.healthCheckInterval) {
            await this.checkHealth();
        }
        return this.connected;
    }
    /**
     * Get account summary - REAL DATA
     */
    async getAccountSummary() {
        try {
            const response = await this.client.get('/account/summary');
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get account summary:', error);
            return null;
        }
    }
    /**
     * Get all positions - REAL DATA
     */
    async getPositions() {
        try {
            const response = await this.client.get('/positions');
            return response.data || [];
        }
        catch (error) {
            logger_1.logger.error('Failed to get positions:', error);
            return [];
        }
    }
    /**
     * Get open orders - REAL DATA
     */
    async getOrders() {
        try {
            const response = await this.client.get('/orders');
            return response.data || [];
        }
        catch (error) {
            logger_1.logger.error('Failed to get orders:', error);
            return [];
        }
    }
    /**
     * Submit order - REAL EXECUTION
     */
    async submitOrder(params) {
        try {
            const response = await this.client.post('/orders', params);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to submit order:', error);
            return null;
        }
    }
    /**
     * Cancel order
     */
    async cancelOrder(orderId) {
        try {
            await this.client.delete(`/orders/${orderId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to cancel order:', error);
            return false;
        }
    }
    /**
     * Get market data for symbol - REAL DATA
     */
    async getMarketData(symbol) {
        try {
            const response = await this.client.get(`/market/${symbol}`);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get market data for ${symbol}:`, error);
            return null;
        }
    }
    /**
     * Get historical data
     */
    async getHistoricalData(symbol, barSize = '1 day', duration = '1 M') {
        try {
            const response = await this.client.get(`/historical/${symbol}`, {
                params: { bar_size: barSize, duration },
            });
            return response.data || [];
        }
        catch (error) {
            logger_1.logger.error(`Failed to get historical data for ${symbol}:`, error);
            return [];
        }
    }
}
// Singleton instance
exports.pythonService = new PythonServiceClient();
exports.default = exports.pythonService;
//# sourceMappingURL=PythonServiceClient.js.map