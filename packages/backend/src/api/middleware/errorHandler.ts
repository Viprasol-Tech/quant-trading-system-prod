import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../../config/logger';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log the error
  logger.error({
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
