"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../../config/logger");
async function errorHandler(error, request, reply) {
    // Log the error
    logger_1.logger.error({
        message: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        statusCode: error.statusCode || 500
    });
    // Determine status code
    const statusCode = error.statusCode || 500;
    // Send response
    reply.status(statusCode).send({
        success: false,
        error: {
            code: error.code || 'INTERNAL_SERVER_ERROR',
            message: error.message || 'An unexpected error occurred'
        },
        timestamp: new Date().toISOString()
    });
}
//# sourceMappingURL=errorHandler.js.map