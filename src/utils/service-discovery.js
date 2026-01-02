/**
 * Service Discovery - Basic service discovery mechanism
 * v2: Service discovery for microservice architectures
 */

class ServiceDiscovery {
  constructor(options = {}) {
    this.services = new Map(); // name -> { urls: [], currentIndex: 0, health: {} }
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
    this.healthCheckTimeout = options.healthCheckTimeout || 5000; // 5 seconds
    this.healthCheckPath = options.healthCheckPath || '/health';
    this.enabled = options.enabled !== false; // Enabled by default
  }

  /**
   * Register a service with multiple endpoints (for load balancing)
   * @param {string} name - Service name
   * @param {string|Array} urls - Service URL(s)
   */
  register(name, urls) {
    const urlArray = Array.isArray(urls) ? urls : [urls];
    this.services.set(name, {
      urls: urlArray,
      currentIndex: 0,
      health: {},
    });

    if (this.enabled) {
      this._startHealthCheck(name);
    }
  }

  /**
   * Get next available service URL (round-robin)
   * @param {string} name - Service name
   * @returns {string|null} - Service URL or null if not found
   */
  getNext(name) {
    const service = this.services.get(name);
    if (!service || service.urls.length === 0) {
      return null;
    }

    // Simple round-robin
    const url = service.urls[service.currentIndex];
    service.currentIndex = (service.currentIndex + 1) % service.urls.length;
    
    return url;
  }

  /**
   * Get all healthy URLs for a service
   * @param {string} name - Service name
   * @returns {Array} - Array of healthy URLs
   */
  getHealthy(name) {
    const service = this.services.get(name);
    if (!service) {
      return [];
    }

    return service.urls.filter(url => {
      const health = service.health[url];
      return !health || health.status === 'healthy' || Date.now() - health.lastCheck > this.healthCheckInterval * 2;
    });
  }

  /**
   * Mark service URL as unhealthy
   * @param {string} name - Service name
   * @param {string} url - Service URL
   */
  markUnhealthy(name, url) {
    const service = this.services.get(name);
    if (service) {
      service.health[url] = {
        status: 'unhealthy',
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * Mark service URL as healthy
   * @param {string} name - Service name
   * @param {string} url - Service URL
   */
  markHealthy(name, url) {
    const service = this.services.get(name);
    if (service) {
      service.health[url] = {
        status: 'healthy',
        lastCheck: Date.now(),
      };
    }
  }

  /**
   * Start health check for a service
   * @private
   */
  _startHealthCheck(name) {
    const service = this.services.get(name);
    if (!service) {
      return;
    }

    // Check health for each URL
    service.urls.forEach(url => {
      this._checkHealth(name, url);
    });

    // Schedule next health check
    setTimeout(() => {
      this._startHealthCheck(name);
    }, this.healthCheckInterval);
  }

  /**
   * Check health of a service URL
   * @private
   */
  async _checkHealth(name, url) {
    try {
      const http = require('http');
      const https = require('https');
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const healthUrl = new URL(this.healthCheckPath, url);

      const result = await new Promise((resolve, reject) => {
        const req = client.request({
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: healthUrl.pathname,
          method: 'GET',
          timeout: this.healthCheckTimeout,
        }, (res) => {
          let body = '';
          res.on('data', chunk => { body += chunk; });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, body });
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Health check timeout'));
        });

        req.end();
      });

      if (result.statusCode === 200) {
        this.markHealthy(name, url);
      } else {
        this.markUnhealthy(name, url);
      }
    } catch (error) {
      this.markUnhealthy(name, url);
    }
  }

  /**
   * Unregister a service
   * @param {string} name - Service name
   */
  unregister(name) {
    this.services.delete(name);
  }

  /**
   * Get all registered services
   * @returns {Array} - Array of service names
   */
  list() {
    return Array.from(this.services.keys());
  }
}

module.exports = ServiceDiscovery;

