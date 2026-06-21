/**
 * Route registration helpers
 * v6.0: Express-style route middleware support
 */

/**
 * Parse route handlers from variadic arguments
 * @param {Array<Function>} handlers
 * @returns {{ middlewares: Function[], handler: Function }}
 */
function parseRouteHandlers(handlers) {
  if (!handlers.length) {
    throw new Error('Route handler is required');
  }

  const handler = handlers[handlers.length - 1];
  if (typeof handler !== 'function') {
    throw new Error('Route handler must be a function');
  }

  const middlewares = handlers.slice(0, -1);
  for (const middleware of middlewares) {
    if (typeof middleware !== 'function') {
      throw new Error('Route middleware must be a function');
    }
  }

  return { middlewares, handler };
}

module.exports = {
  parseRouteHandlers,
};
