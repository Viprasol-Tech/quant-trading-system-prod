"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MassiveAPIClient = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../config/logger");
const environment_1 = require("../config/environment");
class MassiveAPIClient {
    constructor(apiKey = environment_1.config.massive.apiKey) {
        this.cache = new Map();
        this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.client = axios_1.default.create({
            baseURL: 'https://api.polygon.io',
            params: {
                apiKey
            },
            timeout: 30000
        });
        this.client.interceptors.response.use((response) => response, (error) => {
            logger_1.logger.error('Massive API error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw error;
        });
        // Periodic cache cleanup every 6 hours
        setInterval(() => this.cleanupExpiredCache(), 6 * 60 * 60 * 1000);
    }
    /**
     * Clean up expired cache entries
     */
    cleanupExpiredCache() {
        const now = Date.now();
        let deletedCount = 0;
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.CACHE_TTL) {
                this.cache.delete(key);
                deletedCount++;
            }
        }
        if (deletedCount > 0) {
            logger_1.logger.debug(`Cache cleanup: removed ${deletedCount} expired entries`);
        }
    }
    /**
     * Fetch aggregated bars (OHLCV data)
     */
    async getAggregates(ticker, multiplier = 1, timespan = 'day', from, to) {
        const cacheKey = `${ticker}-${multiplier}-${timespan}-${from}-${to}`;
        // Check cache (and validate TTL)
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            const age = Date.now() - cached.timestamp;
            if (age < this.CACHE_TTL) {
                logger_1.logger.debug(`Cache hit for ${cacheKey} (age: ${(age / 1000).toFixed(0)}s)`);
                return cached.data;
            }
            else {
                // Expired, remove from cache
                this.cache.delete(cacheKey);
                logger_1.logger.debug(`Cache expired for ${cacheKey}`);
            }
        }
        try {
            logger_1.logger.info(`Fetching ${ticker} ${multiplier}${timespan} bars from ${from} to ${to}`);
            const response = await this.client.get(`/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}`, {
                params: {
                    sort: 'asc',
                    limit: 50000
                }
            });
            // Accept both OK and DELAYED statuses - DELAYED means data is 15 minutes delayed but still valid
            const validStatuses = ['OK', 'DELAYED'];
            if (!validStatuses.includes(response.data.status) || !response.data.results) {
                logger_1.logger.warn(`No data returned for ${ticker} (status: ${response.data.status})`);
                return [];
            }
            const ohlcv = response.data.results.map((bar) => ({
                timestamp: new Date(bar.t),
                open: bar.o,
                high: bar.h,
                low: bar.l,
                close: bar.c,
                volume: bar.v
            }));
            // Cache result with timestamp
            this.cache.set(cacheKey, { data: ohlcv, timestamp: Date.now() });
            logger_1.logger.info(`Retrieved ${ohlcv.length} bars for ${ticker}`);
            return ohlcv;
        }
        catch (error) {
            logger_1.logger.error(`Failed to fetch aggregates for ${ticker}:`, error);
            throw error;
        }
    }
    /**
     * Get daily bars (convenience method)
     */
    async getDailyBars(ticker, from, to) {
        return this.getAggregates(ticker, 1, 'day', from, to);
    }
    /**
     * Get hourly bars
     */
    async getHourlyBars(ticker, from, to) {
        return this.getAggregates(ticker, 1, 'hour', from, to);
    }
    /**
     * Get multiple tickers in parallel
     */
    async getMultipleAggregates(tickers, multiplier = 1, timespan = 'day', from, to) {
        try {
            logger_1.logger.info(`Fetching ${tickers.length} tickers`);
            const results = new Map();
            // Fetch in batches to avoid rate limiting
            const batchSize = 5;
            for (let i = 0; i < tickers.length; i += batchSize) {
                const batch = tickers.slice(i, i + batchSize);
                const batchPromises = batch.map((ticker) => this.getAggregates(ticker, multiplier, timespan, from, to)
                    .then((data) => ({ ticker, data }))
                    .catch((error) => {
                    logger_1.logger.warn(`Failed to fetch ${ticker}:`, error.message);
                    return { ticker, data: [] };
                }));
                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(({ ticker, data }) => {
                    results.set(ticker, data);
                });
                // Add delay between batches to avoid rate limiting
                if (i + batchSize < tickers.length) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                }
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch multiple aggregates:', error);
            throw error;
        }
    }
    /**
     * Get last trade for a ticker
     */
    async getLastTrade(ticker) {
        try {
            const response = await this.client.get(`/v1/last/trade/${ticker}`);
            if (response.data.status === 'OK' && response.data.last) {
                return response.data.last.price;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get last trade for ${ticker}:`, error);
            return null;
        }
    }
    /**
     * Get quote for a ticker
     * Note: /v1/last/quote may return 404 on free tier - fallback to daily bars instead
     */
    async getQuote(ticker) {
        try {
            const response = await this.client.get(`/v1/last/quote/${ticker}`);
            // Accept both OK and DELAYED statuses
            const validStatuses = ['OK', 'DELAYED'];
            if (validStatuses.includes(response.data.status) && response.data.last) {
                const { bid, ask } = response.data.last;
                return {
                    bid,
                    ask,
                    mid: (bid + ask) / 2,
                    spread: ask - bid
                };
            }
            return null;
        }
        catch (error) {
            // /v1/last/quote returns 404 on free tier - this is expected
            if (error.response?.status === 404) {
                logger_1.logger.debug(`Quote endpoint not available for ${ticker} (free tier limitation)`);
            }
            else {
                logger_1.logger.error(`Failed to get quote for ${ticker}:`, error.message);
            }
            return null;
        }
    }
    /**
     * Clear cache
     */
    clearCache(ticker) {
        if (ticker) {
            const keysToDelete = Array.from(this.cache.keys()).filter((key) => key.startsWith(ticker));
            keysToDelete.forEach((key) => this.cache.delete(key));
            logger_1.logger.debug(`Cleared cache for ${ticker}`);
        }
        else {
            this.cache.clear();
            logger_1.logger.debug('Cleared all cache');
        }
    }
    /**
     * Get cache size and statistics
     */
    getCacheSize() {
        // Clean up expired entries first
        this.cleanupExpiredCache();
        return this.cache.size;
    }
    /**
     * Get detailed cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        const entries = Array.from(this.cache.entries())
            .map(([key, value]) => ({
            key,
            ageMs: now - value.timestamp,
            ageDays: ((now - value.timestamp) / (24 * 60 * 60 * 1000)).toFixed(1)
        }))
            .sort((a, b) => b.ageMs - a.ageMs);
        return {
            size: this.cache.size,
            entries
        };
    }
    /**
     * Test connection
     */
    async testConnection() {
        try {
            // Test with a date range that should have data
            const response = await this.client.get(`/v2/aggs/ticker/AAPL/range/1/day/2026-03-20/2026-03-31`);
            const isValid = response.data.status !== undefined && (response.data.results?.length ?? 0) > 0;
            logger_1.logger.info(`Massive API connection test: ${isValid ? 'SUCCESS' : 'FAILED'}`);
            return isValid;
        }
        catch (error) {
            logger_1.logger.error('Massive API connection test failed:', error instanceof Error ? error.message : error);
            return false;
        }
    }
}
exports.MassiveAPIClient = MassiveAPIClient;
exports.default = MassiveAPIClient;
//# sourceMappingURL=MassiveAPIClient.js.map