"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../config/logger");
const environment_1 = require("../config/environment");
class DataProvider {
    constructor() {
        this.cache = new Map();
        this.alpacaClient = axios_1.default.create({
            baseURL: environment_1.config.alpaca.dataUrl,
            headers: {
                'APCA-API-KEY-ID': environment_1.config.alpaca.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }
    /**
     * Fetch OHLCV data from Alpaca
     */
    async fetchOHLCV(symbol, start, end, timeframe = '1D') {
        const cacheKey = `${symbol}-${timeframe}-${start.toISOString()}-${end.toISOString()}`;
        // Check cache
        if (this.cache.has(cacheKey)) {
            logger_1.logger.debug(`Cache hit for ${cacheKey}`);
            return this.cache.get(cacheKey);
        }
        try {
            logger_1.logger.info(`Fetching ${symbol} OHLCV data from ${start.toDateString()} to ${end.toDateString()}`);
            const response = await this.alpacaClient.get(`/v1/bars`, {
                params: {
                    symbols: symbol,
                    timeframe,
                    start: start.toISOString().split('T')[0],
                    end: end.toISOString().split('T')[0],
                    limit: 10000,
                    adjustment: 'raw'
                }
            });
            const bars = response.data.bars?.[symbol] || [];
            const ohlcv = bars.map((bar) => ({
                timestamp: new Date(bar.t * 1000),
                open: bar.o,
                high: bar.h,
                low: bar.l,
                close: bar.c,
                volume: bar.v
            }));
            // Sort by timestamp ascending
            ohlcv.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            // Cache result
            this.cache.set(cacheKey, ohlcv);
            logger_1.logger.info(`Retrieved ${ohlcv.length} bars for ${symbol}`);
            return ohlcv;
        }
        catch (error) {
            logger_1.logger.error(`Failed to fetch OHLCV for ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Fetch multiple symbols in parallel
     */
    async fetchMultipleOHLCV(symbols, start, end, timeframe = '1D') {
        try {
            logger_1.logger.info(`Fetching ${symbols.length} symbols OHLCV data`);
            const results = new Map();
            // Fetch in batches to avoid rate limiting
            const batchSize = 10;
            for (let i = 0; i < symbols.length; i += batchSize) {
                const batch = symbols.slice(i, i + batchSize);
                const batchPromises = batch.map((symbol) => this.fetchOHLCV(symbol, start, end, timeframe)
                    .then((data) => ({ symbol, data }))
                    .catch((error) => {
                    logger_1.logger.warn(`Failed to fetch ${symbol}:`, error.message);
                    return { symbol, data: [] };
                }));
                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(({ symbol, data }) => {
                    results.set(symbol, data);
                });
                // Add delay between batches
                if (i + batchSize < symbols.length) {
                    await new Promise((resolve) => setTimeout(resolve, 200));
                }
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch multiple OHLCV:', error);
            throw error;
        }
    }
    /**
     * Clear cache for a specific symbol
     */
    clearCache(symbol, timeframe) {
        if (symbol && timeframe) {
            const keysToDelete = Array.from(this.cache.keys()).filter((key) => key.startsWith(`${symbol}-${timeframe}`));
            keysToDelete.forEach((key) => this.cache.delete(key));
            logger_1.logger.debug(`Cleared cache for ${symbol}-${timeframe}`);
        }
        else if (symbol) {
            const keysToDelete = Array.from(this.cache.keys()).filter((key) => key.startsWith(symbol));
            keysToDelete.forEach((key) => this.cache.delete(key));
            logger_1.logger.debug(`Cleared cache for ${symbol}`);
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
     * Validate OHLCV data
     */
    static validateData(data) {
        if (data.length === 0) {
            logger_1.logger.warn('Empty OHLCV data');
            return false;
        }
        for (const bar of data) {
            if (!bar.timestamp ||
                bar.open <= 0 ||
                bar.high <= 0 ||
                bar.low <= 0 ||
                bar.close <= 0 ||
                bar.volume < 0) {
                logger_1.logger.warn('Invalid OHLCV bar:', bar);
                return false;
            }
            if (bar.high < bar.low || bar.high < bar.open || bar.high < bar.close) {
                logger_1.logger.warn('High < Low/Open/Close:', bar);
                return false;
            }
            if (bar.low > bar.open || bar.low > bar.close) {
                logger_1.logger.warn('Low > Open/Close:', bar);
                return false;
            }
        }
        return true;
    }
}
exports.DataProvider = DataProvider;
exports.default = DataProvider;
//# sourceMappingURL=DataProvider.js.map