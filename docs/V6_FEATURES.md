# Navis.js v6.0 Features

## Overview

v6.0 delivers the next major roadmap items:

- **Route-level middleware** — Express-style `app.get(path, middleware, handler)`
- **DynamoDB adapter** — Serverless NoSQL database support
- **Enhanced monitoring and alerting** — Metric-based alerts with webhooks
- **gRPC integration** — Microservice RPC server and client helpers
- **Unified test runner** — `npm test` runs verification suites

## Route-Level Middleware

```javascript
const { NavisApp, authenticateJWT, cache, Cache } = require('navis.js');

const app = new NavisApp();
const cacheStore = new Cache();

app.get('/users/:id', cache({
  cacheStore,
  ttl: 300,
  keyGenerator: (req) => `user:${req.params.id}`,
}), authenticateJWT({ secret: process.env.JWT_SECRET }), async (req, res) => {
  res.body = { id: req.params.id };
});
```

## DynamoDB Adapter

```javascript
const { createPool } = require('navis.js');

const db = createPool({
  type: 'dynamodb',
  region: 'us-east-1',
});

await db.connect();

await db.query('Users', {
  action: 'put',
  Item: { id: '1', name: 'Alice' },
});

const user = await db.query('Users', {
  action: 'get',
  Key: { id: '1' },
});
```

Requires: `npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb`

## Alerting

```javascript
const { Metrics, createAlertManager } = require('navis.js');

const metrics = new Metrics();
const alerts = createAlertManager();

alerts.addRule({
  name: 'high-error-rate',
  metric: 'http_errors',
  condition: 'gte',
  threshold: 10,
  message: 'Error rate exceeded threshold',
});

alerts.addChannel(createAlertManager.webhookChannel({
  url: 'https://hooks.example.com/alerts',
}));

metrics.increment('http_errors', 12);
await alerts.evaluate(metrics.getSnapshot());
```

## gRPC

```javascript
const { createGrpcServer, GrpcServer } = require('navis.js');

const server = createGrpcServer({ port: 50051 });

server.addService(myServiceDefinition, {
  getUser: GrpcServer.unaryHandler(async (call) => {
    return { id: call.request.id, name: 'Alice' };
  }),
});

await server.start();
```

Requires: `npm install @grpc/grpc-js`

## Testing

```bash
npm test
```

Runs `verify-v5.8.3.js`, `verify-v5.9.js`, and `verify-v6.0.js`.
