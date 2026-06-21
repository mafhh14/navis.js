const http = require('http');
const Router = require('./router');
const AdvancedRouter = require('./advanced-router');
const { executeMiddleware } = require('./middleware');
const { error: errorResponse } = require('../utils/response');

/**
 * NavisApp - Main application class
 */
class NavisApp {
  constructor(options = {}) {
    // Use advanced router if enabled (v4)
    this.useAdvancedRouter = options.useAdvancedRouter !== false; // Default true in v4
    this.router = this.useAdvancedRouter ? new AdvancedRouter() : new Router();
    this.middlewares = [];
    this.server = null;
    this.errorHandler = null;
  }

  /**
   * Register middleware
   * @param {Function} fn - Middleware function (req, res, next)
   */
  use(fn) {
    this.middlewares.push(fn);
  }

  /**
   * Register GET route
   * @param {string} path
   * @param {...Function} handlers - Optional middleware + final handler
   */
  get(path, ...handlers) {
    this.router.get(path, ...handlers);
  }

  /**
   * Register POST route
   */
  post(path, ...handlers) {
    this.router.post(path, ...handlers);
  }

  /**
   * Register PUT route
   */
  put(path, ...handlers) {
    this.router.put(path, ...handlers);
  }

  /**
   * Register DELETE route
   */
  delete(path, ...handlers) {
    this.router.delete(path, ...handlers);
  }

  /**
   * Register PATCH route (v4)
   */
  patch(path, ...handlers) {
    if (this.router.patch) {
      this.router.patch(path, ...handlers);
    } else {
      throw new Error('PATCH method requires advanced router');
    }
  }

  /**
   * Build middleware chain for a matched route
   * @private
   */
  _routeMiddlewares(routeResult) {
    const routeMiddlewares = routeResult.middlewares || [];
    return [...this.middlewares, ...routeMiddlewares];
  }

  /**
   * Set error handler (v4)
   * @param {Function} handler - Error handler function
   */
  setErrorHandler(handler) {
    this.errorHandler = handler;
  }

  /**
   * Handle HTTP request (Node.js)
   * @param {Object} req - Node.js HTTP request
   * @param {Object} res - Node.js HTTP response
   */
  async handleRequest(req, res) {
    const method = req.method;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;

    // Parse query string
    req.query = {};
    url.searchParams.forEach((value, key) => {
      req.query[key] = value;
    });

    // Find route handler
    let routeResult;
    if (this.useAdvancedRouter) {
      routeResult = this.router.find(method, path);
      if (routeResult) {
        req.params = routeResult.params || {};
        req.handler = routeResult.handler;
      }
    } else {
      const match = this.router.find(method, path);
      if (match) {
        routeResult = { ...match, params: {} };
        req.params = {};
      }
    }

    if (!routeResult) {
      if (this.errorHandler) {
        const notFoundError = new Error('Not Found');
        notFoundError.statusCode = 404;
        await this.errorHandler(notFoundError, req, res, () => {});
      } else {
        errorResponse(res, 'Not Found', 404);
      }
      return;
    }

    // Execute middleware chain, then route handler
    try {
      await executeMiddleware(
        this._routeMiddlewares(routeResult),
        req,
        res,
        routeResult.handler,
        false
      );
    } catch (err) {
      if (this.errorHandler) {
        await this.errorHandler(err, req, res, () => {});
      } else {
        errorResponse(res, err.message || 'Internal Server Error', err.statusCode || 500);
      }
    }
  }

  /**
   * Handle AWS Lambda event
   * @param {Object} event - Lambda event
   * @returns {Object} - Lambda response
   */
  async handleLambda(event) {
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const path = event.path || event.rawPath || '/';

    // Find route handler
    let routeResult;
    if (this.useAdvancedRouter) {
      routeResult = this.router.find(method, path);
    } else {
      const match = this.router.find(method, path);
      if (match) {
        routeResult = { ...match, params: {} };
      }
    }

    if (!routeResult) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: 'Not Found' }),
      };
    }

    // Create Lambda-compatible req/res objects
    const req = {
      method,
      path,
      headers: event.headers || {},
      body: event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {},
      query: event.queryStringParameters || {},
      params: routeResult.params || {},
      // Store original event for advanced use cases
      event,
    };

    const res = {
      statusCode: 200,
      headers: {},
      body: null,
    };

    // Execute middleware chain, then route handler
    try {
      const result = await executeMiddleware(
        this._routeMiddlewares(routeResult),
        req,
        res,
        routeResult.handler,
        true
      );

      // If handler returned a Lambda response directly, use it
      if (result && result.statusCode) {
        return result;
      }

      // Otherwise, construct response from res object
      return {
        statusCode: res.statusCode || 200,
        headers: {
          'Content-Type': 'application/json',
          ...res.headers,
        },
        body: res.body ? JSON.stringify(res.body) : JSON.stringify(result || {}),
      };
    } catch (err) {
      // Use error handler if set
      if (this.errorHandler) {
        // Create a mock res object for error handler
        const errorRes = {
          statusCode: err.statusCode || 500,
          headers: { 'Content-Type': 'application/json' },
          body: null,
        };
        
        await this.errorHandler(err, req, errorRes, () => {});
        
        return {
          statusCode: errorRes.statusCode,
          headers: errorRes.headers,
          body: typeof errorRes.body === 'string' ? errorRes.body : JSON.stringify(errorRes.body || { error: err.message }),
        };
      }

      return {
        statusCode: err.statusCode || 500,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
      };
    }
  }

  /**
   * Start HTTP server (Node.js)
   * @param {number} port - Port number
   * @param {Function} callback - Optional callback
   * @returns {Object} - HTTP server instance
   */
  listen(port = 3000, callback) {
    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.server.listen(port, () => {
      if (callback) callback();
      console.log(`Navis.js server listening on port ${port}`);
    });

    return this.server;
  }

  /**
   * Get server instance
   * @returns {Object|null} - HTTP server instance
   */
  getServer() {
    return this.server;
  }
}

module.exports = NavisApp;