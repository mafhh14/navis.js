# How to Verify Navis.js v2 Features

## Quick Verification

Run the automated verification script:

```bash
node verify-v2.js
```

This will test all v2 features and show you the results.

## Manual Verification Guide

### 1. Verify Module Exports

Check that all v2 features are exported:

```javascript
const navis = require('navis.js');

console.log('Available exports:');
console.log('- NavisApp:', !!navis.NavisApp);
console.log('- ServiceClient:', !!navis.ServiceClient);
console.log('- ServiceConfig:', !!navis.ServiceConfig); // v2
console.log('- ServiceDiscovery:', !!navis.ServiceDiscovery); // v2
console.log('- CircuitBreaker:', !!navis.CircuitBreaker); // v2
console.log('- retry:', !!navis.retry); // v2
```

### 2. Test Retry Logic

```javascript
const { retry } = require('navis.js');

let attempts = 0;
const flakyFunction = async () => {
  attempts++;
  console.log(`Attempt ${attempts}`);
  if (attempts < 3) {
    throw new Error('Temporary failure');
  }
  return { success: true };
};

const result = await retry.retry(flakyFunction, {
  maxRetries: 3,
  baseDelay: 500,
});

console.log('Result:', result); // Should succeed after 3 attempts
```

### 3. Test Circuit Breaker

```javascript
const { CircuitBreaker } = require('navis.js');

const cb = new CircuitBreaker({
  failureThreshold: 2,
  resetTimeout: 5000,
});

console.log('Initial state:', cb.getState().state); // CLOSED

// Record failures
cb.recordFailure();
cb.recordFailure();

console.log('After failures:', cb.getState().state); // OPEN
console.log('Can attempt?', cb.canAttempt()); // false

// Record success
cb.recordSuccess();
console.log('State:', cb.getState().state);
```

### 4. Test ServiceClient with Retry & Circuit Breaker

```javascript
const { ServiceClient } = require('navis.js');

const client = new ServiceClient('http://localhost:3000', {
  maxRetries: 3,
  retryBaseDelay: 1000,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
  },
});

// Check circuit breaker state
const state = client.getCircuitBreakerState();
console.log('Circuit breaker state:', state);

// Make a request (will retry on failure)
try {
  const response = await client.get('/health');
  console.log('Success:', response.data);
} catch (error) {
  if (error.circuitBreakerOpen) {
    console.log('Circuit is OPEN');
  }
}
```

### 5. Test Additional HTTP Methods

```javascript
const { ServiceClient } = require('navis.js');

const client = new ServiceClient('http://localhost:3000');

// Test all methods exist
console.log('Methods available:');
console.log('- get:', typeof client.get === 'function');
console.log('- post:', typeof client.post === 'function');
console.log('- put:', typeof client.put === 'function'); // v2
console.log('- delete:', typeof client.delete === 'function'); // v2
console.log('- patch:', typeof client.patch === 'function'); // v2
```

### 6. Test Service Configuration

```javascript
const { ServiceConfig } = require('navis.js');

const config = new ServiceConfig({
  defaultOptions: {
    timeout: 5000,
    retry: { maxRetries: 3 },
  },
});

// Register services
config.register('userService', 'http://localhost:3001');
config.register('orderService', 'http://localhost:3002', {
  timeout: 3000,
});

// Retrieve service config
const userConfig = config.get('userService');
console.log('User service config:', userConfig);

// List all services
const allServices = config.getAll();
console.log('All services:', Object.keys(allServices));
```

### 7. Test Service Discovery

```javascript
const { ServiceDiscovery } = require('navis.js');

const discovery = new ServiceDiscovery({
  healthCheckInterval: 30000,
});

// Register service with multiple endpoints
discovery.register('api', [
  'http://api1.example.com',
  'http://api2.example.com',
  'http://api3.example.com',
]);

// Round-robin selection
const url1 = discovery.getNext('api');
const url2 = discovery.getNext('api');
const url3 = discovery.getNext('api');

console.log('URL 1:', url1);
console.log('URL 2:', url2);
console.log('URL 3:', url3); // Should wrap back to first

// Health status
discovery.markHealthy('api', 'http://api1.example.com');
const healthy = discovery.getHealthy('api');
console.log('Healthy services:', healthy);
```

### 8. Test CLI Generator

```bash
# Generate a test service
navis generate service test-service

# Verify files were created
ls test-service/

# Should see:
# - service.js
# - lambda.js
# - package.json
# - README.md

# Test the generated service
cd test-service
npm install
npm start
```

### 9. Run Demo Examples

```bash
# Run the v2 features demo
node examples/v2-features-demo.js
```

### 10. Check File Structure

Verify all new files exist:

```bash
# Check new utility files
ls src/utils/
# Should include:
# - retry.js (v2)
# - circuit-breaker.js (v2)
# - service-config.js (v2)
# - service-discovery.js (v2)

# Check CLI generator
ls bin/generators/
# Should include:
# - service.js (v2)

# Check examples
ls examples/
# Should include:
# - v2-features-demo.js (v2)
```

## Integration Test

Create a complete integration test:

```javascript
const {
  ServiceClient,
  ServiceConfig,
  ServiceDiscovery,
} = require('navis.js');

// 1. Setup service discovery
const discovery = new ServiceDiscovery();
discovery.register('api', ['http://localhost:3000']);

// 2. Setup service config
const config = new ServiceConfig({
  defaultOptions: {
    timeout: 5000,
    retry: { maxRetries: 3 },
    circuitBreaker: { failureThreshold: 5 },
  },
});

// 3. Create resilient client
const apiUrl = discovery.getNext('api');
const client = new ServiceClient(apiUrl, {
  maxRetries: 3,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
  },
});

// 4. Test all HTTP methods
async function testAll() {
  try {
    await client.get('/health');
    await client.post('/echo', { test: 'data' });
    await client.put('/users/1', { name: 'John' });
    await client.patch('/users/1', { name: 'Jane' });
    await client.delete('/users/1');
    console.log('✅ All methods work!');
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testAll();
```

## Expected Results

After running all verifications, you should see:

✅ All module exports available
✅ Retry logic working with exponential backoff
✅ Circuit breaker managing states correctly
✅ All HTTP methods (GET, POST, PUT, DELETE, PATCH) available
✅ Service configuration managing services
✅ Service discovery with round-robin and health checks
✅ CLI generator creating service boilerplate
✅ All tests passing in verify-v2.js

## Troubleshooting

If any test fails:

1. **Check imports**: Make sure you're importing from the correct path
2. **Check file structure**: Verify all v2 files exist in `src/utils/`
3. **Check exports**: Verify `src/index.js` exports all v2 features
4. **Run verification script**: `node verify-v2.js` will show specific failures

## Next Steps

After verification:

1. Test with a real server: Start `examples/server.js` and test ServiceClient
2. Generate a service: Use `navis generate service my-service`
3. Review documentation: Check `V2_FEATURES.md` for detailed usage
4. Update version: Consider bumping to v2.0.0 for release

