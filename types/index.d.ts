/**
 * Navis.js TypeScript Definitions
 * v5.3: Full TypeScript support
 */

// ============================================
// Core Types
// ============================================

export interface NavisRequest {
  method: string;
  path: string;
  url?: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  params?: Record<string, string>;
  event?: any;
  apiVersion?: string;
  files?: FileUpload[];
}

export interface NavisResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: any;
  writeHead?: (statusCode: number, headers?: Record<string, string>) => void;
  setHeader?: (name: string, value: string) => void;
  end?: (body?: any) => void;
  finish?: (...args: any[]) => void;
  sse?: {
    send: (data: any, event?: string, id?: string) => boolean;
    close: () => void;
  };
}

export type Middleware = (req: NavisRequest, res: NavisResponse, next: () => Promise<void>) => Promise<void> | void;
export type RouteHandler = (req: NavisRequest, res: NavisResponse) => Promise<void> | void | Promise<any> | any;

export interface NavisAppOptions {
  useAdvancedRouter?: boolean;
}

export interface NavisApp {
  use(fn: Middleware): void;
  get(path: string, ...handlers: (Middleware | RouteHandler)[]): void;
  post(path: string, ...handlers: (Middleware | RouteHandler)[]): void;
  put(path: string, ...handlers: (Middleware | RouteHandler)[]): void;
  delete(path: string, ...handlers: (Middleware | RouteHandler)[]): void;
  patch(path: string, ...handlers: (Middleware | RouteHandler)[]): void;
  listen(port?: number, callback?: () => void): any;
  handleLambda(event: any): Promise<any>;
  getServer(): any;
}

// ============================================
// Service Client Types
// ============================================

export interface ServiceClientOptions {
  timeout?: number;
  maxRetries?: number;
  retryBaseDelay?: number;
  retryMaxDelay?: number;
  retryStatusCodes?: number[];
  circuitBreaker?: CircuitBreakerOptions;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenMaxAttempts?: number;
}

export interface ServiceClientResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
}

export interface ServiceClient {
  get(path: string, options?: ServiceClientOptions): Promise<ServiceClientResponse>;
  post(path: string, data?: any, options?: ServiceClientOptions): Promise<ServiceClientResponse>;
  put(path: string, data?: any, options?: ServiceClientOptions): Promise<ServiceClientResponse>;
  delete(path: string, options?: ServiceClientOptions): Promise<ServiceClientResponse>;
  patch(path: string, data?: any, options?: ServiceClientOptions): Promise<ServiceClientResponse>;
  getCircuitBreakerState(): string;
  resetCircuitBreaker(): void;
}

// ============================================
// Response Types
// ============================================

export interface ResponseHelpers {
  success(context: NavisResponse, data: any, statusCode?: number, isLambda?: boolean): void;
  error(context: NavisResponse, message: string, statusCode?: number, isLambda?: boolean): void;
}

// ============================================
// Retry Types
// ============================================

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryCondition?: (error: any, response?: any) => boolean;
}

export interface RetryHelpers {
  retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
  shouldRetryHttpStatus(statusCode: number): boolean;
}

// ============================================
// Circuit Breaker Types
// ============================================

export interface CircuitBreaker {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  isOpen(): boolean;
  reset(): void;
}

// ============================================
// Service Config Types
// ============================================

export interface ServiceConfigOptions {
  defaultOptions?: ServiceClientOptions;
}

export interface ServiceConfig {
  register(name: string, baseUrl: string, options?: ServiceClientOptions): void;
  get(name: string): { baseUrl: string; options?: ServiceClientOptions } | null;
  getAll(): Record<string, { baseUrl: string; options?: ServiceClientOptions }>;
  unregister(name: string): void;
}

// ============================================
// Service Discovery Types
// ============================================

export interface ServiceDiscoveryOptions {
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  healthCheckPath?: string;
}

export interface ServiceDiscovery {
  register(name: string, urls: string[], options?: ServiceDiscoveryOptions): void;
  getNext(name: string): string | null;
  getAll(name: string): string[];
  unregister(name: string): void;
  getHealthyUrls(name: string): string[];
}

// ============================================
// Observability Types
// ============================================

export interface LoggerOptions {
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  context?: Record<string, any>;
}

export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  setLevel(level: string): void;
  getLevel(): string;
}

export interface Metrics {
  increment(name: string, value?: number, labels?: Record<string, string>): void;
  decrement(name: string, value?: number, labels?: Record<string, string>): void;
  gauge(name: string, value: number, labels?: Record<string, string>): void;
  histogram(name: string, value: number, labels?: Record<string, string>): void;
  recordRequest(method: string, path: string, duration: number, statusCode: number): void;
  toPrometheus(): string;
  reset(): void;
}

export interface TracerOptions {
  serviceName?: string;
}

export interface Tracer {
  startTrace(name: string, meta?: Record<string, any>): string;
  startSpan(name: string, options?: { traceId?: string; meta?: Record<string, any> }): string;
  finishSpan(spanId: string, meta?: Record<string, any>): void;
  getTrace(traceId: string): { traceId: string; spans: any[] } | null;
}

// ============================================
// Messaging Types
// ============================================

export interface SQSMessagingOptions {
  region?: string;
  queueUrl?: string;
}

export interface SQSMessaging {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(queueUrl: string, message: any, options?: any): Promise<void>;
  subscribe(queueUrl: string, handler: (message: any, metadata: any) => Promise<void>): Promise<void>;
}

export interface KafkaMessagingOptions {
  brokers: string[];
  clientId?: string;
  consumerGroupId?: string;
}

export interface KafkaMessaging {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: any, options?: any): Promise<void>;
  subscribe(topic: string, handler: (message: any, metadata: any) => Promise<void>): Promise<void>;
}

export interface NATSMessagingOptions {
  servers: string[];
}

export interface NATSMessaging {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(subject: string, message: any): Promise<void>;
  subscribe(subject: string, handler: (message: any) => Promise<void>): Promise<void>;
}

// ============================================
// Lambda Optimization Types
// ============================================

export interface ServiceClientPool {
  get(baseUrl: string, options?: ServiceClientOptions): ServiceClient;
  clear(): void;
  size(): number;
}

export interface LazyInitOptions {
  timeout?: number;
}

export interface LazyInit {
  init<T>(initFn: () => Promise<T>): Promise<T>;
  reset(): void;
  isInitialized(): boolean;
}

export interface LambdaHandlerOptions {
  enableMetrics?: boolean;
  warmupPath?: string;
}

export interface LambdaHandler {
  handle(event: any, context?: any): Promise<any>;
  getStats(): any;
  isWarm(): boolean;
}

// ============================================
// Advanced Features Types (v4)
// ============================================

export interface ValidationSchema {
  body?: Record<string, ValidationRule>;
  query?: Record<string, ValidationRule>;
  params?: Record<string, ValidationRule>;
  headers?: Record<string, ValidationRule>;
}

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string | RegExp;
  format?: 'email' | 'uuid' | 'url';
  enum?: any[];
  items?: ValidationRule;
  properties?: Record<string, ValidationRule>;
  custom?: (value: any) => boolean | string;
}

export interface ValidationError extends Error {
  field: string;
  message: string;
  code: string;
}

export interface AuthOptions {
  secret?: string;
  algorithm?: string;
  issuer?: string;
  audience?: string;
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimiter {
  check(key: string): { allowed: boolean; remaining: number; resetTime: number };
  reset(key: string): void;
  clear(): void;
}

// ============================================
// Enterprise Features Types (v5)
// ============================================

export interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  cleanupInterval?: number;
}

export interface Cache {
  set(key: string, value: any, ttl?: number): void;
  get(key: string): any;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
  size(): number;
  keys(): string[];
  destroy(): void;
}

export interface RedisCacheOptions {
  url?: string;
  defaultTTL?: number;
  prefix?: string;
}

export interface RedisCache {
  connect(options?: any): Promise<void>;
  disconnect(): Promise<void>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  get(key: string): Promise<any>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

export interface CacheMiddlewareOptions {
  cacheStore: Cache | RedisCache;
  ttl?: number;
  keyGenerator?: (req: NavisRequest) => string;
  skipCache?: (req: NavisRequest, res: NavisResponse) => boolean;
  vary?: string[];
}

export interface CORSOptions {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
}

export interface SecurityOptions {
  helmet?: boolean;
  hsts?: boolean;
  hstsMaxAge?: number;
  hstsIncludeSubDomains?: boolean;
  hstsPreload?: boolean;
  noSniff?: boolean;
  xssFilter?: boolean;
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false;
  contentSecurityPolicy?: boolean | Record<string, string[]>;
  referrerPolicy?: string;
  permissionsPolicy?: Record<string, string>;
}

export interface CompressionOptions {
  level?: number;
  threshold?: number;
  algorithm?: 'gzip' | 'brotli';
  filter?: (req: NavisRequest, res: NavisResponse) => boolean;
}

export interface HealthCheckOptions {
  livenessPath?: string;
  readinessPath?: string;
  checks?: Record<string, () => Promise<boolean>>;
  enabled?: boolean;
}

export interface HealthChecker {
  addCheck(name: string, checkFn: () => Promise<boolean>): void;
  removeCheck(name: string): void;
  runChecks(includeReadiness?: boolean): Promise<any>;
  middleware(): Middleware;
}

export interface GracefulShutdownOptions {
  timeout?: number;
  onShutdown?: () => Promise<void>;
  signals?: string[];
  log?: (message: string) => void;
}

// ============================================
// Developer Experience Types (v5.1)
// ============================================

export interface SwaggerOptions {
  title?: string;
  version?: string;
  description?: string;
  path?: string;
  uiPath?: string;
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
}

export interface SwaggerGenerator {
  addRoute(method: string, path: string, spec?: any): void;
  addSchema(name: string, schema: any): void;
  addSecurityScheme(name: string, scheme: any): void;
  generate(): any;
  toJSON(): string;
}

export interface SwaggerMiddleware {
  generator: SwaggerGenerator;
  middleware: Middleware;
}

export interface VersionManager {
  version(version: string): {
    get: (path: string, handler: RouteHandler) => void;
    post: (path: string, handler: RouteHandler) => void;
    put: (path: string, handler: RouteHandler) => void;
    delete: (path: string, handler: RouteHandler) => void;
    patch: (path: string, handler: RouteHandler) => void;
    use: (middleware: Middleware) => void;
  };
  setDefaultVersion(version: string): void;
  getRoutes(version: string): any;
  getVersions(): string[];
}

export interface HeaderVersioningOptions {
  header?: string;
  defaultVersion?: string;
}

export interface FileUploadOptions {
  dest?: string;
  limits?: {
    fileSize?: number;
    files?: number;
  };
  fileFilter?: (file: FileUpload) => boolean;
  preserveExtension?: boolean;
  generateFilename?: (file: FileUpload) => string;
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
  stream?: any;
}

export interface TestApp {
  get(path: string, options?: any): Promise<TestResponse>;
  post(path: string, data?: any, options?: any): Promise<TestResponse>;
  put(path: string, data?: any, options?: any): Promise<TestResponse>;
  delete(path: string, options?: any): Promise<TestResponse>;
  patch(path: string, data?: any, options?: any): Promise<TestResponse>;
}

export interface TestResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  json(): any;
  text(): string;
}

// ============================================
// Real-time Features Types (v5.2)
// ============================================

export interface WebSocketServerOptions {
  server?: any;
  path?: string;
}

export interface WebSocketClient {
  id: string;
  socket: any;
  request: any;
  send(data: any): boolean;
  close(): void;
}

export interface WebSocketServer {
  attach(server: any): void;
  on(path: string, handler: (message: any, client: WebSocketClient) => void): void;
  onConnection(handler: (client: WebSocketClient) => void): void;
  onDisconnection(handler: (client: WebSocketClient) => void): void;
  broadcast(data: any): void;
  getClients(): WebSocketClient[];
}

export interface SSEServer {
  middleware(): Middleware;
  broadcast(data: any, event?: string): void;
  getClients(): any[];
}

export interface DatabasePoolOptions {
  type?: 'postgres' | 'postgresql' | 'mysql' | 'mariadb' | 'mongodb';
  connectionString?: string;
  maxConnections?: number;
  minConnections?: number;
  idleTimeout?: number;
}

export interface DatabasePool {
  connect(): Promise<void>;
  query(query: string, params?: any[]): Promise<any>;
  getConnection(): Promise<any>;
  close(): Promise<void>;
  ping(): Promise<boolean>;
}

// ============================================
// Main Exports
// ============================================

export const NavisApp: {
  new (options?: NavisAppOptions): NavisApp;
};

export const ServiceClient: {
  new (baseUrl: string, options?: ServiceClientOptions): ServiceClient;
};

export const ServiceConfig: {
  new (options?: ServiceConfigOptions): ServiceConfig;
};

export const ServiceDiscovery: {
  new (): ServiceDiscovery;
};

export const CircuitBreaker: {
  new (options?: CircuitBreakerOptions): CircuitBreaker;
};

export const Logger: {
  new (options?: LoggerOptions): Logger;
};

export const Metrics: {
  new (): Metrics;
};

export const Tracer: {
  new (options?: TracerOptions): Tracer;
};

export const SQSMessaging: {
  new (options?: SQSMessagingOptions): SQSMessaging;
};

export const KafkaMessaging: {
  new (options?: KafkaMessagingOptions): KafkaMessaging;
};

export const NATSMessaging: {
  new (options?: NATSMessagingOptions): NATSMessaging;
};

export const ServiceClientPool: {
  new (): ServiceClientPool;
};

export const LazyInit: {
  new (options?: LazyInitOptions): LazyInit;
};

export const LambdaHandler: {
  new (app: NavisApp, options?: LambdaHandlerOptions): LambdaHandler;
};

export const AdvancedRouter: {
  new (): any;
};

export const RateLimiter: {
  new (options?: RateLimitOptions): RateLimiter;
};

export const Cache: {
  new (options?: CacheOptions): Cache;
};

export const RedisCache: {
  new (options?: RedisCacheOptions): RedisCache;
};

export const HealthChecker: {
  new (options?: HealthCheckOptions): HealthChecker;
};

export const SwaggerGenerator: {
  new (options?: SwaggerOptions): SwaggerGenerator;
};

export const VersionManager: {
  new (): VersionManager;
};

export const TestApp: {
  new (app: NavisApp): TestApp;
};

export const WebSocketServer: {
  new (options?: WebSocketServerOptions): WebSocketServer;
};

export const SSEServer: {
  new (): SSEServer;
};

export const DatabasePool: {
  new (options?: DatabasePoolOptions): DatabasePool;
};

// ============================================
// GraphQL Types (v5.4)
// ============================================

export interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

export interface GraphQLResponse {
  data?: any;
  errors?: GraphQLError[];
}

export interface GraphQLError {
  message: string;
  code?: string;
  extensions?: Record<string, any>;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
}

export interface GraphQLContext {
  req: NavisRequest;
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
  [key: string]: any;
}

export type GraphQLResolver = (
  variables: Record<string, any>,
  context: GraphQLContext,
  fields?: string[]
) => Promise<any> | any;

export interface GraphQLResolverOptions {
  validate?: (variables: Record<string, any>) => Promise<{ valid: boolean; errors?: string[] }>;
  authorize?: (context: GraphQLContext) => Promise<boolean>;
  cache?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl?: number) => Promise<void>;
    key?: (variables: Record<string, any>, context: GraphQLContext) => string;
    ttl?: number;
  };
  errorHandler?: (error: Error, variables: Record<string, any>, context: GraphQLContext) => Promise<any>;
}

export interface GraphQLServerOptions {
  schema?: any;
  resolvers?: {
    Query?: Record<string, GraphQLResolver | { resolve: GraphQLResolver }>;
    Mutation?: Record<string, GraphQLResolver | { resolve: GraphQLResolver }>;
    [key: string]: any;
  };
  context?: (req: NavisRequest) => Promise<Record<string, any>> | Record<string, any>;
  formatError?: (error: Error) => GraphQLError;
  introspection?: boolean;
}

export interface GraphQLHandlerOptions {
  path?: string;
  method?: string;
  enableGET?: boolean;
}

export interface GraphQLSchema {
  type(name: string, definition: any): GraphQLSchema;
  query(name: string, definition: any): GraphQLSchema;
  mutation(name: string, definition: any): GraphQLSchema;
  build(): string;
}

export interface GraphQLTypes {
  input(name: string, fields: Record<string, string>): string;
  list(type: string): string;
  required(type: string): string;
  requiredList(type: string): string;
}

export interface GraphQLScalars {
  String: string;
  Int: string;
  Float: string;
  Boolean: string;
  ID: string;
}

export interface GraphQLAsyncResolverOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: Error) => boolean;
}

export interface GraphQLBatchResolverOptions {
  batchKey?: (variables: Record<string, any>) => string;
  batchSize?: number;
  waitTime?: number;
}

export const GraphQLServer: {
  new (options?: GraphQLServerOptions): GraphQLServer;
};

export interface GraphQLServer {
  handler(options?: GraphQLHandlerOptions): Middleware;
}

export const GraphQLSchema: {
  new (): GraphQLSchema;
};

export const GraphQLError: {
  new (message: string, code?: string, extensions?: Record<string, any>): Error;
};

// Functions
export function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
export function shouldRetryHttpStatus(statusCode: number): boolean;
export function validate(schema: ValidationSchema): Middleware;
export function authenticateJWT(options?: AuthOptions): Middleware;
export function authenticateAPIKey(options?: AuthOptions): Middleware;
export function authorize(roles: string[]): Middleware;
export function optionalAuth(options?: AuthOptions): Middleware;
export function rateLimit(options?: RateLimitOptions): Middleware;
export function errorHandler(): Middleware;
export function asyncHandler(fn: RouteHandler): RouteHandler;
export function notFoundHandler(): RouteHandler;
export function cache(options: CacheMiddlewareOptions): Middleware;
export function cors(options?: CORSOptions): Middleware;
export function security(options?: SecurityOptions): Middleware;
export function compress(options?: CompressionOptions): Middleware;
export function swagger(options?: SwaggerOptions): SwaggerMiddleware;
export function createVersionManager(): VersionManager;
export function headerVersioning(options?: HeaderVersioningOptions): Middleware;
export function upload(options?: FileUploadOptions): Middleware;
export function saveFile(file: FileUpload, dest: string, generateFilename?: (file: FileUpload) => string): Promise<string>;
export function testApp(app: NavisApp): TestApp;
export function sse(): Middleware;
export function createSSEServer(): SSEServer;
export function createPool(options?: DatabasePoolOptions): DatabasePool;
export function createHealthChecker(options?: HealthCheckOptions): HealthChecker;
export function gracefulShutdown(server: any, options?: GracefulShutdownOptions): any;
export function getPool(): ServiceClientPool;
export function createLazyInit(initFn: () => Promise<any>, options?: LazyInitOptions): LazyInit;
export function coldStartTracker(): Middleware;
export function createGraphQLServer(options?: GraphQLServerOptions): GraphQLServer;
export function graphql(options?: GraphQLServerOptions): Middleware;
export function createSchema(): GraphQLSchema;
export function type(name: string, definition: any): GraphQLSchema;
export function createResolver<T = any>(resolverFn: GraphQLResolver, options?: GraphQLResolverOptions): GraphQLResolver;
export function fieldResolver(fieldName: string, resolverFn: GraphQLResolver): Record<string, GraphQLResolver>;
export function combineResolvers(...resolvers: any[]): any;
export function createAsyncResolver(resolverFn: GraphQLResolver, options?: GraphQLAsyncResolverOptions): GraphQLResolver;
export function createBatchResolver(resolverFn: GraphQLResolver, options?: GraphQLBatchResolverOptions): GraphQLResolver;

// GraphQL Constants
export const scalars: GraphQLScalars;
export const types: GraphQLTypes;

// Error Classes
export class ValidationError extends Error {
  field: string;
  code: string;
}

export class AuthenticationError extends Error {}
export class AuthorizationError extends Error {}
export class AppError extends Error {
  statusCode: number;
}
export class NotFoundError extends AppError {}
export class BadRequestError extends AppError {}
export class UnauthorizedError extends AppError {}
export class ForbiddenError extends AppError {}
export class ConflictError extends AppError {}
export class InternalServerError extends AppError {}

// Response and Retry helpers
export const response: ResponseHelpers;
export const retry: RetryHelpers;

