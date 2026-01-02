# Navis.js v2 Features

## Overview

v2 introduces advanced resilience patterns and microservice management features to make Navis.js production-ready for complex microservice architectures.

## New Features

### 1. Retry Logic with Exponential Backoff

Automatic retry mechanism with exponential backoff for failed requests.

**Features:**
- Configurable max retries
- Exponential backoff with jitter
- Customizable retry conditions
- Smart HTTP status code handling

**Usage:**

```javascript
const { ServiceClient } = require('navis.js');

const client = new ServiceClient('http://api.example.com', {
  maxRetries: 3,
  retryBaseDelay: 1000,
  retryMaxDelay: 30000,
});

// Automatically retries on failures
const response = await client.get('/users');
```

**Standalone Retry Utility:**

```javascript
const { retry } = require('navis.js');

const result = await retry(async () => {
  return await someFlakyOperation();
}, {
  maxRetries: 5,
  baseDelay: 1000,
});
```

### 2. Circuit Breaker Pattern

Prevents cascading failures by opening the circuit when a service is down.

**Features:**
- Three states: CLOSED, OPEN, HALF_OPEN
- Configurable failure threshold
- Automatic recovery attempts
- State monitoring

**Usage:**

```javascript
const client = new ServiceClient('http://api.example.com', {
  circuitBreaker: {
    failureThreshold: 5,    // Open after 5 failures
    resetTimeout: 60000,     // Try again after 60s
  },
});

try {
  const response = await client.get('/users');
} catch (error) {
  if (error.circuitBreakerOpen) {
    console.log('Circuit is OPEN - service unavailable');
    console.log('State:', error.circuitState);
  }
}

// Check circuit breaker state
const state = client.getCircuitBreakerState();
console.log('Circuit state:', state);

// Manually reset
client.resetCircuitBreaker();
```

### 3. Additional HTTP Methods

ServiceClient now supports all common HTTP methods.

**Methods:**
- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT` - Update resources (full replacement)
- `PATCH` - Partial updates
- `DELETE` - Delete resources

**Usage:**

```javascript
const client = new ServiceClient('http://api.example.com');

// PUT
await client.put('/users/1', { name: 'John', email: 'john@example.com' });

// PATCH
await client.patch('/users/1', { name: 'Jane' });

// DELETE
await client.delete('/users/1');
```

### 4. Service Configuration Management

Centralized configuration for multiple microservices.

**Features:**
- Register services with default options
- Service-specific overrides
- Export/import configurations
- Default options inheritance

**Usage:**

```javascript
const { ServiceConfig, ServiceClient } = require('navis.js');

// Create config manager
const config = new ServiceConfig({
  defaultOptions: {
    timeout: 5000,
    retry: { maxRetries: 3 },
    circuitBreaker: { failureThreshold: 5 },
  },
});

// Register services
config.register('userService', 'http://localhost:3001', {
  timeout: 3000,
});

config.register('orderService', 'http://localhost:3002', {
  retry: { maxRetries: 5 },
});

// Get service config and create client
const userConfig = config.get('userService');
const userClient = new ServiceClient(userConfig.baseUrl, userConfig);
```

### 5. Service Discovery

Basic service discovery with health checking and load balancing.

**Features:**
- Multiple endpoints per service
- Round-robin load balancing
- Automatic health checks
- Health status tracking

**Usage:**

```javascript
const { ServiceDiscovery, ServiceClient } = require('navis.js');

// Create service discovery
const discovery = new ServiceDiscovery({
  healthCheckInterval: 30000,
  healthCheckPath: '/health',
});

// Register service with multiple endpoints
discovery.register('api', [
  'http://api1.example.com',
  'http://api2.example.com',
  'http://api3.example.com',
]);

// Get next available service (round-robin)
const url = discovery.getNext('api');
const client = new ServiceClient(url);

// Get all healthy services
const healthy = discovery.getHealthy('api');
```

### 6. CLI Generator

Generate microservice boilerplate with a single command.

**Usage:**

```bash
# Generate a new service
navis generate service user-service

# This creates:
# user-service/
#   ├── service.js      # Node.js HTTP server
#   ├── lambda.js       # AWS Lambda handler
#   ├── package.json    # Dependencies
#   └── README.md       # Documentation
```

**Generated Structure:**

```javascript
// service.js
const { NavisApp, response } = require('navis.js');

const app = new NavisApp();

app.get('/', (req, res) => {
  response.success(res, { service: 'user-service' });
});

app.listen(3000);
```

## Complete Example

```javascript
const {
  ServiceClient,
  ServiceConfig,
  ServiceDiscovery,
} = require('navis.js');

// 1. Setup service discovery
const discovery = new ServiceDiscovery();
discovery.register('api', [
  'http://api1.example.com',
  'http://api2.example.com',
]);

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

// 4. Make requests (with automatic retry and circuit breaker)
try {
  const users = await client.get('/users');
  const user = await client.post('/users', { name: 'John' });
  await client.put('/users/1', { name: 'Jane' });
  await client.delete('/users/1');
} catch (error) {
  if (error.circuitBreakerOpen) {
    // Try next service
    const nextUrl = discovery.getNext('api');
    // Retry with different service
  }
}
```

## Migration from v1

v2 is backward compatible. Existing v1 code continues to work:

```javascript
// v1 code still works
const { ServiceClient } = require('navis.js');
const client = new ServiceClient('http://api.example.com');
await client.get('/users');
```

New features are opt-in via configuration:

```javascript
// Enable v2 features
const client = new ServiceClient('http://api.example.com', {
  maxRetries: 3,              // Enable retry
  circuitBreaker: { ... },    // Enable circuit breaker
});
```

## Performance Considerations

- **Retry Logic**: Adds latency on failures (exponential backoff)
- **Circuit Breaker**: Minimal overhead, prevents wasted requests
- **Service Discovery**: Health checks run in background
- **Service Config**: Zero runtime overhead (configuration only)

## Best Practices

1. **Retry Configuration**: 
   - Use 3-5 retries for transient failures
   - Set maxDelay to prevent excessive wait times

2. **Circuit Breaker**:
   - Set failureThreshold based on your SLA
   - Monitor circuit state in production

3. **Service Discovery**:
   - Use health checks for critical services
   - Implement fallback mechanisms

4. **Service Config**:
   - Centralize configuration
   - Use environment-specific configs

## Examples

See `examples/v2-features-demo.js` for complete working examples of all v2 features.

