"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
const logger_1 = require("../../config/logger");
const portfolio_1 = __importDefault(require("./portfolio"));
const positions_1 = __importDefault(require("./positions"));
const orders_1 = __importDefault(require("./orders"));
const data_1 = __importDefault(require("./data"));
const signals_1 = require("./signals");
const strategies_1 = require("./strategies");
const risk_1 = require("./risk");
const compliance_1 = require("./compliance");
const ws_1 = require("./ws");
const system_1 = require("./system");
const backtest_1 = require("./backtest");
async function setupRoutes(app) {
    logger_1.logger.info('Setting up API routes...');
    try {
        // Register System routes (status check, used by frontend)
        await app.register(system_1.systemRoutes);
        logger_1.logger.info('✓ System routes registered');
        // Register Phase 1 routes
        await app.register(portfolio_1.default);
        logger_1.logger.info('✓ Portfolio routes registered');
        await app.register(positions_1.default);
        logger_1.logger.info('✓ Positions routes registered');
        await app.register(orders_1.default);
        logger_1.logger.info('✓ Orders routes registered');
        await app.register(data_1.default);
        logger_1.logger.info('✓ Data routes registered');
        // Register Phase 2 routes
        await app.register(signals_1.signalsRoutes);
        logger_1.logger.info('✓ Signals routes registered');
        await app.register(strategies_1.strategiesRoutes);
        logger_1.logger.info('✓ Strategies routes registered');
        await app.register(risk_1.riskRoutes);
        logger_1.logger.info('✓ Risk routes registered');
        // Register Shariah Compliance routes (Muslim Xchange)
        await (0, compliance_1.setupComplianceRoutes)(app);
        logger_1.logger.info('✓ Shariah Compliance routes registered');
        // Register WebSocket routes
        await app.register(ws_1.wsRoutes);
        logger_1.logger.info('✓ WebSocket routes registered');
        // Register Backtest routes (Phase 4)
        await app.register(backtest_1.backtestRoutes);
        logger_1.logger.info('✓ Backtest routes registered');
        logger_1.logger.info('All routes registered successfully');
    }
    catch (error) {
        logger_1.logger.error('Route registration failed:', error);
        throw error;
    }
}
//# sourceMappingURL=index.js.map