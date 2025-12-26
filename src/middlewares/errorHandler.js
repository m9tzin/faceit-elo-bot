/**
 * Error handling middleware
 * Provides centralized error handling for all routes
 */

/**
 * Custom error class for player not found
 */
export class PlayerNotFoundError extends Error {
  constructor(message = 'nick inválido ou não encontrado :(') {
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

  // Handling custom errors with specific status codes
  // Handle PlayerNotFoundError (404) - return 200 so @Nightbot and @StreamElements bots can display the message
  if (err instanceof PlayerNotFoundError) {
    return res.status(200).send(err.message);
  }

  // Handle other custom errors with specific status codes
  if (err.statusCode) {
    return res.status(err.statusCode).send(err.message);
  }

  // Handle CS2 stats not found - return 200 so @Nightbot and @StreamElements bots can display the message
  if (err.message.includes('CS2')) {
    return res.status(200).send('Jogador não possui stats no CS2 :(');
  }

  // Determine error message based on error type
  let message = 'Erro ao processar requisição';
  
  if (err.message.includes('player')) {
    message = 'Jogador não encontrado';
  } else if (err.message.includes('API')) {
    message = 'Erro ao buscar dados da FACEIT';
  }

  res.status(500).send(message);
}

