const NavisApp = require('./core/app');
const ServiceClient = require('./utils/service-client');
const ServiceConfig = require('./utils/service-config');
const ServiceDiscovery = require('./utils/service-discovery');
const CircuitBreaker = require('./utils/circuit-breaker');
const { success, error } = require('./utils/response');
const { retry, shouldRetryHttpStatus } = require('./utils/retry');

// v3: Async Messaging
const SQSMessaging = require('./messaging/sqs-adapter');
const KafkaMessaging = require('./messaging/kafka-adapter');
const NATSMessaging = require('./messaging/nats-adapter');

// v3: Observability
const Logger = require('./observability/logger');
const Metrics = require('./observability/metrics');
const Tracer = require('./observability/tracer');

module.exports = {
  // Core
  NavisApp,
  
  // Service Client (v2 enhanced)
  ServiceClient,
  
  // v2 Features
  ServiceConfig,
  ServiceDiscovery,
  CircuitBreaker,
  
  // v3: Async Messaging
  SQSMessaging,
  KafkaMessaging,
  NATSMessaging,
  
  // v3: Observability
  Logger,
  Metrics,
  Tracer,
  
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
