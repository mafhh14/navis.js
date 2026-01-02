const http = require('http');
const Router = require('./router');
const { executeMiddleware } = require('./middleware');
const { error: errorResponse } = require('../utils/response');

/**
 * NavisApp - Main application class
 */
class NavisApp {
  constructor() {
    this.router = new Router();
    this.middlewares = [];
    this.server = null;
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
   */
  get(path, handler) {
    this.router.get(path, handler);
  }

  /**
   * Register POST route
   */
  post(path, handler) {
    this.router.post(path, handler);
  }

  /**
   * Register PUT route
   */
  put(path, handler) {
    this.router.put(path, handler);
  }

  /**
   * Register DELETE route
   */
  delete(path, handler) {
    this.router.delete(path, handler);
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

    // Find route handler
    const handler = this.router.find(method, path);

    if (!handler) {
      errorResponse(res, 'Not Found', 404);
      return;
    }

    // Execute middleware chain, then route handler
    try {
      await executeMiddleware(
        this.middlewares,
        req,
        res,
        handler,
        false
      );
    } catch (err) {
      errorResponse(res, err.message || 'Internal Server Error', 500);
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
    const handler = this.router.find(method, path);

    if (!handler) {
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
      body: event.body ? JSON.parse(event.body) : {},
      query: event.queryStringParameters || {},
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
        this.middlewares,
        req,
        res,
        handler,
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
      return {
        statusCode: 500,
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
}

module.exports = NavisApp;