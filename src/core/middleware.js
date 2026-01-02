/**
 * Middleware engine for sequential execution
 */

/**
 * Execute middleware chain sequentially
 * @param {Array} middlewares - Array of middleware functions
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} finalHandler - Final route handler
 * @param {boolean} isLambda - Whether this is a Lambda invocation
 */
async function executeMiddleware(middlewares, req, res, finalHandler, isLambda = false) {
  let index = 0;

  const next = async () => {
    if (index >= middlewares.length) {
      // All middleware executed, run final handler
      if (finalHandler) {
        return await finalHandler(req, res);
      }
      return;
    }

    const middleware = middlewares[index++];
    try {
      await middleware(req, res, next);
    } catch (err) {
      // Error in middleware - stop chain
      throw err;
    }
  };

  return await next();
}

module.exports = {
  executeMiddleware,
};