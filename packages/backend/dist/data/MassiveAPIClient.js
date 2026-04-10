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
    }
    /**
     * Fetch aggregated bars (OHLCV data)
     */
    async getAggregates(ticker, multiplier = 1, timespan = 'day', from, to) {
        const cacheKey = `${ticker}-${multiplier}-${timespan}-${from}-${to}`;
        // Check cache
        if (this.cache.has(cacheKey)) {
            logger_1.logger.debug(`Cache hit for ${cacheKey}`);
            return this.cache.get(cacheKey);
        }
        try {
            logger_1.logger.info(`Fetching ${ticker} ${multiplier}${timespan} bars from ${from} to ${to}`);
            const response = await this.client.get(`/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${from}/${to}`, {
                params: {
                    sort: 'asc',
                    limit: 50000
                }
            });
            if (response.data.status !== 'OK' || !response.data.results) {
                logger_1.logger.warn(`No data returned for ${ticker}`);
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
            // Cache result
            this.cache.set(cacheKey, ohlcv);
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
     */
    async getQuote(ticker) {
        try {
            const response = await this.client.get(`/v1/last/quote/${ticker}`);
            if (response.data.status === 'OK' && response.data.last) {
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
            logger_1.logger.error(`Failed to get quote for ${ticker}:`, error);
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
     * Get cache size
     */
    getCacheSize() {
        return this.cache.size;
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