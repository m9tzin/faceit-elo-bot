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

/** Player exists but has no CS2 / stats on FACEIT */
export class NoCS2DataError extends Error {
  constructor() {
    super('Jogador não possui stats no CS2 :(');
    this.name = 'NoCS2DataError';
  }
}

/** FACEIT Data API HTTP failure (status from upstream) */
export class FaceitApiError extends Error {
  /**
   * @param {number} status - HTTP status from FACEIT
   * @param {string} [message]
   */
  constructor(status, message) {
    super(message || `FACEIT API status ${status}`);
    this.name = 'FaceitApiError';
    this.status = status;
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

  if (err instanceof NoCS2DataError) {
    return res.status(200).send(err.message);
  }

  if (err instanceof FaceitApiError) {
    if (err.status === 429) {
      return res
        .status(200)
        .send('Muitas requisições à FACEIT. Aguarde um pouco e tente de novo.');
    }
    if (err.status === 401 || err.status === 403) {
      return res.status(200).send('Erro de autenticação com a API FACEIT.');
    }
    if (err.status >= 500) {
      return res.status(200).send('FACEIT temporariamente indisponível. Tente de novo em instantes.');
    }
    return res.status(200).send('Erro ao buscar dados da FACEIT.');
  }

  if (err.statusCode) {
    return res.status(err.statusCode).send(err.message);
  }

  res.status(500).send('Erro ao processar requisição');
}
