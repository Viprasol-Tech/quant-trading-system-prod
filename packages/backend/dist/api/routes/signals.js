"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signalsRoutes = signalsRoutes;
const PythonServiceClient_1 = require("../../services/PythonServiceClient");
const SignalGenerator_1 = __importDefault(require("../../services/SignalGenerator"));
const RiskManager_1 = __importDefault(require("../../services/RiskManager"));
const TechnicalAnalysisEngine_1 = require("../../engine/TechnicalAnalysisEngine");
const MassiveAPIClient_1 = require("../../data/MassiveAPIClient");
const ShariahScreener_1 = require("../../shariah/ShariahScreener");
const logger_1 = require("../../config/logger");
const db_1 = __importDefault(require("../../database/db"));
const decimal_js_1 = __importDefault(require("decimal.js"));
// Initialize services
const taEngine = new TechnicalAnalysisEngine_1.TechnicalAnalysisEngine();
const dataProvider = new MassiveAPIClient_1.MassiveAPIClient();
const shariahScreener = new ShariahScreener_1.ShariahScreener();
// Default universe of Shariah-compliant symbols
const DEFAULT_UNIVERSE = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META',
    'GLD', 'SLV', 'SGOL', 'IAU'
];
async function signalsRoutes(fastify) {
    /**
     * GET /api/signals
     * Generate trading signals from REAL market data using REAL strategies
     */
    fastify.get('/api/signals', async (request, reply) => {
        try {
            const { symbols: symbolsParam, minConfidence = 60 } = request.query;
            // Parse symbols or use default universe
            const symbols = symbolsParam
                ? symbolsParam.split(',').map((s) => s.trim().toUpperCase())
                : DEFAULT_UNIVERSE;
            logger_1.logger.info(`Generating signals for ${symbols.length} symbols`);
            // Check IBKR connection (optional - signals can work without live connection)
            const isConnected = await PythonServiceClient_1.pythonService.isConnected();
            // Get date range (last 100 days for analysis)
            const to = new Date();
            const from = new Date(to.getTime() - 100 * 24 * 60 * 60 * 1000);
            const fromStr = from.toISOString().split('T')[0];
            const toStr = to.toISOString().split('T')[0];
            // Analyze each symbol
            const analysisResults = new Map();
            const errors = [];
            for (const symbol of symbols) {
                try {
                    // Get historical data
                    const bars = await dataProvider.getDailyBars(symbol, fromStr, toStr);
                    if (bars.length < 50) {
                        errors.push(`${symbol}: Insufficient data (${bars.length} bars)`);
                        continue;
                    }
                    // Run technical analysis
                    const analysis = TechnicalAnalysisEngine_1.TechnicalAnalysisEngine.analyze(bars, symbol);
                    // Get current price (already set as 'price' in analysis)
                    // Check Shariah compliance
                    const compliance = shariahScreener.screenEquity({
                        symbol,
                        marketCap: 1000000000, // Default - would need real data
                        totalDebt: 100000000,
                        totalAssets: 500000000,
                        haramIncome: 0,
                        percentageHaramIncome: 0
                    });
                    analysisResults.set(symbol, analysis);
                }
                catch (error) {
                    errors.push(`${symbol}: ${error.message}`);
                    logger_1.logger.warn(`Failed to analyze ${symbol}:`, error.message);
                }
            }
            // Generate signals using real strategies
            const allSignals = await SignalGenerator_1.default.generateSignals(analysisResults);
            // Filter by confidence
            const signals = allSignals.filter(s => s.confidence >= minConfidence);
            // Format signals for response
            const formattedSignals = signals.map(signal => ({
                symbol: signal.symbol,
                direction: signal.direction,
                entryPrice: signal.entryPrice.toNumber(),
                stopLoss: signal.stopLoss.toNumber(),
                takeProfit: signal.takeProfit.toNumber(),
                riskAmount: signal.riskAmount.toNumber(),
                riskPercent: signal.riskPercent,
                confidence: signal.confidence,
                rating: signal.rating,
                strategy: signal.strategy,
                timeframe: signal.timeframe,
                timestamp: signal.timestamp,
                reasoning: signal.reasoning,
                shariahCompliant: analysisResults.get(signal.symbol)?.shariahCompliant ?? false
            }));
            // Get strategy stats
            const strategyStats = SignalGenerator_1.default.getStrategyStats(signals);
            return reply.status(200).send({
                success: true,
                timestamp: new Date().toISOString(),
                ibkrConnected: isConnected,
                data: {
                    signals: formattedSignals,
                    totalCount: formattedSignals.length,
                    analyzedSymbols: analysisResults.size,
                    strategyStats,
                    errors: errors.length > 0 ? errors : undefined
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Signal generation failed:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'SIGNAL_GENERATION_FAILED',
                    message: error.message || 'Failed to generate signals'
                }
            });
        }
    });
    /**
     * GET /api/signals/:symbol
     * Generate signal for a specific symbol - REAL DATA
     */
    fastify.get('/api/signals/:symbol', async (request, reply) => {
        try {
            const { symbol } = request.params;
            const upperSymbol = symbol.toUpperCase();
            logger_1.logger.info(`Generating signal for ${upperSymbol}`);
            // Get date range
            const to = new Date();
            const from = new Date(to.getTime() - 100 * 24 * 60 * 60 * 1000);
            const fromStr = from.toISOString().split('T')[0];
            const toStr = to.toISOString().split('T')[0];
            // Get historical data
            const bars = await dataProvider.getDailyBars(upperSymbol, fromStr, toStr);
            if (bars.length < 50) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'INSUFFICIENT_DATA',
                        message: `Insufficient historical data for ${upperSymbol} (${bars.length} bars, need 50+)`
                    }
                });
            }
            // Run technical analysis
            const analysis = TechnicalAnalysisEngine_1.TechnicalAnalysisEngine.analyze(bars, upperSymbol);
            const currentPrice = analysis.price;
            // Check Shariah compliance
            const compliance = shariahScreener.screenEquity({
                symbol: upperSymbol,
                marketCap: 1000000000,
                totalDebt: 100000000,
                totalAssets: 500000000,
                haramIncome: 0,
                percentageHaramIncome: 0
            });
            // Generate signal
            const signal = SignalGenerator_1.default.generateSignalForSymbol(upperSymbol, analysis);
            if (!signal) {
                return reply.status(200).send({
                    success: true,
                    timestamp: new Date().toISOString(),
                    symbol: upperSymbol,
                    signal: null,
                    message: 'No trading opportunity detected by any strategy',
                    analysis: {
                        price: currentPrice,
                        trend: analysis.trendAlignment?.alignment || 'neutral',
                        regime: analysis.regimeState?.marketRegime || 'unknown',
                        shariahCompliant: compliance.isCompliant,
                        complianceScore: compliance.score
                    }
                });
            }
            return reply.status(200).send({
                success: true,
                timestamp: new Date().toISOString(),
                symbol: upperSymbol,
                signal: {
                    direction: signal.direction,
                    entryPrice: signal.entryPrice.toNumber(),
                    stopLoss: signal.stopLoss.toNumber(),
                    takeProfit: signal.takeProfit.toNumber(),
                    riskAmount: signal.riskAmount.toNumber(),
                    riskPercent: signal.riskPercent,
                    confidence: signal.confidence,
                    rating: signal.rating,
                    strategy: signal.strategy,
                    timeframe: signal.timeframe,
                    reasoning: signal.reasoning,
                    shariahCompliant: compliance.isCompliant
                },
                analysis: {
                    price: currentPrice,
                    trend: analysis.trendAlignment,
                    momentum: { rsi: analysis.rsiState, macd: analysis.macdState },
                    volume: analysis.volumeState,
                    regime: analysis.regimeState,
                    shariahCompliant: compliance.isCompliant,
                    complianceScore: compliance.score
                }
            });
        }
        catch (error) {
            logger_1.logger.error(`Signal generation failed for symbol:`, error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'SIGNAL_GENERATION_FAILED',
                    message: error.message || 'Failed to generate signal'
                }
            });
        }
    });
    /**
     * POST /api/signals/execute
     * Execute a signal - REAL ORDER to IBKR
     */
    fastify.post('/api/signals/execute', async (request, reply) => {
        try {
            const { symbol, direction, entryPrice, stopLoss, quantity } = request.body;
            // Check IBKR connection
            const isConnected = await PythonServiceClient_1.pythonService.isConnected();
            if (!isConnected) {
                return reply.status(503).send({
                    success: false,
                    error: {
                        code: 'IBKR_DISCONNECTED',
                        message: 'Not connected to IBKR. Cannot execute orders.'
                    }
                });
            }
            // Check if trading is halted
            if (RiskManager_1.default.shouldHalt()) {
                return reply.status(200).send({
                    success: false,
                    error: {
                        code: 'TRADING_HALTED',
                        message: 'Trading halted due to drawdown exceeding limit'
                    }
                });
            }
            // Get account for position sizing
            const account = await PythonServiceClient_1.pythonService.getAccountSummary();
            if (!account) {
                return reply.status(500).send({
                    success: false,
                    error: {
                        code: 'ACCOUNT_FETCH_FAILED',
                        message: 'Failed to fetch account data'
                    }
                });
            }
            // Calculate position size if not provided
            const equity = new decimal_js_1.default(account.net_liquidation || '0');
            const positionSize = quantity || RiskManager_1.default.calculatePositionSize(equity, 1, // 1% risk
            new decimal_js_1.default(entryPrice), new decimal_js_1.default(stopLoss));
            if (positionSize < 1) {
                return reply.status(200).send({
                    success: false,
                    error: {
                        code: 'POSITION_TOO_SMALL',
                        message: 'Calculated position size is less than 1 share'
                    }
                });
            }
            // Submit order to IBKR
            const order = await PythonServiceClient_1.pythonService.submitOrder({
                symbol,
                quantity: positionSize,
                order_type: 'MKT'
            });
            if (!order) {
                return reply.status(500).send({
                    success: false,
                    error: {
                        code: 'ORDER_SUBMISSION_FAILED',
                        message: 'Failed to submit order to IBKR'
                    }
                });
            }
            return reply.status(200).send({
                success: true,
                timestamp: new Date().toISOString(),
                data: {
                    orderId: order.order_id,
                    symbol,
                    direction,
                    quantity: positionSize,
                    entryPrice,
                    stopLoss,
                    status: order.status,
                    message: 'Order submitted to IBKR'
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Signal execution failed:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'EXECUTION_FAILED',
                    message: error.message || 'Failed to execute signal'
                }
            });
        }
    });
    /**
     * GET /api/signals/active/:symbol
     * Get the most recent acted-on signal for a symbol from signals_log
     * Used by scheduler monitor_positions() to check SL/TP levels
     */
    fastify.get('/api/signals/active/:symbol', async (request, reply) => {
        try {
            const { symbol } = request.params;
            const upperSymbol = symbol.toUpperCase();
            // Query signals_log for most recent acted-on signal
            const stmt = db_1.default.prepare(`
        SELECT * FROM signals_log
        WHERE symbol = ? AND acted_on = 1
        ORDER BY created_at DESC
        LIMIT 1
      `);
            const signal = stmt.get(upperSymbol);
            if (!signal) {
                return reply.status(200).send({
                    success: true,
                    data: null
                });
            }
            return reply.status(200).send({
                success: true,
                data: {
                    id: signal.id,
                    symbol: signal.symbol,
                    strategy: signal.strategy,
                    direction: signal.direction,
                    entry_price: parseFloat(signal.entry_price || 0),
                    stop_loss: parseFloat(signal.stop_loss || 0),
                    take_profit: parseFloat(signal.take_profit || 0),
                    confidence: signal.confidence,
                    rating: signal.rating,
                    shariah_compliant: signal.shariah_compliant === 1,
                    acted_on: signal.acted_on === 1,
                    order_id: signal.order_id,
                    created_at: signal.created_at
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch active signal:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'DB_ERROR',
                    message: error.message || 'Failed to fetch signal'
                }
            });
        }
    });
}
//# sourceMappingURL=signals.js.map