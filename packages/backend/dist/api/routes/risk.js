"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskRoutes = riskRoutes;
const PythonServiceClient_1 = require("../../services/PythonServiceClient");
const RiskManager_1 = __importDefault(require("../../services/RiskManager"));
const decimal_js_1 = __importDefault(require("decimal.js"));
const logger_1 = require("../../config/logger");
async function riskRoutes(fastify) {
    /**
     * GET /api/risk/metrics
     * Get current risk metrics - REAL DATA from IBKR
     */
    fastify.get('/api/risk/metrics', async (request, reply) => {
        try {
            // Check connection status
            const isConnected = await PythonServiceClient_1.pythonService.isConnected();
            if (!isConnected) {
                return reply.status(503).send({
                    success: false,
                    error: {
                        code: 'IBKR_DISCONNECTED',
                        message: 'Not connected to IBKR. Please check connection.'
                    }
                });
            }
            // Get REAL account data
            const account = await PythonServiceClient_1.pythonService.getAccountSummary();
            if (!account) {
                return reply.status(500).send({
                    success: false,
                    error: {
                        code: 'ACCOUNT_FETCH_FAILED',
                        message: 'Failed to fetch account data from IBKR'
                    }
                });
            }
            // Get REAL positions
            const positions = await PythonServiceClient_1.pythonService.getPositions();
            // Calculate real metrics
            const equity = new decimal_js_1.default(account.net_liquidation || '0');
            const cash = new decimal_js_1.default(account.total_cash || '0');
            const buyingPower = new decimal_js_1.default(account.buying_power || '0');
            // Update drawdown tracking
            RiskManager_1.default.updateDrawdown(equity);
            const currentDrawdown = RiskManager_1.default.getCurrentDrawdown();
            // Calculate portfolio heat from real positions
            const portfolioHeat = RiskManager_1.default.calculatePortfolioHeat(positions);
            const portfolioHeatPercent = equity.isZero()
                ? new decimal_js_1.default(0)
                : portfolioHeat.dividedBy(equity).times(100);
            // Get size multiplier based on drawdown
            const sizeMultiplier = RiskManager_1.default.getSizeMultiplier();
            // Determine drawdown status
            const ddPercent = currentDrawdown.toNumber();
            let drawdownStatus = 'ACTIVE';
            if (ddPercent >= 20)
                drawdownStatus = 'HALTED';
            else if (ddPercent >= 15)
                drawdownStatus = 'RED';
            else if (ddPercent >= 10)
                drawdownStatus = 'ORANGE';
            else if (ddPercent >= 5)
                drawdownStatus = 'YELLOW';
            return reply.status(200).send({
                success: true,
                timestamp: new Date().toISOString(),
                data: {
                    // Account metrics
                    accountEquity: equity.toFixed(2),
                    cash: cash.toFixed(2),
                    buyingPower: buyingPower.toFixed(2),
                    // Risk metrics
                    currentDrawdown: `${currentDrawdown.toFixed(2)}%`,
                    drawdownStatus,
                    portfolioHeat: `${portfolioHeatPercent.toFixed(2)}%`,
                    sizeMultiplier: `${sizeMultiplier.toFixed(2)}x`,
                    // Position info
                    positions: positions.length,
                    maxPositions: 8,
                    // Trading status
                    tradingAllowed: !RiskManager_1.default.shouldHalt(),
                    // Raw values for calculations
                    drawdownPercent: currentDrawdown.toNumber(),
                    portfolioHeatPercent: portfolioHeatPercent.toNumber(),
                },
                config: {
                    maxPortfolioHeat: '7%',
                    maxDrawdownHalt: '20%',
                    riskPerTrade: '1%',
                    maxStopLoss: '5%',
                    drawdownLevels: {
                        yellow: '5%',
                        orange: '10%',
                        red: '15%',
                        halt: '20%'
                    }
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Risk metrics fetch failed:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: error.message || 'Failed to fetch risk metrics'
                }
            });
        }
    });
    /**
     * GET /api/risk/status
     * Quick status check for connection and trading
     */
    fastify.get('/api/risk/status', async (request, reply) => {
        try {
            const health = await PythonServiceClient_1.pythonService.checkHealth();
            return reply.status(200).send({
                success: true,
                data: {
                    ibkrConnected: health.ibkr_connected,
                    tradingAllowed: health.ibkr_connected && !RiskManager_1.default.shouldHalt(),
                    drawdownStatus: RiskManager_1.default.shouldHalt() ? 'HALTED' : 'ACTIVE',
                    timestamp: health.timestamp
                }
            });
        }
        catch (error) {
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'STATUS_CHECK_FAILED',
                    message: error.message
                }
            });
        }
    });
    /**
     * POST /api/risk/evaluate
     * Evaluate if a new trade can be taken based on risk limits - REAL DATA
     */
    fastify.post('/api/risk/evaluate', async (request, reply) => {
        try {
            const { symbol, entryPrice, stopPrice, stopLoss } = request.body;
            // Support both stopPrice and stopLoss parameter names
            const finalStopPrice = stopPrice || stopLoss || 95;
            const finalEntryPrice = entryPrice || 100;
            if (!symbol) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'MISSING_PARAMETERS',
                        message: 'Required: symbol, entryPrice, stopPrice (or stopLoss)'
                    }
                });
            }
            // Check connection
            const isConnected = await PythonServiceClient_1.pythonService.isConnected();
            if (!isConnected) {
                return reply.status(503).send({
                    success: false,
                    error: {
                        code: 'IBKR_DISCONNECTED',
                        message: 'Not connected to IBKR'
                    }
                });
            }
            // Check if halted
            if (RiskManager_1.default.shouldHalt()) {
                return reply.status(200).send({
                    success: true,
                    approved: false,
                    reason: 'Trading halted due to drawdown exceeding 20%'
                });
            }
            // Get real account data
            const account = await PythonServiceClient_1.pythonService.getAccountSummary();
            const positions = await PythonServiceClient_1.pythonService.getPositions();
            if (!account) {
                return reply.status(500).send({
                    success: false,
                    error: {
                        code: 'ACCOUNT_FETCH_FAILED',
                        message: 'Failed to fetch account data'
                    }
                });
            }
            const equity = new decimal_js_1.default(account.net_liquidation || '0');
            const entryDec = new decimal_js_1.default(finalEntryPrice);
            const stopDec = new decimal_js_1.default(finalStopPrice);
            const riskPerPrice = Math.abs(finalEntryPrice - finalStopPrice);
            // Calculate position size
            const positionSize = RiskManager_1.default.calculatePositionSize(equity, 1, // 1% risk
            entryDec, stopDec);
            // Calculate risk amount
            const riskPerShare = entryDec.minus(stopDec).abs();
            const riskAmount = riskPerShare.times(positionSize);
            const riskPercent = equity.isZero() ? 0 : riskAmount.dividedBy(equity).times(100).toNumber();
            // Check portfolio heat
            const currentHeat = RiskManager_1.default.calculatePortfolioHeat(positions);
            const newHeat = currentHeat.plus(riskAmount);
            const maxHeat = equity.times(0.07); // 7% max
            const approved = newHeat.lessThanOrEqualTo(maxHeat) && positionSize > 0;
            // Calculate take profits
            const tp1 = entryDec.plus(riskPerShare.times(1.5));
            const tp2 = entryDec.plus(riskPerShare.times(2));
            return reply.status(200).send({
                success: true,
                approved,
                reason: approved ? undefined : 'Trade would exceed portfolio heat limit',
                tradePlan: {
                    symbol,
                    direction: finalEntryPrice > finalStopPrice ? 'long' : 'short',
                    entryPrice: finalEntryPrice.toFixed(2),
                    stopLoss: finalStopPrice.toFixed(2),
                    takeProfitPartial: tp1.toFixed(2),
                    takeProfitFull: tp2.toFixed(2),
                    positionSize,
                    riskAmount: riskAmount.toFixed(2),
                    riskPercent: `${riskPercent.toFixed(2)}%`,
                    riskRewardRatio: '2.0'
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Trade evaluation failed:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'EVALUATION_FAILED',
                    message: error.message || 'Failed to evaluate trade'
                }
            });
        }
    });
}
//# sourceMappingURL=risk.js.map