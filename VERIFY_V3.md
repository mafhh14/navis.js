# How to Verify Navis.js v3 Features

## Quick Verification

Run the automated verification script:

```bash
node verify-v3.js
```

This will test all v3 features and show you the results.

## Manual Verification Guide

### 1. Verify Module Exports

Check that all v3 features are exported:

```javascript
const navis = require('navis.js');

console.log('v3 Exports:');
console.log('- Logger:', !!navis.Logger);
console.log('- Metrics:', !!navis.Metrics);
console.log('- Tracer:', !!navis.Tracer);
console.log('- SQSMessaging:', !!navis.SQSMessaging);
console.log('- KafkaMessaging:', !!navis.KafkaMessaging);
console.log('- NATSMessaging:', !!navis.NATSMessaging);
```

### 2. Test Structured Logging

```javascript
const { Logger } = require('navis.js');

const logger = new Logger({
  level: 'DEBUG',
  format: 'text',
  enableColors: true,
  context: { service: 'test-service' },
});

logger.debug('Debug message', { userId: 123 });
logger.info('Info message', { action: 'login' });
logger.warn('Warning message', { threshold: 90 });
logger.error('Error message', new Error('Test error'));
logger.fatal('Fatal message', new Error('Critical error'));

// Test child logger
const childLogger = logger.child({ requestId: 'req-123' });
childLogger.info('Request processed');
```

### 3. Test Metrics Collection

```javascript
const { Metrics } = require('navis.js');

const metrics = new Metrics();

// Test counters
metrics.increment('api_calls', 1, { endpoint: '/users' });
metrics.increment('api_calls', 2, { endpoint: '/users' });
console.log('Counter:', metrics.getAll().counters);

// Test gauges
metrics.gauge('active_connections', 42);
console.log('Gauge:', metrics.getAll().gauges);

// Test histograms
metrics.histogram('response_time', 100);
metrics.histogram('response_time', 200);
metrics.histogram('response_time', 150);
console.log('Histogram:', metrics.getAll().histograms);

// Test HTTP metrics
metrics.recordRequest('GET', '/users', 150, 200);
metrics.recordRequest('POST', '/users', 250, 201);

// Prometheus format
console.log('\nPrometheus format:');
console.log(metrics.toPrometheus());
```

### 4. Test Distributed Tracing

```javascript
const { Tracer } = require('navis.js');

const tracer = new Tracer({ serviceName: 'test-service' });

// Start trace
const traceId = tracer.startTrace('user-operation');
console.log('Trace ID:', traceId);

// Create spans
const span1 = tracer.startSpan('database-query', { traceId });
tracer.addTag(span1, 'db.type', 'postgres');
tracer.addLog(span1, 'Query executed', { rows: 10 });
tracer.finishSpan(span1, { status: 'ok' });

const span2 = tracer.startSpan('cache-lookup', { traceId, parentSpanId: span1 });
tracer.addTag(span2, 'cache.type', 'redis');
tracer.finishSpan(span2, { status: 'ok' });

// Get trace
const trace = tracer.getTrace(traceId);
console.log('Trace:', JSON.stringify(trace, null, 2));
```

### 5. Test SQS Messaging (Optional - requires AWS SDK)

```javascript
const { SQSMessaging } = require('navis.js');

// Note: Requires @aws-sdk/client-sqs
// npm install @aws-sdk/client-sqs

const sqs = new SQSMessaging({
  region: 'us-east-1',
  queueUrl: process.env.SQS_QUEUE_URL,
});

// Test instantiation (won't connect without AWS credentials)
console.log('SQS Messaging created:', !!sqs);
console.log('Region:', sqs.region);
```

### 6. Test Kafka Messaging (Optional - requires kafkajs)

```javascript
const { KafkaMessaging } = require('navis.js');

// Note: Requires kafkajs
// npm install kafkajs

const kafka = new KafkaMessaging({
  brokers: ['localhost:9092'],
  clientId: 'test-client',
});

// Test instantiation
console.log('Kafka Messaging created:', !!kafka);
console.log('Brokers:', kafka.brokers);
```

### 7. Test NATS Messaging (Optional - requires nats)

```javascript
const { NATSMessaging } = require('navis.js');

// Note: Requires nats
// npm install nats

const nats = new NATSMessaging({
  servers: ['nats://localhost:4222'],
});

// Test instantiation
console.log('NATS Messaging created:', !!nats);
console.log('Servers:', nats.servers);
```

### 8. Test CLI Commands

```bash
# Test CLI help
navis

# Test generate command (v2)
navis generate service test-service

# Test new v3 commands
navis test
navis metrics
```

### 9. Run Demo Examples

```bash
# Run v3 features demo
node examples/v3-features-demo.js
```

### 10. Integration Test

Create a complete integration test:

```javascript
const {
  NavisApp,
  Logger,
  Metrics,
  Tracer,
  response,
} = require('navis.js');

// Initialize observability
const logger = new Logger({ context: { service: 'api' } });
const metrics = new Metrics();
const tracer = new Tracer({ serviceName: 'api' });

// Create app
const app = new NavisApp();

// Observability middleware
app.use((req, res, next) => {
  const traceId = tracer.startTrace('http-request');
  const spanId = tracer.startSpan('http-handler', { traceId });
  const start = Date.now();
  
  logger.info('Incoming request', { method: req.method, url: req.url });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.recordRequest(req.method, req.url, duration, res.statusCode);
    tracer.finishSpan(spanId, { 
      status: res.statusCode < 400 ? 'ok' : 'error',
    });
    logger.info('Request completed', { 
      method: req.method, 
      url: req.url, 
      status: res.statusCode,
      duration,
    });
  });
  
  next();
});

// Routes
app.get('/health', (req, res) => {
  response.success(res, { status: 'ok' });
});

app.get('/metrics', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(metrics.toPrometheus());
});

app.listen(3000, () => {
  logger.info('Server started', { port: 3000 });
});
```

## Expected Results

After running all verifications, you should see:

✅ All module exports available
✅ Logger working with all levels
✅ Metrics collecting counters, gauges, histograms
✅ Metrics exporting Prometheus format
✅ Tracer managing traces and spans
✅ Messaging adapters instantiated (connection requires dependencies)
✅ CLI commands working
✅ All tests passing in verify-v3.js

## Quick Test Commands

```bash
# 1. Run automated tests
node verify-v3.js

# 2. Run demo
node examples/v3-features-demo.js

# 3. Test CLI
navis test
navis metrics

# 4. Test with real server
node examples/server.js
# In another terminal:
curl http://localhost:3000/
```

## Troubleshooting

If any test fails:

1. **Check imports**: Make sure you're importing from the correct path
2. **Check file structure**: Verify all v3 files exist in `src/messaging/` and `src/observability/`
3. **Check exports**: Verify `src/index.js` exports all v3 features
4. **Run verification script**: `node verify-v3.js` will show specific failures

## Dependencies

v3 messaging adapters require optional dependencies (not included in core):

- **SQS**: `npm install @aws-sdk/client-sqs`
- **Kafka**: `npm install kafkajs`
- **NATS**: `npm install nats`

Observability features (Logger, Metrics, Tracer) have **zero dependencies** and work out of the box.

## Next Steps

After verification:

1. Test with a real application
2. Integrate observability into your services
3. Set up messaging adapters (if needed)
4. Review documentation: Check `V3_FEATURES.md` for detailed usage

