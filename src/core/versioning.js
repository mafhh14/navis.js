/**
 * API Versioning
 * v5.1: URL-based and header-based API versioning
 */

class VersionManager {
  constructor() {
    this.versions = new Map();
    this.defaultVersion = null;
  }

  /**
   * Create a version router
   * @param {string} version - Version identifier (e.g., 'v1', 'v2')
   * @returns {Object} - Version router with route methods
   */
  version(version) {
    if (!this.versions.has(version)) {
      const router = {
        version,
        routes: {
          GET: [],
          POST: [],
          PUT: [],
          DELETE: [],
          PATCH: [],
        },
      };
      this.versions.set(version, router);
    }

    const router = this.versions.get(version);

    return {
      get: (path, handler) => this._register(router, 'GET', path, handler),
      post: (path, handler) => this._register(router, 'POST', path, handler),
      put: (path, handler) => this._register(router, 'PUT', path, handler),
      delete: (path, handler) => this._register(router, 'DELETE', path, handler),
      patch: (path, handler) => this._register(router, 'PATCH', path, handler),
      use: (middleware) => {
        if (!router.middlewares) {
          router.middlewares = [];
        }
        router.middlewares.push(middleware);
      },
    };
  }

  /**
   * Register a route for a version
   * @private
   */
  _register(router, method, path, handler) {
    const versionedPath = `/${router.version}${path}`;
    router.routes[method].push({
      path: versionedPath,
      originalPath: path,
      handler,
    });
  }

  /**
   * Set default version
   * @param {string} version - Default version
   */
  setDefaultVersion(version) {
    this.defaultVersion = version;
  }

  /**
   * Get routes for a version
   * @param {string} version - Version identifier
   * @returns {Object} - Routes for the version
   */
  getRoutes(version) {
    const router = this.versions.get(version);
    return router ? router.routes : null;
  }

  /**
   * Get all versions
   * @returns {Array} - Array of version identifiers
   */
  getVersions() {
    return Array.from(this.versions.keys());
  }
}

/**
 * Create version manager
 * @returns {VersionManager} - Version manager instance
 */
function createVersionManager() {
  return new VersionManager();
}

/**
 * Header-based versioning middleware
 * @param {Object} options - Versioning options
 * @returns {Function} - Middleware function
 */
function headerVersioning(options = {}) {
  const {
    header = 'X-API-Version',
    defaultVersion = null,
  } = options;

  return async (req, res, next) => {
    const version = req.headers[header] || req.headers[header.toLowerCase()] || defaultVersion;
    
    if (version) {
      req.apiVersion = version;
    }

    next();
  };
}

module.exports = {
  VersionManager,
  createVersionManager,
  headerVersioning,
};

