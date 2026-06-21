/**
 * Simple path-based router
 * v1: No regex, no params (keep it simple)
 * v6.0: Route-level middleware support
 */

const { parseRouteHandlers } = require('./route-utils');

class Router {
  constructor() {
    this.routes = {
      GET: {},
      POST: {},
      PUT: {},
      DELETE: {},
    };
  }

  /**
   * Register a route handler
   * @param {string} method - HTTP method
   * @param {string} path - Route path (exact match only in v1)
   * @param {...Function} handlers - Optional middleware + final handler
   */
  register(method, path, ...handlers) {
    const { middlewares, handler } = parseRouteHandlers(handlers);
    const normalizedMethod = method.toUpperCase();
    if (!this.routes[normalizedMethod]) {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }
    this.routes[normalizedMethod][path] = { handler, middlewares };
  }

  /**
   * Get route handler for a method and path
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @returns {Object|null} - { handler, middlewares } or null if not found
   */
  find(method, path) {
    const normalizedMethod = method.toUpperCase();
    const methodRoutes = this.routes[normalizedMethod] || {};
    return methodRoutes[path] || null;
  }

  get(path, ...handlers) {
    this.register('GET', path, ...handlers);
  }

  post(path, ...handlers) {
    this.register('POST', path, ...handlers);
  }

  put(path, ...handlers) {
    this.register('PUT', path, ...handlers);
  }

  delete(path, ...handlers) {
    this.register('DELETE', path, ...handlers);
  }
}

module.exports = Router;
