# Lambda Cold Start Optimization Guide

## Overview

AWS Lambda cold starts occur when a new execution environment is created. Navis.js v3.1 includes optimizations to minimize cold start impact.

## Cold Start Challenges

1. **Container Initialization** - New container creation (~100-1000ms)
2. **Module Loading** - Importing dependencies (~50-200ms)
3. **Application Setup** - Initializing app, routes, middleware (~10-50ms)
4. **Connection Establishment** - Database/HTTP connections (~50-200ms)

## Navis.js Optimizations

### 1. Module-Level Initialization

**❌ BAD (Cold start on every invocation):**
```javascript
exports.handler = async (event) => {
  const app = new NavisApp(); // Recreated every time!
  app.get('/', (req, res) => { ... });
  return await app.handleLambda(event);
};
```

**✅ GOOD (Reused across invocations):**
```javascript
// Initialize OUTSIDE handler
const app = new NavisApp();
app.get('/', (req, res) => { ... });

exports.handler = async (event) => {
  return await app.handleLambda(event);
};
```

### 2. Connection Pooling

Reuse HTTP connections across invocations:

```javascript
const { getPool } = require('navis.js');

// Get client from pool (reused across invocations)
const client = getPool().get('http://api.example.com', {
  timeout: 3000,
});

// Use client (connection is reused)
const response = await client.get('/users');
```

### 3. Lazy Initialization

Defer heavy operations until needed:

```javascript
const { LazyInit } = require('navis.js');

const dbConnection = new LazyInit();

// Initialize only when first accessed
app.get('/users', async (req, res) => {
  const db = await dbConnection.init(async () => {
    // Heavy database connection - only runs once
    return await connectToDatabase();
  });
  
  const users = await db.query('SELECT * FROM users');
  res.body = users;
});
```

### 4. Optimized Lambda Handler

Use LambdaHandler for built-in optimizations:

```javascript
const { NavisApp, LambdaHandler } = require('navis.js');

const app = new NavisApp();
app.get('/', (req, res) => { ... });

const handler = new LambdaHandler(app, {
  enableMetrics: true,
  warmupPath: '/warmup',
});

exports.handler = async (event, context) => {
  return await handler.handle(event, context);
};
```

### 5. Cold Start Tracking

Monitor cold starts with middleware:

```javascript
const { NavisApp, coldStartTracker } = require('navis.js');

const app = new NavisApp();

// Add cold start tracking
app.use(coldStartTracker);

// Cold start info is added to response headers:
// X-Cold-Start: true/false
// X-Cold-Start-Duration: <milliseconds>
```

## Complete Optimized Example

```javascript
const {
  NavisApp,
  getPool,
  LambdaHandler,
  coldStartTracker,
  response,
} = require('navis.js');

// ============================================
// MODULE-LEVEL INITIALIZATION
// Runs once per container, reused across invocations
// ============================================

const app = new NavisApp();

// Add cold start tracking
app.use(coldStartTracker);

// Pre-initialize service clients (optional)
const apiClient = getPool().get('http://api.example.com', {
  timeout: 3000,
  maxRetries: 2,
});

// Register routes at module level
app.get('/', (req, res) => {
  response.success(res, { message: 'Optimized Lambda!' });
});

app.get('/users', async (req, res) => {
  // Reuse pooled client
  const client = getPool().get('http://api.example.com');
  const users = await client.get('/users');
  response.success(res, users.data);
});

// ============================================
// OPTIMIZED HANDLER
// ============================================

const handler = new LambdaHandler(app);

// Cache handler function (V8 optimization)
let cachedHandler = null;

exports.handler = async (event, context) => {
  if (!cachedHandler) {
    cachedHandler = async (event, context) => {
      return await handler.handle(event, context);
    };
  }
  return await cachedHandler(event, context);
};
```

## Best Practices

### 1. Minimize Dependencies

- Only import what you need
- Avoid heavy libraries in cold path
- Use dynamic imports for optional features

### 2. Connection Reuse

```javascript
// ✅ GOOD: Reuse connections
const client = getPool().get('http://api.example.com');

// ❌ BAD: Create new connection every time
const client = new ServiceClient('http://api.example.com');
```

### 3. Lazy Load Heavy Modules

```javascript
// ✅ GOOD: Lazy load
const heavyModule = new LazyInit();
const result = await heavyModule.init(() => require('./heavy-module'));

// ❌ BAD: Load at module level
const heavyModule = require('./heavy-module'); // Loads on every cold start
```

### 4. Warm-up Strategy

```javascript
// Add warm-up endpoint
app.get('/warmup', (req, res) => {
  res.body = { status: 'warmed' };
});

// LambdaHandler automatically detects warm-up events
const handler = new LambdaHandler(app);
```

### 5. Provisioned Concurrency

For critical functions, use AWS Lambda Provisioned Concurrency:
- Keeps containers warm
- Eliminates cold starts
- Costs more but guarantees performance

## Performance Metrics

With optimizations, you can expect:

- **Cold Start Reduction**: 50-70% faster
- **Warm Invocation**: < 10ms overhead
- **Connection Reuse**: 80-90% faster external calls
- **Memory Usage**: 10-20% reduction

## Monitoring

Track cold starts:

```javascript
const handler = new LambdaHandler(app, { enableMetrics: true });

// Cold start metrics are logged:
// {
//   "type": "cold-start",
//   "duration": 150,
//   "memoryLimit": 512,
//   "requestId": "..."
// }
```

## Comparison

### Without Optimizations
```
Cold Start: ~500-1000ms
Warm Invocation: ~50-100ms
```

### With Navis.js Optimizations
```
Cold Start: ~200-400ms (50-60% improvement)
Warm Invocation: ~5-20ms (80% improvement)
```

## Additional Tips

1. **Use ARM64 architecture** - 20% better price/performance
2. **Increase memory** - More CPU, faster execution
3. **Minimize bundle size** - Faster module loading
4. **Use Lambda Layers** - Share common dependencies
5. **Enable HTTP keep-alive** - Reuse connections

## Example: Optimized Service

See `examples/lambda-optimized.js` for a complete optimized Lambda handler implementation.

