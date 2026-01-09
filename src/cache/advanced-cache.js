/**
 * Advanced Caching Strategies
 * v5.8: Multi-level caching, cache warming, invalidation, statistics, and more
 */

const Cache = require('./cache');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Advanced Cache with multiple strategies
 */
class AdvancedCache {
  constructor(options = {}) {
    // Multi-level cache: L1 (in-memory), L2 (Redis/remote)
    this.l1Cache = options.l1Cache || new Cache({
      maxSize: options.l1MaxSize || 1000,
      defaultTTL: options.l1TTL || 300000, // 5 minutes
    });
    
    this.l2Cache = options.l2Cache || null; // Optional Redis or other remote cache
    
    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      l1Hits: 0,
      l2Hits: 0,
    };
    
    // Cache invalidation tags
    this.tagStore = new Map(); // tag -> Set of keys
    this.keyTags = new Map(); // key -> Set of tags
    
    // Cache warming
    this.warmingQueue = [];
    this.isWarming = false;
    
    // Cache compression
    this.compressThreshold = options.compressThreshold || 1024; // Compress values > 1KB
    
    // Cache stampede prevention
    this.pendingGets = new Map(); // key -> Promise
    
    // Write strategy: 'write-through', 'write-back', 'write-around'
    this.writeStrategy = options.writeStrategy || 'write-through';
    this.writeBackQueue = [];
    
    // Cache versioning
    this.version = options.version || '1.0';
    this.versionPrefix = `v${this.version}:`;
  }

  /**
   * Get value from cache (multi-level)
   * @param {string} key - Cache key
   * @returns {Promise<*>} - Cached value or null
   */
  async get(key) {
    const fullKey = this.versionPrefix + key;
    
    // Prevent cache stampede
    if (this.pendingGets.has(fullKey)) {
      return this.pendingGets.get(fullKey);
    }
    
    const getPromise = this._getInternal(fullKey);
    this.pendingGets.set(fullKey, getPromise);
    
    try {
      const result = await getPromise;
      return result;
    } finally {
      this.pendingGets.delete(fullKey);
    }
  }

  /**
   * Internal get with multi-level lookup
   * @private
   */
  async _getInternal(fullKey) {
    // Try L1 cache first
    const l1Value = this.l1Cache.get(fullKey);
    if (l1Value !== null) {
      this.stats.hits++;
      this.stats.l1Hits++;
      return await this._decompress(l1Value);
    }
    
    // Try L2 cache if available
    if (this.l2Cache) {
      try {
        const l2Value = await this.l2Cache.get(fullKey);
        if (l2Value !== null) {
          this.stats.hits++;
          this.stats.l2Hits++;
          
          // Promote to L1
          const ttl = this._getRemainingTTL(fullKey);
          if (ttl > 0) {
            this.l1Cache.set(fullKey, l2Value, ttl);
          }
          
          return await this._decompress(l2Value);
        }
      } catch (error) {
        this.stats.errors++;
        // Continue to miss
      }
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {Object} options - Options (ttl, tags, compress)
   */
  async set(key, value, options = {}) {
    const fullKey = this.versionPrefix + key;
    const ttl = options.ttl || null;
    const tags = options.tags || [];
    const shouldCompress = options.compress !== false;
    
    // Compress if needed (always wrap in object for consistency)
    const processedValue = shouldCompress ? await this._compress(value) : { compressed: false, data: value };
    
    // Apply write strategy
    switch (this.writeStrategy) {
      case 'write-through':
        await this._writeThrough(fullKey, processedValue, ttl);
        break;
      case 'write-back':
        await this._writeBack(fullKey, processedValue, ttl);
        break;
      case 'write-around':
        await this._writeAround(fullKey, processedValue, ttl);
        break;
    }
    
    // Handle tags
    if (tags.length > 0) {
      this._addTags(fullKey, tags);
    }
    
    this.stats.sets++;
  }

  /**
   * Write-through: Write to both L1 and L2 immediately
   * @private
   */
  async _writeThrough(key, value, ttl) {
    // Write to L1
    this.l1Cache.set(key, value, ttl);
    
    // Write to L2 if available
    if (this.l2Cache) {
      try {
        if (this.l2Cache.set) {
          await this.l2Cache.set(key, value, ttl ? Math.floor(ttl / 1000) : null);
        } else {
          this.l2Cache.set(key, value, ttl);
        }
      } catch (error) {
        this.stats.errors++;
      }
    }
  }

  /**
   * Write-back: Write to L1, queue for L2
   * @private
   */
  async _writeBack(key, value, ttl) {
    // Write to L1 immediately
    this.l1Cache.set(key, value, ttl);
    
    // Queue for L2 write
    this.writeBackQueue.push({ key, value, ttl, timestamp: Date.now() });
    
    // Flush queue if it gets too large
    if (this.writeBackQueue.length > 100) {
      await this._flushWriteBackQueue();
    }
  }

  /**
   * Write-around: Write to L2 only, L1 populated on read
   * @private
   */
  async _writeAround(key, value, ttl) {
    // Write to L2 only
    if (this.l2Cache) {
      try {
        if (this.l2Cache.set) {
          await this.l2Cache.set(key, value, ttl ? Math.floor(ttl / 1000) : null);
        } else {
          this.l2Cache.set(key, value, ttl);
        }
      } catch (error) {
        this.stats.errors++;
      }
    }
  }

  /**
   * Flush write-back queue
   * @private
   */
  async _flushWriteBackQueue() {
    if (!this.l2Cache || this.writeBackQueue.length === 0) {
      return;
    }
    
    const items = this.writeBackQueue.splice(0);
    for (const item of items) {
      try {
        if (this.l2Cache.set) {
          await this.l2Cache.set(item.key, item.value, item.ttl ? Math.floor(item.ttl / 1000) : null);
        } else {
          this.l2Cache.set(item.key, item.value, item.ttl);
        }
      } catch (error) {
        this.stats.errors++;
      }
    }
  }

  /**
   * Delete from cache
   * @param {string} key - Cache key
   */
  async delete(key) {
    const fullKey = this.versionPrefix + key;
    
    // Delete from L1
    this.l1Cache.delete(fullKey);
    
    // Delete from L2
    if (this.l2Cache) {
      try {
        if (this.l2Cache.delete) {
          await this.l2Cache.delete(fullKey);
        } else {
          this.l2Cache.delete(fullKey);
        }
      } catch (error) {
        this.stats.errors++;
      }
    }
    
    // Remove tags
    this._removeTags(fullKey);
    
    this.stats.deletes++;
  }

  /**
   * Invalidate by tag
   * @param {string|Array<string>} tags - Tag(s) to invalidate
   */
  async invalidateByTag(tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    const keysToDelete = new Set();
    
    for (const tag of tagArray) {
      const keys = this.tagStore.get(tag);
      if (keys) {
        for (const key of keys) {
          keysToDelete.add(key);
        }
        this.tagStore.delete(tag);
      }
    }
    
    // Delete all keys
    for (const key of keysToDelete) {
      await this.delete(key.replace(this.versionPrefix, ''));
    }
  }

  /**
   * Invalidate by pattern
   * @param {string|RegExp} pattern - Pattern to match keys (without version prefix)
   */
  async invalidateByPattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete = [];
    
    // Check L1 cache (keys include version prefix)
    for (const fullKey of this.l1Cache.keys()) {
      // Remove version prefix for pattern matching
      const keyWithoutPrefix = fullKey.replace(this.versionPrefix, '');
      if (regex.test(keyWithoutPrefix)) {
        keysToDelete.push(keyWithoutPrefix);
      }
    }
    
    // Delete matched keys
    for (const key of keysToDelete) {
      await this.delete(key);
    }
  }

  /**
   * Add tags to a key
   * @private
   */
  _addTags(key, tags) {
    if (!this.keyTags.has(key)) {
      this.keyTags.set(key, new Set());
    }
    
    for (const tag of tags) {
      this.keyTags.get(key).add(tag);
      
      if (!this.tagStore.has(tag)) {
        this.tagStore.set(tag, new Set());
      }
      this.tagStore.get(tag).add(key);
    }
  }

  /**
   * Remove tags from a key
   * @private
   */
  _removeTags(key) {
    const tags = this.keyTags.get(key);
    if (tags) {
      for (const tag of tags) {
        const keys = this.tagStore.get(tag);
        if (keys) {
          keys.delete(key);
          if (keys.size === 0) {
            this.tagStore.delete(tag);
          }
        }
      }
      this.keyTags.delete(key);
    }
  }

  /**
   * Warm cache (pre-populate)
   * @param {Array<Object>} items - Array of {key, value, options}
   */
  async warm(items) {
    if (this.isWarming) {
      this.warmingQueue.push(...items);
      return;
    }
    
    this.isWarming = true;
    
    try {
      for (const item of items) {
        await this.set(item.key, item.value, item.options || {});
      }
      
      // Process queued items
      while (this.warmingQueue.length > 0) {
        const item = this.warmingQueue.shift();
        await this.set(item.key, item.value, item.options || {});
      }
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      total,
      hitRate: hitRate.toFixed(2) + '%',
      l1Size: this.l1Cache.size(),
      l2Size: this.l2Cache ? 'N/A' : 0, // Would need async call for Redis
      writeBackQueueSize: this.writeBackQueue.length,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      l1Hits: 0,
      l2Hits: 0,
    };
  }

  /**
   * Clear all cache
   */
  async clear() {
    this.l1Cache.clear();
    
    if (this.l2Cache) {
      try {
        if (this.l2Cache.clear) {
          await this.l2Cache.clear();
        } else {
          this.l2Cache.clear();
        }
      } catch (error) {
        this.stats.errors++;
      }
    }
    
    this.tagStore.clear();
    this.keyTags.clear();
    this.writeBackQueue = [];
  }

  /**
   * Compress value if needed
   * @private
   */
  async _compress(value) {
    const serialized = JSON.stringify(value);
    
    if (serialized.length < this.compressThreshold) {
      return { compressed: false, data: value };
    }
    
    try {
      const compressed = await gzip(serialized);
      return { compressed: true, data: compressed.toString('base64') };
    } catch (error) {
      // If compression fails, return uncompressed
      return { compressed: false, data: value };
    }
  }

  /**
   * Decompress value if needed
   * @private
   */
  async _decompress(value) {
    // If not an object or doesn't have compressed property, return as-is
    if (!value || typeof value !== 'object' || value.compressed === undefined) {
      return value;
    }
    
    // If compressed is false, return the data directly
    if (!value.compressed) {
      return value.data;
    }
    
    // Decompress if compressed
    try {
      const buffer = Buffer.from(value.data, 'base64');
      const decompressed = await gunzip(buffer);
      return JSON.parse(decompressed.toString());
    } catch (error) {
      // If decompression fails, return as-is
      return value;
    }
  }

  /**
   * Get remaining TTL for a key (approximate)
   * @private
   */
  _getRemainingTTL(key) {
    // This is a simplified version - would need to track TTL in real implementation
    return this.l1Cache.defaultTTL;
  }

  /**
   * Flush write-back queue (public method)
   */
  async flush() {
    await this._flushWriteBackQueue();
  }
}

module.exports = AdvancedCache;

