/**
 * Cache Middleware
 * v5: Response caching middleware
 * v5.8.3: AdvancedCache, Redis, and in-memory Cache TTL compatibility
 */

/**
 * Detect AdvancedCache instances (options-object TTL API)
 * @param {*} store
 * @returns {boolean}
 */
function isAdvancedCache(store) {
  return store && typeof store.invalidateByTag === 'function' && typeof store.flush === 'function';
}

/**
 * Detect Redis cache adapter (TTL in seconds)
 * @param {*} store
 * @returns {boolean}
 */
function isRedisCache(store) {
  return store && typeof store.connect === 'function' && typeof store.disconnect === 'function';
}

/**
 * Set a value using the correct TTL format for each cache store
 * @param {*} cacheStore
 * @param {string} key
 * @param {*} value
 * @param {number} ttlSeconds
 * @returns {Promise<void>}
 */
async function setCacheValue(cacheStore, key, value, ttlSeconds) {
  const ttlMs = ttlSeconds * 1000;

  if (isAdvancedCache(cacheStore)) {
    await cacheStore.set(key, value, { ttl: ttlMs });
    return;
  }

  if (isRedisCache(cacheStore)) {
    await cacheStore.set(key, value, ttlSeconds);
    return;
  }

  const result = cacheStore.set(key, value, ttlMs);
  if (result && typeof result.then === 'function') {
    await result;
  }
}

/**
 * Create cache middleware
 * @param {Object} options - Cache options
 * @returns {Function} - Middleware function
 */
function cache(options = {}) {
  const {
    ttl = 3600, // 1 hour in seconds
    keyGenerator = (req) => {
      // Default: method + path + query string
      const queryStr = JSON.stringify(req.query || {});
      return `${req.method}:${req.path}:${queryStr}`;
    },
    cacheStore = null, // Must be provided
    skipCache = (req, res) => {
      // Skip cache for non-GET requests or if status >= 400
      return req.method !== 'GET' || (res.statusCode && res.statusCode >= 400);
    },
    vary = [], // Vary headers
  } = options;

  if (!cacheStore) {
    throw new Error('cacheStore is required');
  }

  return async (req, res, next) => {
    // Generate cache key
    const cacheKey = keyGenerator(req);
    
    // Check if should skip cache
    if (skipCache(req, res)) {
      return next();
    }

    // Try to get from cache
    try {
      const cached = await (cacheStore.get ? cacheStore.get(cacheKey) : cacheStore.get(cacheKey));
      
      if (cached) {
        // Set cache headers
        res.headers = res.headers || {};
        res.headers['X-Cache'] = 'HIT';
        res.headers['Cache-Control'] = `public, max-age=${ttl}`;
        
        // Set Vary headers
        if (vary.length > 0) {
          res.headers['Vary'] = vary.join(', ');
        }

        // Return cached response
        res.statusCode = cached.statusCode || 200;
        res.body = cached.body;
        return;
      }
    } catch (error) {
      // Cache error - continue without cache
      console.error('Cache get error:', error);
    }

    // Cache miss - continue to handler
    res.headers = res.headers || {};
    res.headers['X-Cache'] = 'MISS';

    // Store original end/finish to capture response
    const originalBody = res.body;
    const originalStatusCode = res.statusCode;

    // Wrap response to cache it
    const originalFinish = res.finish || (() => {});
    res.finish = async function(...args) {
      // Only cache successful GET requests
      if (req.method === 'GET' && res.statusCode < 400) {
        try {
          const cacheValue = {
            statusCode: res.statusCode,
            body: res.body,
            headers: res.headers,
          };

          await setCacheValue(cacheStore, cacheKey, cacheValue, ttl);
        } catch (error) {
          console.error('Cache set error:', error);
        }
      }

      return originalFinish.apply(this, args);
    };

    next();
  };
}

module.exports = cache;

