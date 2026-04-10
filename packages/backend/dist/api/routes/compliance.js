"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupComplianceRoutes = setupComplianceRoutes;
const MuslimXchangeClient_1 = __importDefault(require("../../services/MuslimXchangeClient"));
const logger_1 = require("../../config/logger");
async function setupComplianceRoutes(app) {
    // Initialize Muslim Xchange client
    const muslimXchangeUsername = process.env.MUSLIM_XCHANGE_USERNAME || 'alharthyinvestment';
    const muslimXchangePassword = process.env.MUSLIM_XCHANGE_API_PASSWORD || '3D0qxeFdEzHsc02R8lwwZUS0';
    const mxClient = new MuslimXchangeClient_1.default(muslimXchangeUsername, muslimXchangePassword);
    /**
     * GET /api/compliance/screen
     * Screen a stock for Shariah compliance (supports both query and path params)
     */
    app.get('/api/compliance/screen', async (request, reply) => {
        try {
            const symbol = request.query.symbol;
            if (!symbol) {
                return reply.status(400).send({
                    success: false,
                    error: 'symbol query parameter required'
                });
            }
            logger_1.logger.info(`Screening ${symbol} for Shariah compliance`);
            const complianceData = await mxClient.screenTicker(symbol);
            reply.send({
                success: true,
                data: complianceData,
                score: mxClient.getComplianceScore(complianceData)
            });
        }
        catch (error) {
            logger_1.logger.error('Error screening stock:', error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to screen stock'
            });
        }
    });
    /**
     * GET /api/compliance/screen/:symbol
     * Screen a single stock for Shariah compliance (path parameter version)
     */
    app.get('/api/compliance/screen/:symbol', async (request, reply) => {
        try {
            const { symbol } = request.params;
            logger_1.logger.info(`Screening ${symbol} for Shariah compliance`);
            const complianceData = await mxClient.screenTicker(symbol);
            reply.send({
                success: true,
                data: complianceData,
                score: mxClient.getComplianceScore(complianceData)
            });
        }
        catch (error) {
            logger_1.logger.error('Error screening stock:', error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to screen stock'
            });
        }
    });
    /**
     * POST /api/compliance/batch
     * Screen multiple stocks at once
     */
    app.post('/api/compliance/batch', async (request, reply) => {
        try {
            const { symbols } = request.body;
            if (!Array.isArray(symbols) || symbols.length === 0) {
                return reply.status(400).send({
                    success: false,
                    error: 'symbols array required'
                });
            }
            logger_1.logger.info(`Screening ${symbols.length} stocks`);
            const results = await mxClient.batchScreenTickers(symbols);
            reply.send({
                success: true,
                data: results,
                compliant: results.filter(r => r.compliant).length,
                nonCompliant: results.filter(r => !r.compliant).length
            });
        }
        catch (error) {
            logger_1.logger.error('Error in batch screening:', error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Batch screening failed'
            });
        }
    });
    /**
     * GET /api/compliance/market/:market
     * Screen entire market
     */
    app.get('/api/compliance/market/:market', async (request, reply) => {
        try {
            const { market } = request.params;
            logger_1.logger.info(`Screening ${market} market`);
            const results = await mxClient.screenMarket(market);
            reply.send({
                success: true,
                market,
                total: results.length,
                compliant: results.filter(r => r.compliant).length,
                data: results
            });
        }
        catch (error) {
            logger_1.logger.error('Error screening market:', error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Market screening failed'
            });
        }
    });
    /**
     * POST /api/compliance/filter
     * Filter compliant stocks from a list
     */
    app.post('/api/compliance/filter', async (request, reply) => {
        try {
            const { symbols } = request.body;
            if (!Array.isArray(symbols) || symbols.length === 0) {
                return reply.status(400).send({
                    success: false,
                    error: 'symbols array required'
                });
            }
            const compliantStocks = await mxClient.filterCompliantStocks(symbols);
            reply.send({
                success: true,
                compliant: compliantStocks,
                count: compliantStocks.length,
                filtered: symbols.length - compliantStocks.length
            });
        }
        catch (error) {
            logger_1.logger.error('Error filtering stocks:', error);
            reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : 'Filtering failed'
            });
        }
    });
    /**
     * GET /api/compliance/cache/clear
     * Clear the compliance cache
     */
    app.get('/api/compliance/cache/clear', async (request, reply) => {
        try {
            mxClient.clearCache();
            reply.send({
                success: true,
                message: 'Cache cleared'
            });
        }
        catch (error) {
            reply.status(500).send({
                success: false,
                error: 'Failed to clear cache'
            });
        }
    });
    logger_1.logger.info('Shariah compliance routes registered');
}
exports.default = setupComplianceRoutes;
//# sourceMappingURL=compliance.js.map