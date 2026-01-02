/**
 * Redis Cache Adapter
 * v5: Redis-based caching (requires redis package)
 */

class RedisCache {
  constructor(options = {}) {
    this.client = null;
    this.defaultTTL = options.defaultTTL || 3600; // 1 hour in seconds
    this.prefix = options.prefix || 'navis:';
    this.connected = false;
    
    // Try to require redis (optional dependency)
    try {
      const redis = require('redis');
      this.redis = redis;
    } catch (error) {
      throw new Error('Redis package not installed. Install with: npm install redis');
    }
  }

  /**
   * Connect to Redis
   * @param {Object} options - Redis connection options
   */
  async connect(options = {}) {
    if (this.connected && this.client) {
      return;
    }

    const {
      url = process.env.REDIS_URL || 'redis://localhost:6379',
      socket = {},
      ...otherOptions
    } = options;

    this.client = this.redis.createClient({
      url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return new Error('Too many reconnection attempts');
          }
          return Math.min(retries * 100, 3000);
        },
        ...socket,
      },
      ...otherOptions,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await this.client.connect();
    this.connected = true;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = null) {
    if (!this.connected) {
      throw new Error('Redis not connected. Call connect() first.');
    }

    const fullKey = this.prefix + key;
    const serialized = JSON.stringify(value);
    const expiration = ttl || this.defaultTTL;

    if (expiration > 0) {
      await this.client.setEx(fullKey, expiration, serialized);
    } else {
      await this.client.set(fullKey, serialized);
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or null
   */
  async get(key) {
    if (!this.connected) {
      throw new Error('Redis not connected. Call connect() first.');
    }

    const fullKey = this.prefix + key;
    const serialized = await this.client.get(fullKey);

    if (!serialized) {
      return null;
    }

    try {
      return JSON.parse(serialized);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if key exists
   */
  async has(key) {
    if (!this.connected) {
      return false;
    }

    const fullKey = this.prefix + key;
    const exists = await this.client.exists(fullKey);
    return exists === 1;
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if key was deleted
   */
  async delete(key) {
    if (!this.connected) {
      return false;
    }

    const fullKey = this.prefix + key;
    const result = await this.client.del(fullKey);
    return result > 0;
  }

  /**
   * Clear all cache entries with prefix
   */
  async clear() {
    if (!this.connected) {
      return;
    }

    const keys = await this.client.keys(this.prefix + '*');
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  /**
   * Get cache size (approximate)
   * @returns {number} - Number of keys with prefix
   */
  async size() {
    if (!this.connected) {
      return 0;
    }

    const keys = await this.client.keys(this.prefix + '*');
    return keys.length;
  }
}

module.exports = RedisCache;

