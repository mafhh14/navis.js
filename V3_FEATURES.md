# Navis.js v3 Features

## Overview

v3 introduces async messaging support, comprehensive observability, and enhanced CLI features to make Navis.js enterprise-ready for production microservice architectures.

## New Features

### 1. Async Messaging

Support for multiple messaging brokers: AWS SQS, Apache Kafka, and NATS.

#### AWS SQS

**Installation:**
```bash
npm install @aws-sdk/client-sqs
```

**Usage:**

```javascript
const { SQSMessaging } = require('navis.js');

const sqs = new SQSMessaging({
  region: 'us-east-1',
  queueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789/my-queue',
});

await sqs.connect();

// Publish message
await sqs.publish('https://sqs.us-east-1.amazonaws.com/123456789/my-queue', {
  userId: 123,
  action: 'user.created',
  data: { name: 'John Doe' },
});

// Subscribe to queue
await sqs.subscribe('https://sqs.us-east-1.amazonaws.com/123456789/my-queue', 
  async (message, metadata) => {
    console.log('Received:', message);
    console.log('Message ID:', metadata.messageId);
  }
);
```

#### Apache Kafka

**Installation:**
```bash
npm install kafkajs
```

**Usage:**

```javascript
const { KafkaMessaging } = require('navis.js');

const kafka = new KafkaMessaging({
  brokers: ['localhost:9092'],
  clientId: 'navis-client',
  consumerGroupId: 'navis-group',
});

await kafka.connect();

// Publish to topic
await kafka.publish('user-events', {
  userId: 123,
  event: 'user.created',
  data: { name: 'Jane Doe' },
}, {
  key: 'user-123',
  headers: { 'source': 'api' },
});

// Subscribe to topic
await kafka.subscribe('user-events', async (message, metadata) => {
  console.log('Received:', message);
  console.log('Topic:', metadata.topic);
  console.log('Partition:', metadata.partition);
  console.log('Offset:', metadata.offset);
});
```

#### NATS

**Installation:**
```bash
npm install nats
```

**Usage:**

```javascript
const { NATSMessaging } = require('navis.js');

const nats = new NATSMessaging({
  servers: ['nats://localhost:4222'],
});

await nats.connect();

// Publish message
await nats.publish('user.created', {
  userId: 123,
  name: 'Bob Smith',
});

// Subscribe to subject
await nats.subscribe('user.created', async (message, metadata) => {
  console.log('Received:', message);
  console.log('Subject:', metadata.subject);
});

// Request-reply pattern
const response = await nats.request('user.get', { userId: 123 }, {
  timeout: 5000,
});
console.log('Response:', response);
```

### 2. Observability

#### Structured Logging

**Features:**
- Multiple log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- Structured JSON or text output
- Color-coded console output
- Context propagation
- Child loggers

**Usage:**

```javascript
const { Logger } = require('navis.js');

const logger = new Logger({
  level: 'INFO',
  format: 'json', // or 'text'
  enableColors: true,
  context: { service: 'user-service', version: '1.0.0' },
});

logger.debug('Debug message', { userId: 123 });
logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
logger.warn('Rate limit approaching', { requests: 95 });
logger.error('Failed to process', new Error('Connection timeout'), { userId: 123 });
logger.fatal('Critical error', new Error('Database down'));

// Child logger with additional context
const requestLogger = logger.child({ requestId: 'req-123' });
requestLogger.info('Processing request');
```

#### Metrics Collection

**Features:**
- Counters, gauges, and histograms
- Automatic HTTP request metrics
- Prometheus format export
- Label support

**Usage:**

```javascript
const { Metrics } = require('navis.js');

const metrics = new Metrics();

// Counters
metrics.increment('api_calls_total', 1, { endpoint: '/users', method: 'GET' });
metrics.increment('api_calls_total', 1, { endpoint: '/users', method: 'POST' });

// Gauges
metrics.gauge('active_connections', 42);
metrics.gauge('queue_size', 150);

// Histograms
metrics.histogram('response_time_ms', 150, { endpoint: '/users' });
metrics.histogram('response_time_ms', 200, { endpoint: '/users' });

// Automatic HTTP metrics
metrics.recordRequest('GET', '/users', 150, 200);
metrics.recordRequest('POST', '/users', 250, 201);

// Get all metrics
const allMetrics = metrics.getAll();

// Prometheus format
const prometheusMetrics = metrics.toPrometheus();
console.log(prometheusMetrics);
```

**Expose Metrics Endpoint:**

```javascript
const { NavisApp, Metrics } = require('navis.js');

const app = new NavisApp();
const metrics = new Metrics();

// Add metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.recordRequest(req.method, req.url, duration, res.statusCode);
  });
  next();
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.end(metrics.toPrometheus());
});
```

#### Distributed Tracing

**Features:**
- Trace and span management
- Parent-child span relationships
- Tags and logs
- Trace duration calculation

**Usage:**

```javascript
const { Tracer } = require('navis.js');

const tracer = new Tracer({ serviceName: 'user-service' });

// Start a trace
const traceId = tracer.startTrace('user-request');

// Start spans
const dbSpan = tracer.startSpan('database-query', { traceId });
tracer.addTag(dbSpan, 'db.type', 'postgres');
tracer.addTag(dbSpan, 'db.query', 'SELECT * FROM users');
tracer.addLog(dbSpan, 'Query executed', { rows: 10 });

// Simulate work
await performDatabaseQuery();

tracer.finishSpan(dbSpan, { status: 'ok' });

const cacheSpan = tracer.startSpan('cache-lookup', { 
  traceId, 
  parentSpanId: dbSpan 
});
tracer.addTag(cacheSpan, 'cache.type', 'redis');
tracer.finishSpan(cacheSpan, { status: 'ok' });

// Get trace
const trace = tracer.getTrace(traceId);
console.log('Trace:', JSON.stringify(trace, null, 2));
```

### 3. Enhanced CLI

**New Commands:**

```bash
# Run tests
navis test

# Show metrics endpoint info
navis metrics

# Deploy service (coming soon)
navis deploy
```

## Complete Example

```javascript
const {
  NavisApp,
  Logger,
  Metrics,
  Tracer,
  SQSMessaging,
  response,
} = require('navis.js');

// Initialize observability
const logger = new Logger({ context: { service: 'api' } });
const metrics = new Metrics();
const tracer = new Tracer({ serviceName: 'api' });

// Initialize messaging
const sqs = new SQSMessaging({
  region: 'us-east-1',
  queueUrl: process.env.SQS_QUEUE_URL,
});
await sqs.connect();

// Subscribe to events
await sqs.subscribe(process.env.SQS_QUEUE_URL, async (message) => {
  const spanId = tracer.startSpan('process-event');
  logger.info('Processing event', { event: message.action });
  
  try {
    // Process message
    await processEvent(message);
    metrics.increment('events_processed', 1, { type: message.action });
    tracer.finishSpan(spanId, { status: 'ok' });
  } catch (error) {
    logger.error('Failed to process event', error);
    metrics.increment('events_failed', 1, { type: message.action });
    tracer.finishSpan(spanId, { status: 'error', error });
  }
});

// Create app
const app = new NavisApp();

// Metrics middleware
app.use((req, res, next) => {
  const traceId = tracer.startTrace('http-request');
  const spanId = tracer.startSpan('http-handler', { traceId });
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.recordRequest(req.method, req.url, duration, res.statusCode);
    tracer.finishSpan(spanId, { 
      status: res.statusCode < 400 ? 'ok' : 'error',
      tags: { 'http.status_code': res.statusCode },
    });
  });
  
  next();
});

// Routes
app.get('/users/:id', async (req, res) => {
  const spanId = tracer.startSpan('get-user');
  logger.info('Fetching user', { userId: req.params.id });
  
  try {
    const user = await getUser(req.params.id);
    metrics.increment('users_fetched', 1);
    tracer.finishSpan(spanId, { status: 'ok' });
    response.success(res, user);
  } catch (error) {
    logger.error('Failed to fetch user', error, { userId: req.params.id });
    tracer.finishSpan(spanId, { status: 'error', error });
    response.error(res, 'User not found', 404);
  }
});

app.post('/users', async (req, res) => {
  const spanId = tracer.startSpan('create-user');
  
  try {
    const user = await createUser(req.body);
    
    // Publish event
    await sqs.publish(process.env.SQS_QUEUE_URL, {
      action: 'user.created',
      userId: user.id,
      data: user,
    });
    
    metrics.increment('users_created', 1);
    tracer.finishSpan(spanId, { status: 'ok' });
    response.success(res, user, 201);
  } catch (error) {
    logger.error('Failed to create user', error);
    tracer.finishSpan(spanId, { status: 'error', error });
    response.error(res, 'Failed to create user', 500);
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.end(metrics.toPrometheus());
});

app.listen(3000);
```

## Migration from v2

v3 is backward compatible. All v1 and v2 features continue to work:

```javascript
// v1 and v2 code still works
const { NavisApp, ServiceClient } = require('navis.js');
```

New v3 features are opt-in:

```javascript
// Use v3 features as needed
const { Logger, Metrics, SQSMessaging } = require('navis.js');
```

## Dependencies

v3 messaging adapters require optional dependencies:

- **SQS**: `npm install @aws-sdk/client-sqs`
- **Kafka**: `npm install kafkajs`
- **NATS**: `npm install nats`

Observability features (Logger, Metrics, Tracer) have zero dependencies.

## Best Practices

1. **Logging**:
   - Use appropriate log levels
   - Include context in logs
   - Use structured logging for production

2. **Metrics**:
   - Expose `/metrics` endpoint for Prometheus
   - Record metrics for all critical operations
   - Use labels for filtering

3. **Tracing**:
   - Start traces at request entry points
   - Create spans for significant operations
   - Finish spans with appropriate status

4. **Messaging**:
   - Handle message processing errors gracefully
   - Implement idempotency for message handlers
   - Use appropriate message formats

## Examples

See `examples/v3-features-demo.js` for complete working examples of all v3 features.

