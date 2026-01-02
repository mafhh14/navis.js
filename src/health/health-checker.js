/**
 * Health Check Middleware
 * v5: Liveness and readiness probes
 */

class HealthChecker {
  constructor(options = {}) {
    this.checks = options.checks || {};
    this.livenessPath = options.livenessPath || '/health/live';
    this.readinessPath = options.readinessPath || '/health/ready';
    this.enabled = options.enabled !== false;
  }

  /**
   * Add a health check
   * @param {string} name - Check name
   * @param {Function} checkFn - Async function that returns true/false or throws
   */
  addCheck(name, checkFn) {
    this.checks[name] = checkFn;
  }

  /**
   * Remove a health check
   * @param {string} name - Check name
   */
  removeCheck(name) {
    delete this.checks[name];
  }

  /**
   * Run all checks
   * @param {boolean} includeReadiness - Include readiness checks
   * @returns {Promise<Object>} - Health status
   */
  async runChecks(includeReadiness = true) {
    const results = {};
    let allHealthy = true;

    for (const [name, checkFn] of Object.entries(this.checks)) {
      try {
        const result = await checkFn();
        results[name] = {
          status: result === false ? 'unhealthy' : 'healthy',
          timestamp: new Date().toISOString(),
        };
        
        if (result === false) {
          allHealthy = false;
        }
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        allHealthy = false;
      }
    }

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create health check middleware
   * @returns {Function} - Middleware function
   */
  middleware() {
    return async (req, res, next) => {
      if (!this.enabled) {
        return next();
      }

      const path = req.path || req.url;

      // Liveness probe (always returns 200 if service is running)
      if (path === this.livenessPath) {
        res.statusCode = 200;
        res.headers = res.headers || {};
        res.headers['Content-Type'] = 'application/json';
        res.body = {
          status: 'alive',
          timestamp: new Date().toISOString(),
        };
        return;
      }

      // Readiness probe (checks all health checks)
      if (path === this.readinessPath) {
        const healthStatus = await this.runChecks(true);
        res.statusCode = healthStatus.status === 'healthy' ? 200 : 503;
        res.headers = res.headers || {};
        res.headers['Content-Type'] = 'application/json';
        res.body = healthStatus;
        return;
      }

      next();
    };
  }
}

/**
 * Create health checker
 * @param {Object} options - Health checker options
 * @returns {HealthChecker} - Health checker instance
 */
function createHealthChecker(options = {}) {
  return new HealthChecker(options);
}

module.exports = {
  HealthChecker,
  createHealthChecker,
};

