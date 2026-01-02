/**
 * In-Memory Cache
 * v5: Simple in-memory caching with TTL support
 */

class Cache {
  constructor(options = {}) {
    this.store = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hour in ms
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute
    
    // Start cleanup interval
    this.intervalId = setInterval(() => {
      this._cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = null) {
    const expiration = Date.now() + (ttl || this.defaultTTL);
    
    // Remove oldest entries if at max size
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this._evictOldest();
    }
    
    this.store.set(key, {
      value,
      expiration,
    });
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or null
   */
  get(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiration) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if key exists and not expired
   */
  has(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (Date.now() > entry.expiration) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if key was deleted
   */
  delete(key) {
    return this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get cache size
   * @returns {number} - Number of entries
   */
  size() {
    return this.store.size;
  }

  /**
   * Get all keys
   * @returns {Array} - Array of cache keys
   */
  keys() {
    return Array.from(this.store.keys());
  }

  /**
   * Cleanup expired entries
   * @private
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiration) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Evict oldest entry (LRU-like)
   * @private
   */
  _evictOldest() {
    let oldestKey = null;
    let oldestExpiration = Infinity;
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiration < oldestExpiration) {
        oldestExpiration = entry.expiration;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Destroy cache (cleanup)
   */
  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.clear();
  }
}

module.exports = Cache;

