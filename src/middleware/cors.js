/**
 * CORS Middleware
 * v5: Cross-Origin Resource Sharing support
 */

/**
 * CORS middleware
 * @param {Object} options - CORS options
 * @returns {Function} - Middleware function
 */
function cors(options = {}) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders = [],
    credentials = false,
    maxAge = 86400, // 24 hours
    preflightContinue = false,
  } = options;

  // Normalize origin
  const allowedOrigins = Array.isArray(origin) ? origin : [origin];
  const isWildcard = allowedOrigins.includes('*');

  return async (req, res, next) => {
    const requestOrigin = req.headers.origin || req.headers.Origin;

    // Determine allowed origin
    let allowedOrigin = null;
    if (isWildcard) {
      allowedOrigin = '*';
    } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      allowedOrigin = requestOrigin;
    } else if (allowedOrigins.length === 1 && allowedOrigins[0] !== '*') {
      allowedOrigin = allowedOrigins[0];
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.headers = res.headers || {};
      
      if (allowedOrigin) {
        res.headers['Access-Control-Allow-Origin'] = allowedOrigin;
      }
      
      res.headers['Access-Control-Allow-Methods'] = methods.join(', ');
      res.headers['Access-Control-Allow-Headers'] = allowedHeaders.join(', ');
      res.headers['Access-Control-Max-Age'] = maxAge.toString();

      if (credentials) {
        res.headers['Access-Control-Allow-Credentials'] = 'true';
      }

      if (exposedHeaders.length > 0) {
        res.headers['Access-Control-Expose-Headers'] = exposedHeaders.join(', ');
      }

      if (!preflightContinue) {
        res.statusCode = 204;
        res.body = null;
        return;
      }
    }

    // Set CORS headers for all responses
    res.headers = res.headers || {};
    
    if (allowedOrigin) {
      res.headers['Access-Control-Allow-Origin'] = allowedOrigin;
    }

    if (credentials && allowedOrigin && allowedOrigin !== '*') {
      res.headers['Access-Control-Allow-Credentials'] = 'true';
    }

    if (exposedHeaders.length > 0) {
      res.headers['Access-Control-Expose-Headers'] = exposedHeaders.join(', ');
    }

    next();
  };
}

module.exports = cors;

