# Navis.js v5 Features

## Overview

v5 introduces enterprise-grade features to make Navis.js production-ready: caching, CORS, security headers, response compression, health checks, and graceful shutdown.

## New Features

### 1. Caching Layer

In-memory caching with TTL support and Redis adapter for distributed caching.

**Features:**
- In-memory cache with TTL
- LRU eviction when max size reached
- Automatic cleanup of expired entries
- Redis adapter for distributed caching
- Response caching middleware

**Usage:**

```javascript
const { Cache, RedisCache, cache } = require('navis.js');

// In-memory cache
const cacheStore = new Cache({
  maxSize: 1000,
  defaultTTL: 3600000, // 1 hour
});

cacheStore.set('key', 'value', 1800000); // 30 minutes
const value = cacheStore.get('key');

// Redis cache (requires redis package)
const redisCache = new RedisCache({
  url: process.env.REDIS_URL,
  defaultTTL: 3600, // 1 hour in seconds
  prefix: 'navis:',
});

await redisCache.connect();
await redisCache.set('key', 'value', 1800);
const value = await redisCache.get('key');

// Response caching middleware
app.get('/users/:id', cache({
  cacheStore,
  ttl: 1800, // 30 minutes
  keyGenerator: (req) => `user:${req.params.id}`,
}), (req, res) => {
  res.body = getUser(req.params.id);
});
```

### 2. CORS Support

Cross-Origin Resource Sharing middleware for API access from browsers.

**Features:**
- Configurable origins (single, array, or wildcard)
- Preflight request handling
- Credentials support
- Custom headers and methods
- Exposed headers

**Usage:**

```javascript
const { cors } = require('navis.js');

// Global CORS
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Wildcard (development only)
app.use(cors({
  origin: '*',
}));
```

### 3. Security Headers

Security headers middleware to protect against common attacks.

**Features:**
- X-Content-Type-Options (no-sniff)
- X-XSS-Protection
- X-Frame-Options
- Strict-Transport-Security (HSTS)
- Content-Security-Policy
- Referrer-Policy
- Permissions-Policy

**Usage:**

```javascript
const { security } = require('navis.js');

app.use(security({
  helmet: true,
  hsts: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubDomains: true,
  noSniff: true,
  xssFilter: true,
  frameOptions: 'DENY',
  contentSecurityPolicy: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
  },
  referrerPolicy: 'no-referrer',
}));
```

### 4. Response Compression

Gzip and Brotli compression middleware to reduce response sizes.

**Features:**
- Gzip compression
- Brotli compression (when supported)
- Configurable compression level
- Size threshold
- Content-type filtering

**Usage:**

```javascript
const { compress } = require('navis.js');

app.use(compress({
  level: 6, // 1-9
  threshold: 1024, // Only compress > 1KB
  algorithm: 'gzip', // or 'brotli'
  filter: (req, res) => {
    const contentType = res.headers?.['content-type'] || '';
    return contentType.includes('application/json') ||
           contentType.includes('text/');
  },
}));
```

### 5. Health Checks

Liveness and readiness probes for Kubernetes and container orchestration.

**Features:**
- Liveness probe (always returns 200 if service is running)
- Readiness probe (checks all health checks)
- Custom health check functions
- Automatic health check endpoints

**Usage:**

```javascript
const { createHealthChecker } = require('navis.js');

const healthChecker = createHealthChecker({
  livenessPath: '/health/live',
  readinessPath: '/health/ready',
  checks: {
    database: async () => {
      return await db.ping();
    },
    redis: async () => {
      return await redis.ping();
    },
    externalApi: async () => {
      const response = await fetch('https://api.example.com/health');
      return response.ok;
    },
  },
});

app.use(healthChecker.middleware());

// Endpoints automatically available:
// GET /health/live - Always returns 200 if service is running
// GET /health/ready - Returns 200 if all checks pass, 503 otherwise
```

**Adding Checks Dynamically:**

```javascript
healthChecker.addCheck('newService', async () => {
  return await checkNewService();
});

healthChecker.removeCheck('oldService');
```

### 6. Graceful Shutdown

Clean shutdown handling for Node.js servers.

**Features:**
- Signal handling (SIGTERM, SIGINT)
- Timeout protection
- Cleanup hooks
- Uncaught exception handling
- Unhandled rejection handling

**Usage:**

```javascript
const { gracefulShutdown } = require('navis.js');

const server = app.listen(3000);

gracefulShutdown(server, {
  timeout: 10000, // 10 seconds
  onShutdown: async () => {
    console.log('Closing database connections...');
    await db.close();
    
    console.log('Closing Redis connections...');
    await redis.disconnect();
    
    console.log('Disconnecting messaging...');
    await messaging.disconnect();
  },
});
```

## Complete Example

```javascript
const {
  NavisApp,
  Cache,
  cache,
  cors,
  security,
  compress,
  createHealthChecker,
  gracefulShutdown,
  response,
} = require('navis.js');

const app = new NavisApp();

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://example.com'],
  credentials: true,
}));

// Security headers
app.use(security({
  helmet: true,
  hsts: true,
  noSniff: true,
  xssFilter: true,
}));

// Compression
app.use(compress({
  level: 6,
  threshold: 1024,
}));

// Caching
const cacheStore = new Cache({ maxSize: 1000, defaultTTL: 3600000 });

app.get('/users/:id', cache({
  cacheStore,
  ttl: 1800,
  keyGenerator: (req) => `user:${req.params.id}`,
}), async (req, res) => {
  const user = await getUser(req.params.id);
  response.success(res, user);
});

// Health checks
const healthChecker = createHealthChecker({
  checks: {
    database: async () => await db.ping(),
    cache: async () => cacheStore.size() >= 0,
  },
});

app.use(healthChecker.middleware());

// Start server
const server = app.listen(3000);

// Graceful shutdown
gracefulShutdown(server, {
  timeout: 10000,
  onShutdown: async () => {
    await db.close();
    await redis.disconnect();
    cacheStore.destroy();
  },
});
```

## Best Practices

1. **Caching**: Cache frequently accessed data, use appropriate TTLs
2. **CORS**: Restrict origins in production, use credentials carefully
3. **Security**: Always enable security headers in production
4. **Compression**: Compress text-based responses (JSON, HTML, CSS, JS)
5. **Health Checks**: Implement meaningful health checks for dependencies
6. **Graceful Shutdown**: Always close connections and cleanup resources

## Performance Impact

- **Caching**: 80-95% reduction in response time for cached requests
- **Compression**: 60-80% reduction in response size
- **Health Checks**: Minimal overhead (< 1ms per check)

## Examples

See `examples/v5-features-demo.js` for complete working examples of all v5 features.

