/**
 * Verification Script for Navis.js v3 Features
 * Tests all new v3 functionality
 */

const {
  Logger,
  Metrics,
  Tracer,
  SQSMessaging,
  KafkaMessaging,
  NATSMessaging,
} = require('../src/index');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    testsFailed++;
  }
}

function testAsync(name, fn) {
  return fn()
    .then(() => {
      console.log(`✅ ${name}`);
      testsPassed++;
    })
    .catch((error) => {
      console.log(`❌ ${name}: ${error.message}`);
      testsFailed++;
    });
}

console.log('🧪 Verifying Navis.js v3 Features\n');
console.log('='.repeat(60));

// Test 1: Logger instantiation
test('Logger - Instantiation', () => {
  const logger = new Logger({
    level: 'INFO',
    format: 'json',
  });
  
  if (!logger) {
    throw new Error('Logger not created');
  }
  if (logger.levelValue !== 1) {
    throw new Error('Log level not set correctly');
  }
});

// Test 2: Logger levels
test('Logger - Log levels', () => {
  const logger = new Logger({ level: 'DEBUG' });
  
  // Should not throw
  logger.debug('Debug message');
  logger.info('Info message');
  logger.warn('Warning message');
  logger.error('Error message');
  logger.fatal('Fatal message');
});

// Test 3: Logger child
test('Logger - Child logger', () => {
  const logger = new Logger({ context: { service: 'test' } });
  const child = logger.child({ requestId: 'req-123' });
  
  if (!child.context.requestId) {
    throw new Error('Child logger context not set');
  }
  if (child.context.service !== 'test') {
    throw new Error('Child logger did not inherit parent context');
  }
});

// Test 4: Metrics instantiation
test('Metrics - Instantiation', () => {
  const metrics = new Metrics();
  
  if (!metrics) {
    throw new Error('Metrics not created');
  }
  if (!metrics.metrics) {
    throw new Error('Metrics storage not initialized');
  }
});

// Test 5: Metrics counters
test('Metrics - Counters', () => {
  const metrics = new Metrics();
  
  metrics.increment('test_counter', 1, { label: 'value' });
  metrics.increment('test_counter', 2, { label: 'value' });
  
  const all = metrics.getAll();
  const key = 'test_counter::{"label":"value"}';
  
  if (all.counters[key] !== 3) {
    throw new Error('Counter not incrementing correctly');
  }
});

// Test 6: Metrics gauges
test('Metrics - Gauges', () => {
  const metrics = new Metrics();
  
  metrics.gauge('test_gauge', 42, { label: 'value' });
  
  const all = metrics.getAll();
  const key = 'test_gauge::{"label":"value"}';
  
  if (all.gauges[key] !== 42) {
    throw new Error('Gauge not set correctly');
  }
});

// Test 7: Metrics histograms
test('Metrics - Histograms', () => {
  const metrics = new Metrics();
  
  metrics.histogram('test_histogram', 100, { label: 'value' });
  metrics.histogram('test_histogram', 200, { label: 'value' });
  metrics.histogram('test_histogram', 150, { label: 'value' });
  
  const all = metrics.getAll();
  const key = 'test_histogram::{"label":"value"}';
  const histogram = all.histograms[key];
  
  if (!histogram) {
    throw new Error('Histogram not created');
  }
  if (histogram.count !== 3) {
    throw new Error('Histogram count incorrect');
  }
  if (histogram.avg !== 150) {
    throw new Error('Histogram average incorrect');
  }
});

// Test 8: Metrics HTTP recording
test('Metrics - HTTP request recording', () => {
  const metrics = new Metrics();
  
  metrics.recordRequest('GET', '/users', 150, 200);
  metrics.recordRequest('POST', '/users', 250, 201);
  
  const all = metrics.getAll();
  
  // Check histogram was created
  const histKey = 'http_request_duration_ms::{"method":"GET","path":"/users","status":200}';
  if (!all.histograms[histKey]) {
    throw new Error('HTTP request histogram not created');
  }
  
  // Check counter was created
  const counterKey = 'http_requests_total::{"method":"GET","path":"/users","status":200}';
  if (all.counters[counterKey] !== 1) {
    throw new Error('HTTP request counter not created');
  }
});

// Test 9: Metrics Prometheus format
test('Metrics - Prometheus format', () => {
  const metrics = new Metrics();
  
  metrics.increment('test_counter', 1);
  metrics.gauge('test_gauge', 42);
  
  const prometheus = metrics.toPrometheus();
  
  if (!prometheus.includes('test_counter')) {
    throw new Error('Prometheus format missing counter');
  }
  if (!prometheus.includes('test_gauge')) {
    throw new Error('Prometheus format missing gauge');
  }
});

// Test 10: Tracer instantiation
test('Tracer - Instantiation', () => {
  const tracer = new Tracer({ serviceName: 'test-service' });
  
  if (!tracer) {
    throw new Error('Tracer not created');
  }
  if (tracer.serviceName !== 'test-service') {
    throw new Error('Service name not set');
  }
});

// Test 11: Tracer trace and spans
test('Tracer - Trace and spans', () => {
  const tracer = new Tracer();
  
  const traceId = tracer.startTrace('test-operation');
  if (!traceId) {
    throw new Error('Trace not started');
  }
  
  const spanId = tracer.startSpan('test-span', { traceId });
  if (!spanId) {
    throw new Error('Span not started');
  }
  
  tracer.addTag(spanId, 'test.tag', 'value');
  tracer.addLog(spanId, 'Test log', { data: 'value' });
  tracer.finishSpan(spanId, { status: 'ok' });
  
  const trace = tracer.getTrace(traceId);
  if (!trace) {
    throw new Error('Trace not found');
  }
  // startTrace creates a root span, so we should have 2 spans (root + our span)
  if (trace.spans.length < 1) {
    throw new Error('Span not in trace');
  }
  
  // Find our specific span
  const span = trace.spans.find(s => s.spanId === spanId);
  if (!span) {
    throw new Error('Our span not found in trace');
  }
  if (span.tags['test.tag'] !== 'value') {
    throw new Error('Tag not set correctly');
  }
  if (span.logs.length !== 1) {
    throw new Error('Log not added');
  }
  if (span.status !== 'ok') {
    throw new Error('Span status not set');
  }
});

// Test 12: Tracer parent-child spans
test('Tracer - Parent-child spans', () => {
  const tracer = new Tracer();
  
  const traceId = tracer.startTrace('parent-operation');
  const parentSpanId = tracer.startSpan('parent', { traceId });
  const childSpanId = tracer.startSpan('child', { traceId, parentSpanId });
  
  tracer.finishSpan(childSpanId);
  tracer.finishSpan(parentSpanId);
  
  const trace = tracer.getTrace(traceId);
  const parentSpan = trace.spans.find(s => s.spanId === parentSpanId);
  
  if (!parentSpan.childSpans.includes(childSpanId)) {
    throw new Error('Child span not linked to parent');
  }
});

// Test 13: SQS Messaging instantiation
test('SQSMessaging - Instantiation', () => {
  const sqs = new SQSMessaging({
    region: 'us-east-1',
  });
  
  if (!sqs) {
    throw new Error('SQS messaging not created');
  }
  if (sqs.region !== 'us-east-1') {
    throw new Error('Region not set');
  }
});

// Test 14: Kafka Messaging instantiation
test('KafkaMessaging - Instantiation', () => {
  const kafka = new KafkaMessaging({
    brokers: ['localhost:9092'],
  });
  
  if (!kafka) {
    throw new Error('Kafka messaging not created');
  }
  if (kafka.brokers[0] !== 'localhost:9092') {
    throw new Error('Brokers not set');
  }
});

// Test 15: NATS Messaging instantiation
test('NATSMessaging - Instantiation', () => {
  const nats = new NATSMessaging({
    servers: ['nats://localhost:4222'],
  });
  
  if (!nats) {
    throw new Error('NATS messaging not created');
  }
  if (nats.servers[0] !== 'nats://localhost:4222') {
    throw new Error('Servers not set');
  }
});

// Test 16: Module exports
test('Module exports - All v3 features exported', () => {
  const navis = require('./src/index');
  
  if (!navis.Logger) {
    throw new Error('Logger not exported');
  }
  if (!navis.Metrics) {
    throw new Error('Metrics not exported');
  }
  if (!navis.Tracer) {
    throw new Error('Tracer not exported');
  }
  if (!navis.SQSMessaging) {
    throw new Error('SQSMessaging not exported');
  }
  if (!navis.KafkaMessaging) {
    throw new Error('KafkaMessaging not exported');
  }
  if (!navis.NATSMessaging) {
    throw new Error('NATSMessaging not exported');
  }
});

// Test 17: Metrics reset
test('Metrics - Reset functionality', () => {
  const metrics = new Metrics();
  
  metrics.increment('test', 1);
  metrics.gauge('test', 42);
  metrics.histogram('test', 100);
  
  metrics.reset();
  
  const all = metrics.getAll();
  if (Object.keys(all.counters).length !== 0) {
    throw new Error('Counters not reset');
  }
  if (Object.keys(all.gauges).length !== 0) {
    throw new Error('Gauges not reset');
  }
  if (Object.keys(all.histograms).length !== 0) {
    throw new Error('Histograms not reset');
  }
});

// Test 18: Logger setLevel
test('Logger - Set level', () => {
  const logger = new Logger({ level: 'INFO' });
  
  if (logger.levelValue !== 1) {
    throw new Error('Initial log level not set correctly');
  }
  
  logger.setLevel('DEBUG');
  if (logger.levelValue !== 0) {
    throw new Error(`Log level not updated to DEBUG, got ${logger.levelValue}`);
  }
  
  logger.setLevel('ERROR');
  if (logger.levelValue !== 3) {
    throw new Error(`Log level not updated to ERROR, got ${logger.levelValue}`);
  }
});

// Test 19: Tracer clearOldSpans
test('Tracer - Clear old spans', () => {
  const tracer = new Tracer();
  
  // Create many spans
  for (let i = 0; i < 1500; i++) {
    const traceId = tracer.startTrace(`operation-${i}`);
    tracer.startSpan(`span-${i}`, { traceId });
  }
  
  tracer.clearOldSpans(1000);
  
  if (tracer.spans.size > 1000) {
    throw new Error('Old spans not cleared');
  }
});

// Test 20: Messaging base class methods
test('Messaging adapters - Base class methods', () => {
  const sqs = new SQSMessaging();
  
  // Check that base methods exist
  if (typeof sqs.connect !== 'function') {
    throw new Error('connect method missing');
  }
  if (typeof sqs.disconnect !== 'function') {
    throw new Error('disconnect method missing');
  }
  if (typeof sqs.publish !== 'function') {
    throw new Error('publish method missing');
  }
  if (typeof sqs.subscribe !== 'function') {
    throw new Error('subscribe method missing');
  }
});

// Run all tests
async function runTests() {
  console.log('Running synchronous tests...\n');
  
  // All tests are synchronous except we need to handle async ones
  await Promise.all([
    // Any async tests would go here
  ]);

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All v3 features verified successfully!');
    console.log('\n💡 Note: Messaging adapters require their dependencies:');
    console.log('   - SQS: npm install @aws-sdk/client-sqs');
    console.log('   - Kafka: npm install kafkajs');
    console.log('   - NATS: npm install nats');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

runTests().catch(console.error);

