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
 * Custom error class for missing player nickname
 */
export class MissingNicknameError extends Error {
  constructor(message = 'Indique o nickname FACEIT (ex.: !stats s1mple)') {
    super(message);
    this.name = 'MissingNicknameError';
    this.statusCode = 400;
  }
}

/**
 * Custom error for CS2 data not found
 */
export class CS2DataNotFoundError extends Error {
  constructor(message = 'Jogador não possui stats no CS2 :(') {
    super(message);
    this.name = 'CS2DataNotFoundError';
    this.statusCode = 404;
  }
}

/**
 * Custom error for FACEIT API failures (non-404)
 */
export class FaceitApiError extends Error {
  constructor(message = 'Erro ao buscar dados da FACEIT', statusCode = null) {
    super(message);
    this.name = 'FaceitApiError';
    this.statusCode = 502;
    this.isNotFound = statusCode === 404;
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
 * All known error types return HTTP 200 so Nightbot/StreamElements can display the text.
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  if (!(err instanceof PlayerNotFoundError || err instanceof MissingNicknameError)) {
    console.error('Stack:', err.stack);
  }

  if (err instanceof PlayerNotFoundError) {
    return res.status(200).send(err.message);
  }

  if (err instanceof MissingNicknameError) {
    return res.status(200).send(err.message);
  }

  if (err instanceof CS2DataNotFoundError) {
    return res.status(200).send(err.message);
  }

  if (err instanceof FaceitApiError) {
    return res.status(200).send('Erro ao buscar dados da FACEIT, tente novamente.');
  }

  if (err.statusCode) {
    return res.status(err.statusCode).send(err.message);
  }

  res.status(500).send('Erro ao processar requisição');
}
