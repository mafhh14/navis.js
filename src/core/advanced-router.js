/**
 * Advanced Router with Parameters and Path Matching
 * v4: Support for route parameters, wildcards, and path matching
 */

class AdvancedRouter {
  constructor() {
    this.routes = {
      GET: [],
      POST: [],
      PUT: [],
      DELETE: [],
      PATCH: [],
    };
  }

  /**
   * Register a route handler
   * @param {string} method - HTTP method
   * @param {string} path - Route path (supports :param and * wildcards)
   * @param {Function} handler - Route handler function
   */
  register(method, path, handler) {
    const normalizedMethod = method.toUpperCase();
    if (!this.routes[normalizedMethod]) {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }

    // Parse route pattern
    const pattern = this._parsePattern(path);
    
    this.routes[normalizedMethod].push({
      pattern: path,
      regex: pattern.regex,
      params: pattern.params,
      handler,
    });

    // Sort routes by specificity (more specific first)
    this.routes[normalizedMethod].sort((a, b) => {
      const aSpecificity = this._calculateSpecificity(a.pattern);
      const bSpecificity = this._calculateSpecificity(b.pattern);
      return bSpecificity - aSpecificity;
    });
  }

  /**
   * Find route handler for a method and path
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @returns {Object|null} - { handler, params } or null if not found
   */
  find(method, path) {
    const normalizedMethod = method.toUpperCase();
    const methodRoutes = this.routes[normalizedMethod] || [];

    for (const route of methodRoutes) {
      const match = path.match(route.regex);
      if (match) {
        // Extract parameters
        const params = {};
        route.params.forEach((param, index) => {
          params[param] = match[index + 1];
        });

        return {
          handler: route.handler,
          params,
        };
      }
    }

    return null;
  }

  /**
   * Parse route pattern into regex and parameter names
   * @private
   */
  _parsePattern(pattern) {
    const params = [];
    const parts = pattern.split('/').filter(p => p !== ''); // Remove empty parts
    const regexParts = [];
    
    for (const part of parts) {
      if (part.startsWith(':')) {
        // Parameter
        const paramName = part.substring(1);
        params.push(paramName);
        regexParts.push('([^/]+)');
      } else if (part === '*') {
        // Wildcard
        regexParts.push('.*');
      } else {
        // Literal - escape regex special chars
        regexParts.push(part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
      }
    }
    
    // Build regex pattern
    const regexPattern = '^/' + regexParts.join('/') + '/?$';

    return {
      regex: new RegExp(regexPattern),
      params,
    };
  }

  /**
   * Calculate route specificity (higher = more specific)
   * @private
   */
  _calculateSpecificity(pattern) {
    let specificity = 0;
    
    // Count static segments
    const staticSegments = pattern.split('/').filter(seg => 
      seg && !seg.startsWith(':') && seg !== '*'
    );
    specificity += staticSegments.length * 10;

    // Count parameters (less specific)
    const params = (pattern.match(/:[^/]+/g) || []).length;
    specificity += params * 5;

    // Wildcards are least specific
    if (pattern.includes('*')) {
      specificity -= 10;
    }

    return specificity;
  }

  /**
   * Get all registered routes
   * @returns {Object} - All routes grouped by method
   */
  getAllRoutes() {
    const allRoutes = {};
    for (const method in this.routes) {
      allRoutes[method] = this.routes[method].map(route => ({
        pattern: route.pattern,
        params: route.params,
      }));
    }
    return allRoutes;
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

  /**
   * Register PATCH route
   */
  patch(path, handler) {
    this.register('PATCH', path, handler);
  }
}

module.exports = AdvancedRouter;

