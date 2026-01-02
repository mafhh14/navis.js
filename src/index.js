const NavisApp = require('./core/app');
const ServiceClient = require('./utils/service-client');
const ServiceConfig = require('./utils/service-config');
const ServiceDiscovery = require('./utils/service-discovery');
const CircuitBreaker = require('./utils/circuit-breaker');
const { success, error } = require('./utils/response');
const { retry, shouldRetryHttpStatus } = require('./utils/retry');

module.exports = {
  // Core
  NavisApp,
  
  // Service Client (v2 enhanced)
  ServiceClient,
  
  // v2 Features
  ServiceConfig,
  ServiceDiscovery,
  CircuitBreaker,
  
  // Utilities
  response: {
    success,
    error,
  },
  retry: {
    retry,
    shouldRetryHttpStatus,
  },
};
