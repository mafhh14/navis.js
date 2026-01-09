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

// v5.1: Developer Experience
const { SwaggerGenerator, swagger } = require('./docs/swagger');
const { VersionManager, createVersionManager, headerVersioning } = require('./core/versioning');
const { upload, saveFile } = require('./middleware/upload');
const { TestApp, testApp } = require('./testing/test-helper');

// v5.2: Real-time Features
const WebSocketServer = require('./websocket/websocket-server');
const { SSEServer, createSSEServer, sse } = require('./sse/server-sent-events');
const { DatabasePool, createPool, queryBuilder, mongoQueryBuilder } = require('./db/db-pool');

// v5.4: GraphQL Support
const { GraphQLServer, GraphQLError, createGraphQLServer, graphql } = require('./graphql/graphql-server');
const { GraphQLSchema, createSchema, type, scalars, types } = require('./graphql/schema');
const {
  createResolver,
  fieldResolver,
  combineResolvers,
  createAsyncResolver,
  createBatchResolver,
} = require('./graphql/resolver');

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
  
  // v5.1: Developer Experience
  SwaggerGenerator,
  swagger,
  VersionManager,
  createVersionManager,
  headerVersioning,
  upload,
  saveFile,
  TestApp,
  testApp,
  
  // v5.2: Real-time Features
  WebSocketServer,
  SSEServer,
  createSSEServer,
  sse,
  DatabasePool,
  createPool,
  queryBuilder,
  mongoQueryBuilder,
  
  // v5.4: GraphQL Support
  GraphQLServer,
  GraphQLError,
  createGraphQLServer,
  graphql,
  GraphQLSchema,
  createSchema,
  type,
  scalars,
  types,
  createResolver,
  fieldResolver,
  combineResolvers,
  createAsyncResolver,
  createBatchResolver,
  
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
