/**
 * Lazy Initialization Utility
 * v3.1: Defer heavy initialization until needed (reduces cold start time)
 */

class LazyInit {
  constructor(options = {}) {
    this.initialized = false;
    this.initPromise = null;
    this.initFn = null;
    this.autoInit = options.autoInit !== false; // Auto-init on first access
    this.cacheResult = options.cacheResult !== false; // Cache initialization result
    this.cachedResult = null;
  }

  /**
   * Initialize with a function
   * @param {Function} initFn - Initialization function (can be async)
   * @returns {Promise} - Initialization promise
   */
  async init(initFn) {
    if (this.initialized && this.cacheResult) {
      return this.cachedResult;
    }

    if (!this.initPromise) {
      this.initFn = initFn;
      this.initPromise = Promise.resolve(initFn()).then(result => {
        this.initialized = true;
        if (this.cacheResult) {
          this.cachedResult = result;
        }
        return result;
      }).catch(error => {
        // Reset on error so it can be retried
        this.initPromise = null;
        throw error;
      });
    }

    return this.initPromise;
  }

  /**
   * Check if initialized
   * @returns {boolean} - True if initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get cached result (if available)
   * @returns {*} - Cached initialization result
   */
  getCached() {
    return this.cachedResult;
  }

  /**
   * Reset initialization state
   */
  reset() {
    this.initialized = false;
    this.initPromise = null;
    this.cachedResult = null;
  }

  /**
   * Execute function with lazy initialization
   * @param {Function} fn - Function to execute after initialization
   * @returns {Promise} - Result of function execution
   */
  async withInit(fn) {
    if (!this.initialized && this.initFn) {
      await this.init(this.initFn);
    }
    return await fn(this.cachedResult);
  }
}

/**
 * Create a lazy initializer
 * @param {Function} initFn - Initialization function
 * @param {Object} options - Options
 * @returns {LazyInit} - LazyInit instance
 */
function createLazyInit(initFn, options = {}) {
  const lazy = new LazyInit(options);
  if (initFn) {
    lazy.initFn = initFn;
  }
  return lazy;
}

module.exports = {
  LazyInit,
  createLazyInit,
};

