"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataRoutes = dataRoutes;
const logger_1 = require("../../config/logger");
const MassiveAPIClient_1 = require("../../data/MassiveAPIClient");
const DataPreprocessor_1 = require("../../data/DataPreprocessor");
const PythonServiceClient_1 = require("../../services/PythonServiceClient");
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
     * GET /api/data/quotes - Get latest LIVE quotes from IBKR Gateway
     * Uses IBKR positions for live market data (not delayed Polygon.io)
     */
    app.get('/api/data/quotes', async (request, reply) => {
        const startTime = Date.now();
        try {
            const { symbols: symbolsParam } = request.query;
            // Validate input
            if (!symbolsParam) {
                return reply.status(400).send({
                    success: false,
                    error: 'symbols query parameter required (comma-separated, e.g., ?symbols=AAPL,MSFT)'
                });
            }
            // Parse and validate symbols
            const symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase());
            // Rate limiting: max 20 symbols per request
            if (symbols.length > 20) {
                logger_1.logger.warn(`Bulk quotes request exceeds limit: ${symbols.length} symbols`);
                return reply.status(429).send({
                    success: false,
                    error: `Maximum 20 symbols per request. Requested: ${symbols.length}`
                });
            }
            // Validate symbol format
            const invalidSymbols = symbols.filter((s) => !/^[A-Z0-9]{1,5}$/.test(s));
            if (invalidSymbols.length > 0) {
                logger_1.logger.warn(`Invalid symbols provided: ${invalidSymbols.join(', ')}`);
                return reply.status(400).send({
                    success: false,
                    error: `Invalid symbols: ${invalidSymbols.join(', ')}`
                });
            }
            logger_1.logger.info(`Bulk quotes request for ${symbols.length} symbols from IBKR: ${symbols.join(', ')}`);
            // Get live positions from IBKR via Python service
            let ibkrPositions = [];
            let ibkrConnected = false;
            try {
                ibkrPositions = await PythonServiceClient_1.pythonService.getPositions();
                ibkrConnected = ibkrPositions.length > 0 || await PythonServiceClient_1.pythonService.isConnected();
                logger_1.logger.info(`IBKR: Retrieved ${ibkrPositions.length} live positions`);
            }
            catch (error) {
                logger_1.logger.warn('IBKR: Failed to get positions, falling back to Polygon.io', error);
                ibkrConnected = false;
            }
            // Create map of IBKR positions for quick lookup
            const ibkrMap = new Map(ibkrPositions.map((pos) => [pos.symbol, pos]));
            // Fetch quotes from available sources
            const quotePromises = symbols.map((symbol) => Promise.race([
                (async () => {
                    try {
                        // PRIMARY: Try to get live data from IBKR positions
                        if (ibkrConnected && ibkrMap.has(symbol)) {
                            const position = ibkrMap.get(symbol);
                            const currentPrice = parseFloat(position.current_price || position.market_value);
                            logger_1.logger.info(`IBKR LIVE: ${symbol} = $${currentPrice}`);
                            return {
                                symbol,
                                bid: currentPrice,
                                ask: currentPrice,
                                last: currentPrice,
                                volume: 0, // IBKR doesn't provide volume in positions
                                high: currentPrice,
                                low: currentPrice,
                                open: currentPrice,
                                close: currentPrice,
                                change: 0,
                                changePercent: 0,
                                timestamp: new Date().toISOString(),
                                source: 'IBKR'
                            };
                        }
                        // FALLBACK: Use Polygon.io for symbols not in IBKR portfolio
                        logger_1.logger.info(`Falling back to Polygon.io for ${symbol} (not in IBKR positions)`);
                        const today = new Date();
                        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                        const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
                        const toDate = today.toISOString().split('T')[0];
                        const quote = await massive.getQuote(symbol);
                        const bars = await massive.getDailyBars(symbol, fromDate, toDate);
                        if (!bars || bars.length === 0) {
                            logger_1.logger.warn(`No Polygon data available for ${symbol}`);
                            return { symbol, error: 'No data available' };
                        }
                        const latestBar = bars[bars.length - 1];
                        const previousBar = bars.length > 1 ? bars[bars.length - 2] : null;
                        const change = latestBar.close - (previousBar?.close || latestBar.open);
                        const changePercent = previousBar
                            ? (change / previousBar.close) * 100
                            : (change / latestBar.open) * 100;
                        return {
                            symbol,
                            bid: quote?.bid || latestBar.close,
                            ask: quote?.ask || latestBar.close,
                            last: quote?.mid || latestBar.close,
                            volume: latestBar.volume,
                            high: latestBar.high,
                            low: latestBar.low,
                            open: latestBar.open,
                            close: latestBar.close,
                            change: parseFloat(change.toFixed(2)),
                            changePercent: parseFloat(changePercent.toFixed(2)),
                            timestamp: new Date(latestBar.timestamp).toISOString(),
                            source: 'POLYGON'
                        };
                    }
                    catch (error) {
                        logger_1.logger.error(`Failed to fetch quote for ${symbol}:`, error);
                        return { symbol, error: error instanceof Error ? error.message : 'Unknown error' };
                    }
                })(),
                new Promise((resolve) => setTimeout(() => resolve({ symbol, error: 'Request timeout' }), 5000))
            ]));
            const results = await Promise.all(quotePromises);
            const endTime = Date.now();
            const successfulQuotes = results.filter((r) => !r.error);
            const failedQuotes = results.filter((r) => r.error);
            const ibkrQuotes = successfulQuotes.filter((r) => r.source === 'IBKR');
            const polygonQuotes = successfulQuotes.filter((r) => r.source === 'POLYGON');
            logger_1.logger.info(`Bulk quotes completed in ${endTime - startTime}ms`, {
                requested: symbols.length,
                successful: successfulQuotes.length,
                fromIBKR: ibkrQuotes.length,
                fromPolygon: polygonQuotes.length,
                failed: failedQuotes.length
            });
            if (failedQuotes.length > 0) {
                logger_1.logger.warn(`Failed to fetch quotes for: ${failedQuotes.map((q) => q.symbol).join(', ')}`);
            }
            if (successfulQuotes.length === 0) {
                return reply.status(503).send({
                    success: false,
                    error: `Failed to fetch quotes for all symbols: ${failedQuotes
                        .map((q) => `${q.symbol}(${q.error})`)
                        .join(', ')}`
                });
            }
            reply.send({
                success: true,
                data: successfulQuotes,
                count: successfulQuotes.length,
                source: `${ibkrQuotes.length} from IBKR LIVE, ${polygonQuotes.length} from Polygon`,
                error: failedQuotes.length > 0 ? `${failedQuotes.length} symbols failed` : undefined
            });
        }
        catch (error) {
            logger_1.logger.error('Bulk quotes fetch failed:', error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    /**
     * GET /api/data/quotes/:symbol - Get latest quote for single symbol
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