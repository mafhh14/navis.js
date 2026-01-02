/**
 * Authentication and Authorization Middleware
 * v4: JWT, API Key, and role-based access control
 */

const crypto = require('crypto');

class AuthenticationError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }
}

class AuthorizationError extends Error {
  constructor(message, statusCode = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

/**
 * JWT Authentication Middleware
 * @param {Object} options - JWT options
 * @returns {Function} - Middleware function
 */
function authenticateJWT(options = {}) {
  const {
    secret = process.env.JWT_SECRET,
    algorithms = ['HS256'],
    header = 'authorization',
    extractToken = (req) => {
      const authHeader = req.headers[header] || req.headers[header.toLowerCase()];
      if (!authHeader) return null;
      
      // Support "Bearer <token>" format
      const parts = authHeader.split(' ');
      return parts.length === 2 && parts[0].toLowerCase() === 'bearer' 
        ? parts[1] 
        : authHeader;
    },
  } = options;

  if (!secret) {
    throw new Error('JWT secret is required');
  }

  return async (req, res, next) => {
    try {
      const token = extractToken(req);

      if (!token) {
        throw new AuthenticationError('No authentication token provided');
      }

      // Simple JWT decode and verify (for HS256)
      // In production, use a proper JWT library like jsonwebtoken
      const decoded = verifyJWT(token, secret);
      
      if (!decoded) {
        throw new AuthenticationError('Invalid or expired token');
      }

      // Attach user info to request
      req.user = decoded;
      req.token = token;

      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.statusCode = error.statusCode;
        res.body = { error: error.message };
        return;
      }
      throw error;
    }
  };
}

/**
 * Simple JWT verification (HS256 only)
 * For production, use jsonwebtoken library
 * @private
 */
function verifyJWT(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Verify signature
    const signature = Buffer.from(signatureB64, 'base64url').toString('hex');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * API Key Authentication Middleware
 * @param {Object} options - API Key options
 * @returns {Function} - Middleware function
 */
function authenticateAPIKey(options = {}) {
  const {
    header = 'x-api-key',
    keys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [],
    validateKey = (key) => keys.includes(key),
  } = options;

  return async (req, res, next) => {
    try {
      const apiKey = req.headers[header] || req.headers[header.toLowerCase()];

      if (!apiKey) {
        throw new AuthenticationError('API key is required');
      }

      const isValid = await validateKey(apiKey);

      if (!isValid) {
        throw new AuthenticationError('Invalid API key');
      }

      req.apiKey = apiKey;
      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.statusCode = error.statusCode;
        res.body = { error: error.message };
        return;
      }
      throw error;
    }
  };
}

/**
 * Role-based Authorization Middleware
 * @param {string|Array} allowedRoles - Allowed roles
 * @returns {Function} - Middleware function
 */
function authorize(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const userRoles = req.user.roles || req.user.role ? [req.user.role] : [];

      const hasRole = roles.some(role => userRoles.includes(role));

      if (!hasRole) {
        throw new AuthorizationError('Insufficient permissions');
      }

      next();
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        res.statusCode = error.statusCode;
        res.body = { error: error.message };
        return;
      }
      throw error;
    }
  };
}

/**
 * Optional authentication (doesn't fail if no token)
 * @param {Object} options - JWT options
 * @returns {Function} - Middleware function
 */
function optionalAuth(options = {}) {
  const jwtAuth = authenticateJWT(options);

  return async (req, res, next) => {
    try {
      await jwtAuth(req, res, () => {
        // Continue even if auth fails
        next();
      });
    } catch (error) {
      // If auth fails, continue without user
      next();
    }
  };
}

module.exports = {
  authenticateJWT,
  authenticateAPIKey,
  authorize,
  optionalAuth,
  AuthenticationError,
  AuthorizationError,
};

