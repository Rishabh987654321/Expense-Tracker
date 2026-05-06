import { ZodError } from 'zod';
import env from '../config/env.js';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res, next) {
  next(new HttpError(404, `Not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request payload',
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.name || 'HttpError',
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err?.code === 'P2002') {
    return res.status(409).json({
      error: 'ConflictError',
      message: 'A record with the same unique fields already exists',
      details: err.meta,
    });
  }

  if (env.isDev) {
    console.error('[unhandled]', err);
  }

  res.status(500).json({
    error: 'InternalServerError',
    message: env.isDev ? err.message || 'Unknown error' : 'Internal server error',
  });
}
