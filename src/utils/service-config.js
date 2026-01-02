/**
 * Service Configuration Manager
 * v2: Config-based service management for microservices
 */

class ServiceConfig {
  constructor(config = {}) {
    this.services = config.services || {};
    this.defaultOptions = config.defaultOptions || {
      timeout: 5000,
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000,
      },
    };
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {string} baseUrl - Service base URL
   * @param {Object} options - Service-specific options
   */
  register(name, baseUrl, options = {}) {
    this.services[name] = {
      baseUrl,
      ...this.defaultOptions,
      ...options,
    };
  }

  /**
   * Get service configuration
   * @param {string} name - Service name
   * @returns {Object|null} - Service configuration or null if not found
   */
  get(name) {
    return this.services[name] || null;
  }

  /**
   * Get all registered services
   * @returns {Object} - All service configurations
   */
  getAll() {
    return { ...this.services };
  }

  /**
   * Remove a service
   * @param {string} name - Service name
   */
  unregister(name) {
    delete this.services[name];
  }

  /**
   * Load services from configuration object
   * @param {Object} config - Configuration object with services
   */
  load(config) {
    if (config.services) {
      this.services = { ...this.services, ...config.services };
    }
    if (config.defaultOptions) {
      this.defaultOptions = { ...this.defaultOptions, ...config.defaultOptions };
    }
  }

  /**
   * Export current configuration
   * @returns {Object} - Current configuration
   */
  export() {
    return {
      services: this.services,
      defaultOptions: this.defaultOptions,
    };
  }
}

module.exports = ServiceConfig;

