"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataRoutes = dataRoutes;
const logger_1 = require("../../config/logger");
const MassiveAPIClient_1 = require("../../data/MassiveAPIClient");
const DataPreprocessor_1 = require("../../data/DataPreprocessor");
async function dataRoutes(app) {
    const massive = new MassiveAPIClient_1.MassiveAPIClient();
    /**
     * GET /api/data/bars - Get OHLCV bars
     */
    app.get('/api/data/bars', async (request, reply) => {
        try {
            const { symbol, from, to, timeframe = 'day' } = request.query;
            if (!symbol || !from || !to) {
                return reply.status(400).send({
                    success: false,
                    error: 'symbol, from, and to are required'
                });
            }
            logger_1.logger.info(`Fetching ${timeframe} bars for ${symbol} from ${from} to ${to}`);
            let bars = [];
            if (timeframe === 'day') {
                bars = await massive.getDailyBars(symbol, from, to);
            }
            else if (timeframe === 'hour') {
                bars = await massive.getHourlyBars(symbol, from, to);
            }
            else if (timeframe === 'week') {
                bars = await massive.getAggregates(symbol, 1, 'week', from, to);
            }
            // Validate data
            const validation = DataPreprocessor_1.DataPreprocessor.validateData(bars);
            if (!validation.valid) {
                logger_1.logger.warn(`Data validation issues for ${symbol}:`, validation.issues);
            }
            reply.send({
                success: true,
                data: bars,
                count: bars.length
            });
        }
        catch (error) {
            logger_1.logger.error('Bars fetch failed:', error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * GET /api/data/multitimeframe - Get multi-timeframe data
     */
    app.get('/api/data/multitimeframe', async (request, reply) => {
        try {
            const { symbol, from, to } = request.query;
            if (!symbol || !from || !to) {
                return reply.status(400).send({
                    success: false,
                    error: 'symbol, from, and to are required'
                });
            }
            logger_1.logger.info(`Fetching multi-timeframe data for ${symbol}`);
            // Fetch daily data
            const dailyBars = await massive.getDailyBars(symbol, from, to);
            if (dailyBars.length === 0) {
                return reply.status(404).send({
                    success: false,
                    error: `No data found for ${symbol}`
                });
            }
            // Resample to weekly and monthly
            const weeklyBars = DataPreprocessor_1.DataPreprocessor.dailyToWeekly(dailyBars);
            const monthlyBars = DataPreprocessor_1.DataPreprocessor.dailyToMonthly(dailyBars);
            // Try to fetch hourly data if available
            let fourHourBars = [];
            try {
                fourHourBars = await massive.getAggregates(symbol, 4, 'hour', from, to);
            }
            catch (error) {
                logger_1.logger.warn(`Could not fetch 4-hour data for ${symbol}`);
            }
            const multiTimeframeData = {
                daily: dailyBars,
                weekly: weeklyBars,
                monthly: monthlyBars,
                fourHour: fourHourBars.length > 0 ? fourHourBars : undefined
            };
            reply.send({
                success: true,
                data: multiTimeframeData
            });
        }
        catch (error) {
            logger_1.logger.error('Multi-timeframe data fetch failed:', error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * GET /api/data/connection-test - Test Massive API connection
     */
    app.get('/api/data/connection-test', async (request, reply) => {
        try {
            logger_1.logger.info('Testing Massive API connection');
            const isConnected = await massive.testConnection();
            if (isConnected) {
                reply.send({
                    success: true,
                    message: 'Massive API connection successful'
                });
            }
            else {
                reply.status(503).send({
                    success: false,
                    error: 'Massive API connection test failed'
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Connection test failed:', error);
            reply.status(503).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * GET /api/data/cache-stats - Get cache statistics
     */
    app.get('/api/data/cache-stats', async (request, reply) => {
        try {
            const cacheSize = massive.getCacheSize();
            reply.send({
                success: true,
                data: { cacheSize }
            });
        }
        catch (error) {
            logger_1.logger.error('Cache stats fetch failed:', error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * GET /api/data/markets - Get available markets
     */
    app.get('/api/data/markets', async (request, reply) => {
        try {
            // Return Shariah-compliant asset universe
            const markets = [
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX',
                'GLD', 'SLV', 'SGOL', 'IAU', 'BAR', 'USO', 'BTC', 'ETH'
            ];
            reply.send({
                success: true,
                data: markets
            });
        }
        catch (error) {
            logger_1.logger.error('Markets fetch failed:', error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * GET /api/data/quotes/:symbol - Get latest quote for symbol
     */
    app.get('/api/data/quotes/:symbol', async (request, reply) => {
        try {
            const { symbol } = request.params;
            logger_1.logger.info(`Fetching latest quote for ${symbol}`);
            // Get latest daily data
            const today = new Date();
            const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            const bars = await massive.getDailyBars(symbol, thirtyDaysAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]);
            if (bars.length === 0) {
                return reply.status(404).send({
                    success: false,
                    error: `No data found for ${symbol}`
                });
            }
            const latestBar = bars[bars.length - 1];
            reply.send({
                success: true,
                data: {
                    symbol,
                    price: latestBar.close,
                    high: latestBar.high,
                    low: latestBar.low,
                    open: latestBar.open,
                    volume: latestBar.volume,
                    timestamp: latestBar.timestamp
                }
            });
        }
        catch (error) {
            logger_1.logger.error(`Quote fetch failed for symbol:`, error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
exports.default = dataRoutes;
//# sourceMappingURL=data.js.map