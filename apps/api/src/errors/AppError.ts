import { HTTP_STATUS, ERROR_CODES, type ErrorCode } from '@repo/constants';

/**
 * Base application error class.
 *
 * All domain-specific errors should extend AppError.
 * The error handler middleware uses this class to produce consistent
 * JSON error responses.
 *
 * @example
 * throw new AppError('Resource not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ErrorCode = ERROR_CODES.INTERNAL_ERROR,
    details?: unknown,
    isOperational = true,
  ) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // Capture stack trace, excluding constructor call from stack
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Convenience factory methods ─────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string) {
    super(
      id ? `${resource} with id "${id}" was not found` : `${resource} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND,
    );
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_CODES.VALIDATION_ERROR, details);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    this.name = 'ForbiddenError';
  }
}
