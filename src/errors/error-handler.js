/**
 * Enhanced Error Handling
 * v4: Custom error classes and error handling middleware
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.constructor.name.toUpperCase();
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * Error handler middleware
 * @param {Object} options - Error handler options
 * @returns {Function} - Error handling middleware
 */
function errorHandler(options = {}) {
  const {
    format = 'json',
    includeStack = process.env.NODE_ENV === 'development',
    logErrors = true,
    logger = console.error,
  } = options;

  return async (err, req, res, next) => {
    // Determine status code
    const statusCode = err.statusCode || err.status || 500;
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const message = err.message || 'Internal server error';

    // Log error
    if (logErrors) {
      logger('Error:', {
        message,
        statusCode,
        code,
        stack: includeStack ? err.stack : undefined,
        path: req.path,
        method: req.method,
      });
    }

    // Format error response
    const errorResponse = {
      error: {
        message,
        code,
        statusCode,
      },
    };

    // Include stack trace in development
    if (includeStack && err.stack) {
      errorResponse.error.stack = err.stack.split('\n');
    }

    // Include validation errors if present
    if (err.errors && Array.isArray(err.errors)) {
      errorResponse.error.errors = err.errors;
    }

    // Set response
    res.statusCode = statusCode;
    
    if (format === 'json') {
      res.headers = res.headers || {};
      res.headers['Content-Type'] = 'application/json';
      res.body = errorResponse;
    } else {
      res.body = `${statusCode} ${message}`;
    }
  };
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async function
 * @returns {Function} - Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler
 * @returns {Function} - Middleware function
 */
function notFoundHandler() {
  return (req, res) => {
    res.statusCode = 404;
    res.body = {
      error: {
        message: `Route ${req.method} ${req.path} not found`,
        code: 'NOT_FOUND',
        statusCode: 404,
      },
    };
  };
}

module.exports = {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
};

