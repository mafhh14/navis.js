const NavisApp = require('./core/app');
const ServiceClient = require('./utils/service-client');
const ServiceConfig = require('./utils/service-config');
const ServiceDiscovery = require('./utils/service-discovery');
const CircuitBreaker = require('./utils/circuit-breaker');
const { success, error } = require('./utils/response');
const { retry, shouldRetryHttpStatus } = require('./utils/retry');
const { applyLazyExports } = require('./utils/lazy-export');

// v3: Observability
const Logger = require('./observability/logger');
const Metrics = require('./observability/metrics');
const Tracer = require('./observability/tracer');
const { AlertManager, createAlertManager } = require('./observability/alerter');

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
const {
  verifyMobileSignature,
  createMobileChallenge,
  createBiometricToken,
  verifyBiometricToken,
  verifyBluetoothSignature,
  createBluetoothChallenge,
  authenticateMobile,
  authenticateFace,
  authenticateBiometric,
  authenticateBluetooth,
  authenticateDevice,
  sign,
} = require('./auth/mobile-auth');
const {
  WebAuthnStore,
  createWebAuthnStore,
  createRegistrationOptions,
  completeRegistration,
  createAuthenticationOptions,
  verifyAuthentication,
  authenticateWebAuthn,
  createTestCredential,
  signTestAuthentication,
} = require('./auth/webauthn');
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
const AdvancedCache = require('./cache/advanced-cache');
const cache = require('./middleware/cache-middleware');
const cors = require('./middleware/cors');
const security = require('./middleware/security');
const compress = require('./middleware/compression');
const { HealthChecker, createHealthChecker } = require('./health/health-checker');
const gracefulShutdown = require('./core/graceful-shutdown');

// v5.1: Developer Experience
const { VersionManager, createVersionManager, headerVersioning } = require('./core/versioning');
const { upload, saveFile } = require('./middleware/upload');
const { TestApp, testApp } = require('./testing/test-helper');

// v5.2: Real-time Features
const { SSEServer, createSSEServer, sse } = require('./sse/server-sent-events');
const { DatabasePool, createPool, queryBuilder, mongoQueryBuilder } = require('./db/db-pool');
const { Model } = require('./db/model');
const { Migration, createMigration } = require('./db/migration');

const api = {
  // Core
  NavisApp,

  // Service Client (v2 enhanced)
  ServiceClient,

  // v2 Features
  ServiceConfig,
  ServiceDiscovery,
  CircuitBreaker,

  // v3: Observability
  Logger,
  Metrics,
  Tracer,
  AlertManager,
  createAlertManager,

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
  verifyMobileSignature,
  createMobileChallenge,
  createBiometricToken,
  verifyBiometricToken,
  verifyBluetoothSignature,
  createBluetoothChallenge,
  authenticateMobile,
  authenticateFace,
  authenticateBiometric,
  authenticateBluetooth,
  authenticateDevice,
  sign,
  WebAuthnStore,
  createWebAuthnStore,
  createRegistrationOptions,
  completeRegistration,
  createAuthenticationOptions,
  verifyAuthentication,
  authenticateWebAuthn,
  createTestCredential,
  signTestAuthentication,
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
  AdvancedCache,
  cache,
  cors,
  security,
  compress,
  HealthChecker,
  createHealthChecker,
  gracefulShutdown,

  // v5.1: Developer Experience
  VersionManager,
  createVersionManager,
  headerVersioning,
  upload,
  saveFile,
  TestApp,
  testApp,

  // v5.2: Real-time Features
  SSEServer,
  createSSEServer,
  sse,
  DatabasePool,
  createPool,
  queryBuilder,
  mongoQueryBuilder,
  Model,
  Migration,
  createMigration,

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

// v7.1: Lazy-load optional/heavy modules (messaging, GraphQL, gRPC, Redis, WebSocket, Swagger)
applyLazyExports(api);

module.exports = api;
