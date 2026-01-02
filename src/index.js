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

// v3.1: Lambda Optimizations
const { getPool, ServiceClientPool } = require('./utils/service-client-pool');
const { LazyInit, createLazyInit } = require('./utils/lazy-init');
const LambdaHandler = require('./core/lambda-handler');
const { coldStartTracker } = require('./middleware/cold-start-tracker');

// v4: Advanced Features
const AdvancedRouter = require('./core/advanced-router');
const { validate, ValidationError } = require('./validation/validator');
const {
  authenticateJWT,
  authenticateAPIKey,
  authorize,
  optionalAuth,
  AuthenticationError,
  AuthorizationError,
} = require('./auth/authenticator');
const { rateLimit, RateLimiter } = require('./middleware/rate-limiter');
const {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
} = require('./errors/error-handler');

// v5: Enterprise Features
const Cache = require('./cache/cache');
const RedisCache = require('./cache/redis-cache');
const cache = require('./middleware/cache-middleware');
const cors = require('./middleware/cors');
const security = require('./middleware/security');
const compress = require('./middleware/compression');
const { HealthChecker, createHealthChecker } = require('./health/health-checker');
const gracefulShutdown = require('./core/graceful-shutdown');

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
  
  // v3.1: Lambda Optimizations
  ServiceClientPool,
  getPool,
  LazyInit,
  createLazyInit,
  LambdaHandler,
  coldStartTracker,
  
  // v4: Advanced Features
  AdvancedRouter,
  validate,
  ValidationError,
  authenticateJWT,
  authenticateAPIKey,
  authorize,
  optionalAuth,
  AuthenticationError,
  AuthorizationError,
  rateLimit,
  RateLimiter,
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  
  // v5: Enterprise Features
  Cache,
  RedisCache,
  cache,
  cors,
  security,
  compress,
  HealthChecker,
  createHealthChecker,
  gracefulShutdown,
  
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
