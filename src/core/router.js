/**
 * Simple path-based router
 * v1: No regex, no params (keep it simple)
 */

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
   * @param {Function} handler - Route handler function
   */
  register(method, path, handler) {
    const normalizedMethod = method.toUpperCase();
    if (!this.routes[normalizedMethod]) {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }
    this.routes[normalizedMethod][path] = handler;
  }

  /**
   * Get route handler for a method and path
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @returns {Function|null} - Route handler or null if not found
   */
  find(method, path) {
    const normalizedMethod = method.toUpperCase();
    const methodRoutes = this.routes[normalizedMethod] || {};
    return methodRoutes[path] || null;
  }

  /**
   * Register GET route
   */
  get(path, handler) {
    this.register('GET', path, handler);
  }

  /**
   * Register POST route
   */
  post(path, handler) {
    this.register('POST', path, handler);
  }

  /**
   * Register PUT route
   */
  put(path, handler) {
    this.register('PUT', path, handler);
  }

  /**
   * Register DELETE route
   */
  delete(path, handler) {
    this.register('DELETE', path, handler);
  }
}

module.exports = Router;