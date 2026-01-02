# Navis.js

A lightweight, serverless-first, microservice API framework designed for AWS Lambda and Node.js.

## Philosophy

Navis.js is "Express for serverless microservices — but simpler."

- **Extremely lightweight** - Zero or minimal dependencies
- **Serverless-first** - Built for AWS Lambda
- **Microservice-friendly** - API-to-API communication made easy
- **Simple & readable** - No magic abstractions

## Installation

# Clone the repository
git clone <your-repo-url>
cd navis.js

# Install dependencies (if any)
npm install

# Link CLI locally for development
npm link## Quick Start

### Node.js HTTP Server
cript
const { NavisApp, response } = require('navis.js');

const app = new NavisApp();

app.get('/', (req, res) => {
  response.success(res, { message: 'Hello Navis.js!' });
});

app.listen(3000);
### AWS Lambda
t
const { NavisApp } = require('navis.js');

const app = new NavisApp();

app.get('/hello', (req, res) => {
  res.statusCode = 200;
  res.body = { message: 'Hello from Lambda!' };
});

exports.handler = async (event) => {
  return await app.handleLambda(event);
};## CLI

# Start example server
navis start## Features

### v1 (Current)

- ✅ HTTP routing (GET, POST, PUT, DELETE)
- ✅ Middleware support (`app.use()`)
- ✅ Unified handler for Node.js and AWS Lambda
- ✅ Simple path-based routing
- ✅ ServiceClient for service-to-service calls
- ✅ Timeout support

### v2 (Planned)

- 🔄 Retry logic
- 🔄 Circuit breaker
- 🔄 Config-based services
- 🔄 Service discovery
- 🔄 Async messaging (SQS / Kafka / NATS)
- 🔄 CLI generators (`navis generate service`)

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

### ServiceClient

const { ServiceClient } = require('navis.js');

const client = new ServiceClient('http://api.example.com', {
  timeout: 5000, // milliseconds
});

// GET request
const response = await client.get('/users');

// POST request
const result = await client.post('/users', { name: 'John' });### Response Helpers

const { response } = require('navis.js');

// Success response
response.success(res, { data: 'value' }, 200);

// Error response
response.error(res, 'Error message', 500);## Examples

See the `examples/` directory:

- `server.js` - Node.js HTTP server example
- `lambda.js` - AWS Lambda handler example
- `service-client-demo.js` - ServiceClient usage example

## Roadmap

### v1 (Current)
Core functionality: routing, middleware, Lambda support, ServiceClient

### v2 (Next)
Resilience patterns: retry, circuit breaker, service discovery

### v3 (Future)
Advanced features: async messaging, observability, advanced CLI

## License

MIT