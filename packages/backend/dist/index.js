"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const cors_1 = __importDefault(require("@fastify/cors"));
const logger_1 = require("./config/logger");
const environment_1 = require("./config/environment");
const routes_1 = require("./api/routes");
const errorHandler_1 = require("./api/middleware/errorHandler");
const app = (0, fastify_1.default)({
    logger: true,
    requestTimeout: 30000
});
// Error handling middleware
app.setErrorHandler(errorHandler_1.errorHandler);
// Health check endpoint
app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: environment_1.config.node.env
}));
// Graceful shutdown
const gracefulShutdown = (signal) => {
    logger_1.logger.info(`Received ${signal}, shutting down gracefully...`);
    app.close().then(() => {
        logger_1.logger.info('Server closed');
        process.exit(0);
    }).catch(err => {
        logger_1.logger.error('Error during shutdown:', err);
        process.exit(1);
    });
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
// Start server
const start = async () => {
    try {
        // Register WebSocket plugin BEFORE setting up routes
        await app.register(websocket_1.default);
        logger_1.logger.info('WebSocket plugin registered');
        // Register CORS plugin
        await app.register(cors_1.default, {
            origin: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        });
        logger_1.logger.info('CORS plugin registered');
        // Setup routes - MUST be awaited
        await (0, routes_1.setupRoutes)(app);
        logger_1.logger.info('Routes setup completed successfully');
        await app.listen({ port: environment_1.config.node.port, host: '0.0.0.0' });
        logger_1.logger.info(`Server running on http://0.0.0.0:${environment_1.config.node.port}`);
        logger_1.logger.info(`Environment: ${environment_1.config.node.env}`);
    }
    catch (err) {
        logger_1.logger.error('Failed to start server:', err);
        process.exit(1);
    }
};
start();
exports.default = app;
//# sourceMappingURL=index.js.map