// src/middleware/errorHandler.js
//
// Centralized error handler. Every route either calls next(err) on failure,
// or throws inside an async handler wrapped by asyncHandler (below) — both
// end up here, so every error response has the same JSON shape:
//   { "error": { "message": "...", "details": [...] } }

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Internal server error';

  if (!err.statusCode) {
    // Unexpected errors get logged with full detail server-side, but we
    // don't leak internals (stack traces, DB error text) to the client.
    console.error('Unexpected error:', err);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}
