/**
 * Rate Limiting Middleware
 * v4: In-memory rate limiting with configurable windows
 */

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.max = options.max || 100; // 100 requests default
    this.store = new Map(); // In-memory store
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.keyGenerator = options.keyGenerator || ((req) => {
      // Default: IP address
      return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] ||
             'unknown';
    });

    // Cleanup old entries periodically
    this.cleanupInterval = setInterval(() => {
      this._cleanup();
    }, this.windowMs);
  }

  /**
   * Rate limit middleware
   * @returns {Function} - Middleware function
   */
  middleware() {
    const self = this; // Capture 'this' reference
    
    return async (req, res, next) => {
      const key = self.keyGenerator(req);
      const now = Date.now();

      // Get or create rate limit entry
      let entry = self.store.get(key);

      if (!entry || now - entry.resetTime > self.windowMs) {
        // Create new entry or reset expired one
        entry = {
          count: 0,
          resetTime: now + self.windowMs,
        };
        self.store.set(key, entry);
      }

      // Increment count
      entry.count++;

      // Set rate limit headers
      res.headers = res.headers || {};
      res.headers['X-RateLimit-Limit'] = self.max.toString();
      res.headers['X-RateLimit-Remaining'] = Math.max(0, self.max - entry.count).toString();
      res.headers['X-RateLimit-Reset'] = new Date(entry.resetTime).toISOString();

      // Check if limit exceeded
      if (entry.count > self.max) {
        res.statusCode = 429;
        res.body = {
          error: 'Too many requests',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        };
        return;
      }

      // Track response status for skip options
      const originalStatusCode = res.statusCode;
      const originalFinish = res.finish || (() => {});
      
      // Wrap response finish to track status
      res.finish = function(...args) {
        const statusCode = res.statusCode || 200;
        
        if (self.skipSuccessfulRequests && statusCode < 400) {
          entry.count = Math.max(0, entry.count - 1);
        }
        
        if (self.skipFailedRequests && statusCode >= 400) {
          entry.count = Math.max(0, entry.count - 1);
        }

        return originalFinish.apply(this, args);
      };

      next();
    };
  }

  /**
   * Cleanup expired entries
   * @private
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.resetTime > this.windowMs) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a key
   * @param {string} key - Rate limit key
   */
  reset(key) {
    this.store.delete(key);
  }

  /**
   * Get rate limit info for a key
   * @param {string} key - Rate limit key
   * @returns {Object|null} - Rate limit info
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.resetTime > this.windowMs) {
      this.store.delete(key);
      return null;
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.max - entry.count),
      resetTime: entry.resetTime,
    };
  }

  /**
   * Destroy rate limiter (cleanup)
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Create rate limit middleware
 * @param {Object} options - Rate limit options
 * @returns {Function} - Middleware function
 */
function rateLimit(options = {}) {
  const limiter = new RateLimiter(options);
  return limiter.middleware();
}

module.exports = {
  rateLimit,
  RateLimiter,
};

