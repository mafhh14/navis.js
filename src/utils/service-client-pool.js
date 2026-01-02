/**
 * ServiceClient Pool - Connection reuse for Lambda
 * v3.1: Connection pooling to reduce cold start overhead
 */

const ServiceClient = require('./service-client');

class ServiceClientPool {
  constructor() {
    this.clients = new Map();
    this.maxSize = 10; // Maximum cached clients
  }

  /**
   * Get or create a ServiceClient instance
   * Reuses existing clients to avoid re-initialization
   * @param {string} baseUrl - Service base URL
   * @param {Object} options - ServiceClient options
   * @returns {ServiceClient} - Cached or new ServiceClient
   */
  get(baseUrl, options = {}) {
    // Create a unique key for this client configuration
    const key = this._createKey(baseUrl, options);
    
    if (!this.clients.has(key)) {
      // Create new client if not in pool
      const client = new ServiceClient(baseUrl, options);
      this.clients.set(key, client);
      
      // Limit pool size (remove oldest if needed)
      if (this.clients.size > this.maxSize) {
        const firstKey = this.clients.keys().next().value;
        this.clients.delete(firstKey);
      }
    }
    
    return this.clients.get(key);
  }

  /**
   * Check if a client exists in pool
   * @param {string} baseUrl - Service base URL
   * @param {Object} options - ServiceClient options
   * @returns {boolean} - True if client exists in pool
   */
  has(baseUrl, options = {}) {
    const key = this._createKey(baseUrl, options);
    return this.clients.has(key);
  }

  /**
   * Remove a client from pool
   * @param {string} baseUrl - Service base URL
   * @param {Object} options - ServiceClient options
   */
  delete(baseUrl, options = {}) {
    const key = this._createKey(baseUrl, options);
    this.clients.delete(key);
  }

  /**
   * Clear all clients from pool
   */
  clear() {
    this.clients.clear();
  }

  /**
   * Get pool size
   * @returns {number} - Number of cached clients
   */
  size() {
    return this.clients.size;
  }

  /**
   * Get all cached client URLs
   * @returns {Array} - Array of base URLs
   */
  getCachedUrls() {
    return Array.from(this.clients.keys()).map(key => {
      const [url] = key.split('::');
      return url;
    });
  }

  /**
   * Create unique key for client
   * @private
   */
  _createKey(baseUrl, options) {
    // Normalize options to create consistent key
    const normalizedOptions = {
      timeout: options.timeout || 5000,
      maxRetries: options.maxRetries,
      retryBaseDelay: options.retryBaseDelay,
      circuitBreaker: options.circuitBreaker ? JSON.stringify(options.circuitBreaker) : undefined,
    };
    
    return `${baseUrl}::${JSON.stringify(normalizedOptions)}`;
  }
}

// Singleton instance for Lambda (reused across invocations)
let poolInstance = null;

/**
 * Get singleton ServiceClientPool instance
 * In Lambda, this instance persists across invocations
 * @returns {ServiceClientPool} - Singleton pool instance
 */
function getPool() {
  if (!poolInstance) {
    poolInstance = new ServiceClientPool();
  }
  return poolInstance;
}

/**
 * Reset pool (useful for testing)
 */
function resetPool() {
  poolInstance = null;
}

module.exports = {
  ServiceClientPool,
  getPool,
  resetPool,
};

