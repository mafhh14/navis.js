const http = require('http');
const https = require('https');

/**
 * ServiceClient - Lightweight HTTP client for service-to-service calls
 * v1: Basic get() and post() with timeout support
 */

class ServiceClient {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout || 5000; // Default 5s timeout
    // TODO v2: Add retry logic
    // TODO v2: Add circuit breaker
    // TODO v2: Add config-based services
  }

  /**
   * Make HTTP request
   * @private
   */
  _request(method, path, data = null, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        timeout: options.timeout || this.timeout,
      };

      const req = client.request(requestOptions, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const parsedBody = body ? JSON.parse(body) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: parsedBody,
            });
          } catch (err) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: body,
            });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * GET request
   * @param {string} path - Request path
   * @param {Object} options - Request options
   */
  async get(path, options = {}) {
    return this._request('GET', path, null, options);
  }

  /**
   * POST request
   * @param {string} path - Request path
   * @param {Object} data - Request body data
   * @param {Object} options - Request options
   */
  async post(path, data, options = {}) {
    return this._request('POST', path, data, options);
  }

  // TODO v2: Add PUT, DELETE, PATCH methods
  // TODO v2: Add service discovery integration
}

module.exports = ServiceClient;