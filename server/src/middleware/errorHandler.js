const { ZodError } = require('zod');
const { error } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../config');

function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.url} - Error: ${err.message}`, err);

  // Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return error(res, 'Validation failed for request parameters or payload', 400, formattedErrors);
  }

  // SyntaxError from malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return error(res, 'Malformed JSON payload in request body', 400);
  }

  // General server errors
  const statusCode = err.statusCode || err.status || 500;
  const message = config.nodeEnv === 'production' && statusCode === 500
    ? 'An unexpected internal server error occurred.'
    : err.message || 'Internal server error';

  return error(res, message, statusCode);
}

function notFoundHandler(req, res) {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
