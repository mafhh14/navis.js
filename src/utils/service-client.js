const http = require('http');
const https = require('https');
const CircuitBreaker = require('./circuit-breaker');
const { retry, shouldRetryHttpStatus } = require('./retry');

/**
 * ServiceClient - Lightweight HTTP client for service-to-service calls
 * v2: Enhanced with retry logic, circuit breaker, and additional HTTP methods
 */

class ServiceClient {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout || 5000; // Default 5s timeout
    
    // Retry configuration
    this.retryConfig = {
      maxRetries: options.maxRetries !== undefined ? options.maxRetries : 3,
      baseDelay: options.retryBaseDelay || 1000,
      maxDelay: options.retryMaxDelay || 30000,
      enabled: options.retry !== false, // Enabled by default
    };

    // Circuit breaker configuration
    this.circuitBreakerEnabled = options.circuitBreaker !== false; // Enabled by default
    if (this.circuitBreakerEnabled) {
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: options.circuitBreakerThreshold || 5,
        resetTimeout: options.circuitBreakerResetTimeout || 60000,
      });
    }
  }

  /**
   * Make HTTP request (internal, without retry/circuit breaker)
   * @private
   */
  _requestInternal(method, path, data = null, options = {}) {
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
            const response = {
              statusCode: res.statusCode,
              headers: res.headers,
              data: parsedBody,
            };
            
            // Check if response indicates failure
            if (res.statusCode >= 400) {
              const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage || 'Request failed'}`);
              error.statusCode = res.statusCode;
              error.response = response;
              reject(error);
            } else {
              resolve(response);
            }
          } catch (err) {
            // JSON parsing failed - reject with error instead of silently resolving
            const parseError = new Error(`Failed to parse JSON response: ${err.message}`);
            parseError.statusCode = res.statusCode;
            parseError.headers = res.headers;
            parseError.rawBody = body;
            parseError.parseError = err;
            reject(parseError);
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
   * Make HTTP request with retry and circuit breaker
   * @private
   */
  async _request(method, path, data = null, options = {}) {
    // Check circuit breaker
    if (this.circuitBreakerEnabled && this.circuitBreaker) {
      if (!this.circuitBreaker.canAttempt()) {
        const error = new Error('Circuit breaker is OPEN - service unavailable');
        error.circuitBreakerOpen = true;
        error.circuitState = this.circuitBreaker.getState();
        throw error;
      }
    }

    // Execute request with retry if enabled
    const executeRequest = async () => {
      try {
        const result = await this._requestInternal(method, path, data, options);
        
        // Record success in circuit breaker
        if (this.circuitBreakerEnabled && this.circuitBreaker) {
          this.circuitBreaker.recordSuccess();
        }
        
        return result;
      } catch (error) {
        // Record failure in circuit breaker
        if (this.circuitBreakerEnabled && this.circuitBreaker) {
          this.circuitBreaker.recordFailure();
        }
        throw error;
      }
    };

    if (this.retryConfig.enabled) {
      return retry(executeRequest, {
        maxRetries: this.retryConfig.maxRetries,
        baseDelay: this.retryConfig.baseDelay,
        maxDelay: this.retryConfig.maxDelay,
        shouldRetry: (error) => {
          // Don't retry if circuit breaker is open
          if (error.circuitBreakerOpen) {
            return false;
          }
          // Retry on network errors or 5xx/429 status codes
          if (error.statusCode) {
            return shouldRetryHttpStatus(error.statusCode);
          }
          // Retry on network/timeout errors
          return true;
        },
      });
    }

    return executeRequest();
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

  /**
   * PUT request
   * @param {string} path - Request path
   * @param {Object} data - Request body data
   * @param {Object} options - Request options
   */
  async put(path, data, options = {}) {
    return this._request('PUT', path, data, options);
  }

  /**
   * DELETE request
   * @param {string} path - Request path
   * @param {Object} options - Request options
   */
  async delete(path, options = {}) {
    return this._request('DELETE', path, null, options);
  }

  /**
   * PATCH request
   * @param {string} path - Request path
   * @param {Object} data - Request body data
   * @param {Object} options - Request options
   */
  async patch(path, data, options = {}) {
    return this._request('PATCH', path, data, options);
  }

  /**
   * Get circuit breaker state
   * @returns {Object} - Circuit breaker state information
   */
  getCircuitBreakerState() {
    if (!this.circuitBreakerEnabled || !this.circuitBreaker) {
      return null;
    }
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker() {
    if (this.circuitBreakerEnabled && this.circuitBreaker) {
      this.circuitBreaker.reset();
    }
  }
}

module.exports = ServiceClient;