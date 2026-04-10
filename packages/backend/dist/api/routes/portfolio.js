"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.portfolioRoutes = portfolioRoutes;
const decimal_js_1 = __importDefault(require("decimal.js"));
const logger_1 = require("../../config/logger");
const PythonServiceClient_1 = require("../../services/PythonServiceClient");
const RiskManager_1 = __importDefault(require("../../services/RiskManager"));
async function portfolioRoutes(app) {
    /**
     * GET /api/portfolio - Get portfolio overview - REAL DATA
     */
    app.get('/api/portfolio', async (request, reply) => {
        try {
            logger_1.logger.info('Fetching portfolio data');
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
            // Get REAL data
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
            const totalEquity = new decimal_js_1.default(account.net_liquidation || '0');
            const totalCash = new decimal_js_1.default(account.total_cash || '0');
            const buyingPower = new decimal_js_1.default(account.buying_power || '0');
            // Calculate portfolio heat
            const portfolioHeat = RiskManager_1.default.calculatePortfolioHeat(positions);
            const riskPercent = totalEquity.isZero()
                ? 0
                : portfolioHeat.dividedBy(totalEquity).times(100).toNumber();
            // Calculate drawdown
            RiskManager_1.default.updateDrawdown(totalEquity);
            const drawdown = RiskManager_1.default.getCurrentDrawdown().toNumber();
            // Calculate total unrealized P&L
            let totalUnrealizedPnl = new decimal_js_1.default(0);
            for (const pos of positions) {
                totalUnrealizedPnl = totalUnrealizedPnl.plus(pos.unrealized_pl || '0');
            }
            return reply.send({
                success: true,
                timestamp: new Date().toISOString(),
                data: {
                    account: {
                        accountId: account.account_id,
                        totalEquity: totalEquity.toFixed(2),
                        totalCash: totalCash.toFixed(2),
                        buyingPower: buyingPower.toFixed(2),
                        currency: account.currency || 'USD'
                    },
                    positions: positions.map(pos => ({
                        symbol: pos.symbol,
                        quantity: parseInt(pos.qty, 10),
                        side: pos.side,
                        avgEntryPrice: pos.avg_entry_price,
                        currentPrice: pos.current_price,
                        marketValue: pos.market_value,
                        unrealizedPnl: pos.unrealized_pl,
                        unrealizedPnlPercent: pos.unrealized_plpc
                    })),
                    summary: {
                        openPositions: positions.length,
                        totalUnrealizedPnl: totalUnrealizedPnl.toFixed(2),
                        portfolioHeat: `${riskPercent.toFixed(2)}%`,
                        currentDrawdown: `${drawdown.toFixed(2)}%`,
                        tradingAllowed: !RiskManager_1.default.shouldHalt()
                    }
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Portfolio fetch failed:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'PORTFOLIO_FETCH_FAILED',
                    message: error.message || 'Unknown error'
                }
            });
        }
    });
    /**
     * GET /api/portfolio/balance - Get current balance - REAL DATA
     */
    app.get('/api/portfolio/balance', async (request, reply) => {
        try {
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
            return reply.send({
                success: true,
                timestamp: new Date().toISOString(),
                data: {
                    netLiquidation: account.net_liquidation,
                    totalCash: account.total_cash,
                    buyingPower: account.buying_power,
                    grossPositionValue: account.gross_position_value,
                    availableFunds: account.available_funds,
                    excessLiquidity: account.excess_liquidity,
                    currency: account.currency
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Balance fetch failed:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'BALANCE_FETCH_FAILED',
                    message: error.message
                }
            });
        }
    });
    /**
     * GET /api/portfolio/stats - Get portfolio statistics - REAL DATA
     */
    app.get('/api/portfolio/stats', async (request, reply) => {
        try {
            const isConnected = await PythonServiceClient_1.pythonService.isConnected();
            const account = isConnected ? await PythonServiceClient_1.pythonService.getAccountSummary() : null;
            const positions = isConnected ? await PythonServiceClient_1.pythonService.getPositions() : [];
            // Calculate stats
            let totalPnl = new decimal_js_1.default(0);
            let winCount = 0;
            let lossCount = 0;
            for (const pos of positions) {
                const pnl = new decimal_js_1.default(pos.unrealized_pl || '0');
                totalPnl = totalPnl.plus(pnl);
                if (pnl.greaterThan(0))
                    winCount++;
                else if (pnl.lessThan(0))
                    lossCount++;
            }
            const equity = new decimal_js_1.default(account?.net_liquidation || '0');
            RiskManager_1.default.updateDrawdown(equity);
            return reply.send({
                success: true,
                timestamp: new Date().toISOString(),
                data: {
                    connected: isConnected,
                    equity: account?.net_liquidation || '0',
                    cash: account?.total_cash || '0',
                    buyingPower: account?.buying_power || '0',
                    positionsCount: positions.length,
                    totalPnl: totalPnl.toFixed(2),
                    winningPositions: winCount,
                    losingPositions: lossCount,
                    drawdown: RiskManager_1.default.getCurrentDrawdown().toFixed(2),
                    sizeMultiplier: RiskManager_1.default.getSizeMultiplier().toFixed(2),
                    tradingAllowed: !RiskManager_1.default.shouldHalt()
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Portfolio stats fetch failed:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'STATS_FETCH_FAILED',
                    message: error.message
                }
            });
        }
    });
}
exports.default = portfolioRoutes;
//# sourceMappingURL=portfolio.js.map