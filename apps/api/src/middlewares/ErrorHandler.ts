import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { HTTP_STATUS, ERROR_CODES } from '@repo/constants';
import { AppError } from '../errors/AppError.js';

/**
 * Global Fastify error handler.
 *
 * Normalizes all errors into a consistent JSON response envelope.
 * Distinguishes between operational errors (AppError) and unexpected errors.
 */
export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  request.log.error({ err: error, url: request.url, method: request.method }, 'Request error');

  // ── Handle known AppErrors ────────────────────────────────────────────────
  if (error instanceof AppError) {
    void reply.code(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
      statusCode: error.statusCode,
    });
    return;
  }

  // ── Handle Fastify validation errors (statusCode 400) ─────────────────────
  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode !== undefined && fastifyError.statusCode < 500) {
    void reply.code(fastifyError.statusCode).send({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: fastifyError.message,
      },
      statusCode: fastifyError.statusCode,
    });
    return;
  }

  // ── Handle unexpected/programming errors ─────────────────────────────────
  void reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  });
}
