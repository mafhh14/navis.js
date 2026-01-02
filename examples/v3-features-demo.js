/**
 * Navis.js v3 Features Demo
 * Demonstrates async messaging, observability, and enhanced features
 */

const {
  Logger,
  Metrics,
  Tracer,
  SQSMessaging,
  KafkaMessaging,
  NATSMessaging,
} = require('../src/index');

// Example 1: Structured Logging
async function demoLogger() {
  console.log('\n=== Structured Logging (v3) ===\n');

  const logger = new Logger({
    level: 'DEBUG',
    format: 'text',
    enableColors: true,
    context: { service: 'demo-service', version: '1.0.0' },
  });

  logger.debug('Debug message', { userId: 123 });
  logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
  logger.warn('Rate limit approaching', { userId: 123, requests: 95 });
  logger.error('Failed to process request', new Error('Connection timeout'), { userId: 123 });
  
  // Child logger with additional context
  const requestLogger = logger.child({ requestId: 'req-123' });
  requestLogger.info('Processing request');
}

// Example 2: Metrics Collection
async function demoMetrics() {
  console.log('\n=== Metrics Collection (v3) ===\n');

  const metrics = new Metrics();

  // Record some metrics
  metrics.increment('api_calls_total', 1, { endpoint: '/users', method: 'GET' });
  metrics.increment('api_calls_total', 1, { endpoint: '/users', method: 'POST' });
  metrics.gauge('active_connections', 42);
  metrics.histogram('response_time_ms', 150, { endpoint: '/users' });
  metrics.histogram('response_time_ms', 200, { endpoint: '/users' });
  metrics.histogram('response_time_ms', 120, { endpoint: '/users' });

  // Record HTTP request
  metrics.recordRequest('GET', '/users', 150, 200);
  metrics.recordRequest('POST', '/users', 250, 201);

  // Get all metrics
  const allMetrics = metrics.getAll();
  console.log('All metrics:', JSON.stringify(allMetrics, null, 2));

  // Prometheus format
  console.log('\nPrometheus format:');
  console.log(metrics.toPrometheus());
}

// Example 3: Distributed Tracing
async function demoTracer() {
  console.log('\n=== Distributed Tracing (v3) ===\n');

  const tracer = new Tracer({ serviceName: 'demo-service' });

  // Start a trace
  const traceId = tracer.startTrace('user-request');
  console.log('Trace ID:', traceId);

  // Start spans
  const span1 = tracer.startSpan('database-query', { traceId });
  tracer.addTag(span1, 'db.type', 'postgres');
  tracer.addTag(span1, 'db.query', 'SELECT * FROM users');
  tracer.addLog(span1, 'Query executed', { rows: 10 });
  
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 100));
  
  tracer.finishSpan(span1, { status: 'ok' });

  const span2 = tracer.startSpan('cache-lookup', { traceId, parentSpanId: span1 });
  tracer.addTag(span2, 'cache.type', 'redis');
  tracer.finishSpan(span2, { status: 'ok' });

  // Get trace
  const trace = tracer.getTrace(traceId);
  console.log('Trace data:', JSON.stringify(trace, null, 2));
}

// Example 4: SQS Messaging (requires AWS SDK)
async function demoSQS() {
  console.log('\n=== SQS Messaging (v3) ===\n');
  console.log('Note: Requires @aws-sdk/client-sqs and AWS credentials');

  try {
    const sqs = new SQSMessaging({
      region: 'us-east-1',
      queueUrl: process.env.SQS_QUEUE_URL,
    });

    await sqs.connect();
    console.log('✅ Connected to SQS');

    // Publish message
    const result = await sqs.publish(process.env.SQS_QUEUE_URL, {
      userId: 123,
      action: 'user.created',
      data: { name: 'John Doe' },
    });
    console.log('Published message:', result);

    // Subscribe (would need actual queue)
    // await sqs.subscribe(process.env.SQS_QUEUE_URL, async (message, metadata) => {
    //   console.log('Received:', message);
    // });

  } catch (error) {
    if (error.message.includes('@aws-sdk/client-sqs')) {
      console.log('⚠️  AWS SDK not installed. Install with: npm install @aws-sdk/client-sqs');
    } else {
      console.log('⚠️  SQS demo requires AWS credentials and queue URL');
    }
  }
}

// Example 5: Kafka Messaging (requires kafkajs)
async function demoKafka() {
  console.log('\n=== Kafka Messaging (v3) ===\n');
  console.log('Note: Requires kafkajs and Kafka broker');

  try {
    const kafka = new KafkaMessaging({
      brokers: ['localhost:9092'],
      clientId: 'navis-demo',
    });

    await kafka.connect();
    console.log('✅ Connected to Kafka');

    // Publish message
    const result = await kafka.publish('user-events', {
      userId: 123,
      event: 'user.created',
      data: { name: 'Jane Doe' },
    });
    console.log('Published to Kafka:', result);

  } catch (error) {
    if (error.message.includes('kafkajs')) {
      console.log('⚠️  kafkajs not installed. Install with: npm install kafkajs');
    } else {
      console.log('⚠️  Kafka demo requires running Kafka broker');
    }
  }
}

// Example 6: NATS Messaging (requires nats)
async function demoNATS() {
  console.log('\n=== NATS Messaging (v3) ===\n');
  console.log('Note: Requires nats and NATS server');

  try {
    const nats = new NATSMessaging({
      servers: ['nats://localhost:4222'],
    });

    await nats.connect();
    console.log('✅ Connected to NATS');

    // Publish message
    const result = await nats.publish('user.created', {
      userId: 123,
      name: 'Bob Smith',
    });
    console.log('Published to NATS:', result);

    // Request-reply pattern
    // const response = await nats.request('user.get', { userId: 123 });
    // console.log('Response:', response);

  } catch (error) {
    if (error.message.includes('nats')) {
      console.log('⚠️  nats not installed. Install with: npm install nats');
    } else {
      console.log('⚠️  NATS demo requires running NATS server');
    }
  }
}

// Run all demos
async function runDemos() {
  console.log('🚀 Navis.js v3 Features Demo\n');
  console.log('='.repeat(50));

  await demoLogger();
  await demoMetrics();
  await demoTracer();
  await demoSQS();
  await demoKafka();
  await demoNATS();

  console.log('\n' + '='.repeat(50));
  console.log('✅ v3 features demo completed!');
  console.log('\nNote: Messaging adapters require their respective dependencies:');
  console.log('  - SQS: npm install @aws-sdk/client-sqs');
  console.log('  - Kafka: npm install kafkajs');
  console.log('  - NATS: npm install nats');
}

// Run if called directly
if (require.main === module) {
  runDemos().catch(console.error);
}

module.exports = {
  demoLogger,
  demoMetrics,
  demoTracer,
  demoSQS,
  demoKafka,
  demoNATS,
};

