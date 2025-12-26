/**
 * Error handling middleware
 * Provides centralized error handling for all routes
 */

/**
 * Custom error class for player not found
 */
export class PlayerNotFoundError extends Error {
  constructor(message = 'nick não encontrado :(') {
    super(message);
    this.name = 'PlayerNotFoundError';
    this.statusCode = 404;
  }
}

/**
 * Async route wrapper to catch errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Express route handler with error catching
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 * Should be added last in the middleware chain
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  // Handle custom errors with specific status codes
  if (err.statusCode) {
    return res.status(err.statusCode).send(err.message);
  }

  // Determine error message based on error type
  let message = 'Erro ao processar requisição';
  
  if (err.message.includes('player')) {
    message = 'Jogador não encontrado';
  } else if (err.message.includes('API')) {
    message = 'Erro ao buscar dados da FACEIT';
  } else if (err.message.includes('CS2')) {
    message = 'Jogador não possui dados de CS2';
  }

  res.status(500).send(message);
}

