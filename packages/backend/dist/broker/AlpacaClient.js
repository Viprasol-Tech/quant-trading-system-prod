"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlpacaClient = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../config/logger");
const environment_1 = require("../config/environment");
class AlpacaClient {
    constructor(apiKey = environment_1.config.alpaca.apiKey, apiSecret = environment_1.config.alpaca.apiSecret) {
        this.baseUrl = environment_1.config.alpaca.baseUrl;
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            headers: {
                'APCA-API-KEY-ID': apiKey,
                'APCA-SECRET-KEY': apiSecret,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => response, (error) => {
            logger_1.logger.error('Alpaca API error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        });
    }
    /**
     * Get account information
     */
    async getAccount() {
        try {
            const response = await this.client.get('/v2/account');
            logger_1.logger.info('Account fetched successfully');
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get account:', error);
            throw error;
        }
    }
    /**
     * Get all open positions
     */
    async getPositions() {
        try {
            const response = await this.client.get('/v2/positions');
            logger_1.logger.info(`Retrieved ${response.data.length} positions`);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get positions:', error);
            throw error;
        }
    }
    /**
     * Get specific position by symbol
     */
    async getPosition(symbol) {
        try {
            const response = await this.client.get(`/v2/positions/${symbol}`);
            logger_1.logger.info(`Position retrieved for ${symbol}`);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get position for ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Submit a new order
     */
    async submitOrder(params) {
        try {
            const response = await this.client.post('/v2/orders', params);
            logger_1.logger.info(`Order submitted: ${params.symbol} ${params.side} ${params.qty || params.notional}`);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Order submission failed:', error);
            throw error;
        }
    }
    /**
     * Cancel an order by ID
     */
    async cancelOrder(orderId) {
        try {
            await this.client.delete(`/v2/orders/${orderId}`);
            logger_1.logger.info(`Order cancelled: ${orderId}`);
        }
        catch (error) {
            logger_1.logger.error('Order cancellation failed:', error);
            throw error;
        }
    }
    /**
     * Cancel all orders
     */
    async cancelAllOrders() {
        try {
            await this.client.delete('/v2/orders');
            logger_1.logger.info('All orders cancelled');
        }
        catch (error) {
            logger_1.logger.error('Cancel all orders failed:', error);
            throw error;
        }
    }
    /**
     * Get order by ID
     */
    async getOrder(orderId) {
        try {
            const response = await this.client.get(`/v2/orders/${orderId}`);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get order ${orderId}:`, error);
            throw error;
        }
    }
    /**
     * Get all orders
     */
    async getOrders(params) {
        try {
            const response = await this.client.get('/v2/orders', { params });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get orders:', error);
            throw error;
        }
    }
    /**
     * Close a position
     */
    async closePosition(symbol, qty) {
        try {
            const response = await this.client.delete(`/v2/positions/${symbol}`, {
                params: { qty }
            });
            logger_1.logger.info(`Position closed: ${symbol}`);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error(`Failed to close position ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Get account configuration
     */
    async getAccountConfig() {
        try {
            const response = await this.client.get('/v2/account/configurations');
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get account config:', error);
            throw error;
        }
    }
    /**
     * Get calendar (trading hours)
     */
    async getCalendar(params) {
        try {
            const response = await this.client.get('/v1/calendar', { params });
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get calendar:', error);
            throw error;
        }
    }
    /**
     * Get clock (market status)
     */
    async getClock() {
        try {
            const response = await this.client.get('/v1/clock');
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('Failed to get clock:', error);
            throw error;
        }
    }
}
exports.AlpacaClient = AlpacaClient;
exports.default = AlpacaClient;
//# sourceMappingURL=AlpacaClient.js.map