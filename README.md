# Navis.js

A lightweight, serverless-first, microservice API framework designed for AWS Lambda and Node.js.

**Author:** Syed Iman Ali

## Philosophy

Navis.js is "Express for serverless microservices — but simpler."

- **Extremely lightweight** - Zero or minimal dependencies
- **Serverless-first** - Built for AWS Lambda
- **Microservice-friendly** - API-to-API communication made easy
- **Simple & readable** - No magic abstractions

## Installation

### Via npm

```bash
npm install navis.js
```

### From GitHub

```bash
# Clone the repository
git clone https://github.com/mafhh14/navis.js.git
cd navis.js

# Install dependencies (if any)
npm install

# Link CLI locally for development
npm link
```

## Quick Start

### Node.js HTTP Server

```javascript
const { NavisApp, response } = require('navis.js');

const app = new NavisApp();

app.get('/', (req, res) => {
  response.success(res, { message: 'Hello Navis.js!' });
});

app.listen(3000);
```

### AWS Lambda

```javascript
const { NavisApp } = require('navis.js');

const app = new NavisApp();

app.get('/hello', (req, res) => {
  res.statusCode = 200;
  res.body = { message: 'Hello from Lambda!' };
});

exports.handler = async (event) => {
  return await app.handleLambda(event);
};
```

## CLI

```bash
# Start example server
navis start

# Generate a new microservice (v2)
navis generate service my-service
```

## Features

### v1

- ✅ HTTP routing (GET, POST, PUT, DELETE)
- ✅ Middleware support (`app.use()`)
- ✅ Unified handler for Node.js and AWS Lambda
- ✅ Simple path-based routing
- ✅ ServiceClient for service-to-service calls
- ✅ Timeout support

### v2 (Current)

- ✅ **Retry logic** - Automatic retry with exponential backoff
- ✅ **Circuit breaker** - Prevents cascading failures
- ✅ **Config-based services** - Centralized service configuration
- ✅ **Service discovery** - Health checks and load balancing
- ✅ **Additional HTTP methods** - PUT, DELETE, PATCH support
- ✅ **CLI generators** - `navis generate service` command

### v3 (Planned)

- 🔄 Async messaging (SQS / Kafka / NATS)
- 🔄 Advanced observability
- 🔄 Enhanced CLI features

## API Reference

### NavisApp

#### Methods

- `app.use(fn)` - Register middleware
- `app.get(path, handler)` - Register GET route
- `app.post(path, handler)` - Register POST route
- `app.put(path, handler)` - Register PUT route
- `app.delete(path, handler)` - Register DELETE route
- `app.listen(port, callback)` - Start HTTP server (Node.js)
- `app.handleLambda(event)` - Handle AWS Lambda event

### ServiceClient (v2 Enhanced)

```javascript
const { ServiceClient } = require('navis.js');

// Basic usage
const client = new ServiceClient('http://api.example.com', {
  timeout: 5000,
});

// With retry and circuit breaker (v2)
const resilientClient = new ServiceClient('http://api.example.com', {
  timeout: 5000,
  maxRetries: 3,
  retryBaseDelay: 1000,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
  },
});

// All HTTP methods (v2)
await client.get('/users');
await client.post('/users', { name: 'John' });
await client.put('/users/1', { name: 'Jane' });      // v2
await client.patch('/users/1', { name: 'Bob' });      // v2
await client.delete('/users/1');                      // v2
```

### Service Configuration (v2)

```javascript
const { ServiceConfig, ServiceClient } = require('navis.js');

const config = new ServiceConfig({
  defaultOptions: {
    timeout: 5000,
    retry: { maxRetries: 3 },
    circuitBreaker: { failureThreshold: 5 },
  },
});

config.register('userService', 'http://localhost:3001');
const userConfig = config.get('userService');
const client = new ServiceClient(userConfig.baseUrl, userConfig);
```

### Service Discovery (v2)

```javascript
const { ServiceDiscovery, ServiceClient } = require('navis.js');

const discovery = new ServiceDiscovery();
discovery.register('api', [
  'http://api1.example.com',
  'http://api2.example.com',
]);

const url = discovery.getNext('api'); // Round-robin
const client = new ServiceClient(url);
```

### Response Helpers

```javascript
const { response } = require('navis.js');

// Success response
response.success(res, { data: 'value' }, 200);

// Error response
response.error(res, 'Error message', 500);
```

## Examples

See the `examples/` directory:

- `server.js` - Node.js HTTP server example
- `lambda.js` - AWS Lambda handler example
- `service-client-demo.js` - ServiceClient usage example
- `v2-features-demo.js` - v2 features demonstration (retry, circuit breaker, etc.)

## Roadmap

### v1 ✅
Core functionality: routing, middleware, Lambda support, ServiceClient

### v2 ✅ (Current)
Resilience patterns: retry, circuit breaker, service discovery, CLI generators

### v3 (Future)
Advanced features: async messaging (SQS/Kafka/NATS), observability, enhanced CLI

## Documentation

- [V2 Features Guide](./V2_FEATURES.md) - Complete v2 features documentation
- [Verification Guide](./VERIFY_V2.md) - How to verify all features

## License

MIT

## Author

**Syed Iman Ali**

Created with ❤️ for the serverless microservices community.