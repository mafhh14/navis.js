/**
 * Testing Utilities
 * v5.1: Test helpers for Navis.js applications
 */

const http = require('http');

class TestApp {
  constructor(app) {
    this.app = app;
  }

  /**
   * Make a GET request
   * @param {string} path - Request path
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response object
   */
  async get(path, options = {}) {
    return this._request('GET', path, null, options);
  }

  /**
   * Make a POST request
   * @param {string} path - Request path
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response object
   */
  async post(path, data = null, options = {}) {
    return this._request('POST', path, data, options);
  }

  /**
   * Make a PUT request
   * @param {string} path - Request path
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response object
   */
  async put(path, data = null, options = {}) {
    return this._request('PUT', path, data, options);
  }

  /**
   * Make a DELETE request
   * @param {string} path - Request path
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response object
   */
  async delete(path, options = {}) {
    return this._request('DELETE', path, null, options);
  }

  /**
   * Make a PATCH request
   * @param {string} path - Request path
   * @param {Object} data - Request body
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - Response object
   */
  async patch(path, data = null, options = {}) {
    return this._request('PATCH', path, data, options);
  }

  /**
   * Make an HTTP request
   * @private
   */
  async _request(method, path, data = null, options = {}) {
    return new Promise((resolve, reject) => {
      const req = {
        method,
        url: path,
        path,
        headers: options.headers || {},
        query: options.query || {},
        params: options.params || {},
        body: data,
      };

      const res = {
        statusCode: 200,
        headers: {},
        body: null,
        writeHead: (statusCode, headers) => {
          res.statusCode = statusCode;
          res.headers = { ...res.headers, ...headers };
        },
        setHeader: (name, value) => {
          res.headers[name] = value;
        },
        end: (body) => {
          res.body = body;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: res.body,
            json: () => {
              try {
                return typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
              } catch (e) {
                return res.body;
              }
            },
            text: () => {
              return typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
            },
          });
        },
      };

      // Handle Lambda format
      if (options.lambda) {
        const event = {
          httpMethod: method,
          path,
          headers: req.headers,
          body: data ? JSON.stringify(data) : null,
          queryStringParameters: req.query,
        };

        this.app.handleLambda(event)
          .then((lambdaResponse) => {
            resolve({
              statusCode: lambdaResponse.statusCode,
              headers: lambdaResponse.headers || {},
              body: lambdaResponse.body,
              json: () => {
                try {
                  return typeof lambdaResponse.body === 'string' 
                    ? JSON.parse(lambdaResponse.body) 
                    : lambdaResponse.body;
                } catch (e) {
                  return lambdaResponse.body;
                }
              },
              text: () => {
                return typeof lambdaResponse.body === 'string' 
                  ? lambdaResponse.body 
                  : JSON.stringify(lambdaResponse.body);
              },
            });
          })
          .catch(reject);
      } else {
        // Handle Node.js format
        this.app.handleRequest(req, res).catch(reject);
      }
    });
  }
}

/**
 * Create test app helper
 * @param {NavisApp} app - NavisApp instance
 * @returns {TestApp} - Test app helper
 */
function testApp(app) {
  return new TestApp(app);
}

module.exports = {
  TestApp,
  testApp,
};

