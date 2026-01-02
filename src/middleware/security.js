/**
 * Security Headers Middleware
 * v5: Security headers for protection against common attacks
 */

/**
 * Security headers middleware
 * @param {Object} options - Security options
 * @returns {Function} - Middleware function
 */
function security(options = {}) {
  const {
    helmet = true,
    hsts = true,
    hstsMaxAge = 31536000, // 1 year
    hstsIncludeSubDomains = true,
    hstsPreload = false,
    noSniff = true,
    xssFilter = true,
    frameOptions = 'DENY', // DENY, SAMEORIGIN, or false
    contentSecurityPolicy = false,
    cspDirectives = {},
    referrerPolicy = 'no-referrer',
    permissionsPolicy = {},
  } = options;

  return async (req, res, next) => {
    res.headers = res.headers || {};

    // X-Content-Type-Options
    if (noSniff) {
      res.headers['X-Content-Type-Options'] = 'nosniff';
    }

    // X-XSS-Protection
    if (xssFilter) {
      res.headers['X-XSS-Protection'] = '1; mode=block';
    }

    // X-Frame-Options
    if (frameOptions) {
      res.headers['X-Frame-Options'] = frameOptions;
    }

    // Strict-Transport-Security (HSTS)
    if (hsts && req.headers['x-forwarded-proto'] === 'https') {
      let hstsValue = `max-age=${hstsMaxAge}`;
      if (hstsIncludeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      if (hstsPreload) {
        hstsValue += '; preload';
      }
      res.headers['Strict-Transport-Security'] = hstsValue;
    }

    // Content-Security-Policy
    if (contentSecurityPolicy) {
      const directives = {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        ...cspDirectives,
      };

      const cspValue = Object.entries(directives)
        .map(([key, values]) => {
          const valuesStr = Array.isArray(values) ? values.join(' ') : values;
          return `${key} ${valuesStr}`;
        })
        .join('; ');

      res.headers['Content-Security-Policy'] = cspValue;
    }

    // Referrer-Policy
    if (referrerPolicy) {
      res.headers['Referrer-Policy'] = referrerPolicy;
    }

    // Permissions-Policy (formerly Feature-Policy)
    if (Object.keys(permissionsPolicy).length > 0) {
      const policyValue = Object.entries(permissionsPolicy)
        .map(([feature, allowlist]) => {
          const allowlistStr = Array.isArray(allowlist) ? allowlist.join(', ') : allowlist;
          return `${feature}=${allowlistStr}`;
        })
        .join(', ');

      res.headers['Permissions-Policy'] = policyValue;
    }

    // X-Powered-By removal (security through obscurity)
    if (helmet) {
      // Remove X-Powered-By if present
      delete res.headers['X-Powered-By'];
    }

    next();
  };
}

module.exports = security;

