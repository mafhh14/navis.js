# Navis.js

A lightweight, serverless-first, microservice API framework designed for AWS Lambda and Node.js.

**Author:** Syed Imran Ali  
**Version:** 5.8.2  
**License:** MIT

## Philosophy

Navis.js is "Express for serverless microservices — but simpler."

- **Extremely lightweight** - Zero or minimal dependencies
- **Serverless-first** - Built for AWS Lambda with cold start optimizations
- **Microservice-friendly** - API-to-API communication made easy
- **Simple & readable** - No magic abstractions
- **Production-ready** - Enterprise features included (advanced caching, security, observability, databases, GraphQL)
- **Developer-friendly** - Full TypeScript support, OpenAPI docs, testing utilities, and comprehensive tooling
- **Database-agnostic** - Support for PostgreSQL, MySQL, MongoDB, SQLite, SQL Server with ORM-like features
- **Real-time ready** - WebSocket and Server-Sent Events support

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

### TypeScript

```typescript
import { NavisApp, response } from 'navis.js';

const app = new NavisApp();

app.get('/', (req, res) => {
  response.success(res, { 
    message: 'Hello from Navis.js with TypeScript!'
  });
});

app.listen(3000);
```

See `examples/server.ts` and `examples/typescript-features-demo.ts` for complete TypeScript examples.

## CLI

```bash
# Start example server
navis start

# Generate a new microservice (v2)
navis generate service my-service

# Run verification tests (v3)
navis test

# Show metrics endpoint info (v3)
navis metrics
```

## Features

### v1

- ✅ HTTP routing (GET, POST, PUT, DELETE)
- ✅ Middleware support (`app.use()`)
- ✅ Unified handler for Node.js and AWS Lambda
- ✅ Simple path-based routing
- ✅ ServiceClient for service-to-service calls
- ✅ Timeout support

### v2

- ✅ **Retry logic** - Automatic retry with exponential backoff
- ✅ **Circuit breaker** - Prevents cascading failures
- ✅ **Config-based services** - Centralized service configuration
- ✅ **Service discovery** - Health checks and load balancing
- ✅ **Additional HTTP methods** - PUT, DELETE, PATCH support
- ✅ **CLI generators** - `navis generate service` command

### v3 (Current)

- ✅ **Async messaging** - SQS, Kafka, and NATS adapters
- ✅ **Structured logging** - Multi-level logging with context
- ✅ **Metrics collection** - Counters, gauges, histograms with Prometheus export
- ✅ **Distributed tracing** - Trace and span management
- ✅ **Enhanced CLI** - Test and metrics commands

### v3.1

- ✅ **Lambda cold start optimization** - Connection pooling, lazy initialization
- ✅ **ServiceClientPool** - Reuse HTTP connections across invocations
- ✅ **LazyInit utility** - Defer heavy operations until needed
- ✅ **LambdaHandler** - Optimized handler with warm-up support
- ✅ **Cold start tracking** - Monitor and log cold start metrics

### v4

- ✅ **Advanced routing** - Route parameters (`:id`), nested routes, PATCH method
- ✅ **Request validation** - Schema-based validation with comprehensive rules
- ✅ **Authentication** - JWT and API Key authentication
- ✅ **Authorization** - Role-based access control
- ✅ **Rate limiting** - In-memory rate limiting with configurable windows
- ✅ **Enhanced error handling** - Custom error classes and error handler middleware

### v5

- ✅ **Caching layer** - In-memory cache with TTL and Redis adapter
- ✅ **CORS support** - Cross-Origin Resource Sharing middleware
- ✅ **Security headers** - Protection against common attacks
- ✅ **Response compression** - Gzip and Brotli compression
- ✅ **Health checks** - Liveness and readiness probes
- ✅ **Graceful shutdown** - Clean shutdown handling

### v5.1

- ✅ **OpenAPI/Swagger** - Auto-generate API documentation
- ✅ **API versioning** - URL-based and header-based versioning
- ✅ **File upload** - Multipart form data handling
- ✅ **Testing utilities** - Test helpers for applications

### v5.2

- ✅ **WebSocket support** - Real-time bidirectional communication
- ✅ **Server-Sent Events** - One-way real-time streaming
- ✅ **Database integration** - Connection pooling for PostgreSQL, MySQL, MongoDB, SQLite, SQL Server

### v5.3 ✅
- ✅ **TypeScript support** - Full type definitions for all features
- ✅ **Type-safe API** - Complete IntelliSense and type checking
- ✅ **TypeScript examples** - Ready-to-use TypeScript examples

### v5.4 ✅
- ✅ **GraphQL support** - Lightweight GraphQL server implementation
- ✅ **GraphQL queries & mutations** - Full query and mutation support
- ✅ **GraphQL resolvers** - Flexible resolver system with utilities
- ✅ **GraphQL schema builder** - Schema definition helpers
- ✅ **GraphQL middleware** - Easy integration with Navis.js routes

### v5.5 ✅
- ✅ **Extended database adapters** - SQLite and SQL Server support
- ✅ **Enhanced database pool** - Support for 5 database types (PostgreSQL, MySQL, MongoDB, SQLite, SQL Server)
- ✅ **Improved connection handling** - Better error handling and connection management

### v5.6 ✅
- ✅ **Advanced query builders** - Fluent SQL query builder for all SQL databases
- ✅ **MongoDB query builder** - Fluent MongoDB query builder with aggregation support
- ✅ **Type-safe queries** - Full TypeScript support for query builders
- ✅ **Complex queries** - Support for JOINs, nested WHERE conditions, GROUP BY, HAVING, ORDER BY
- ✅ **Database-agnostic** - Automatic SQL dialect handling (PostgreSQL, MySQL, SQLite, SQL Server)

### v5.7 ✅
- ✅ **ORM-like features** - Model definitions with relationships, hooks, and validation
- ✅ **Database migrations** - Migration system with up/down support and tracking
- ✅ **Model relationships** - hasMany, belongsTo, hasOne relationship definitions
- ✅ **Lifecycle hooks** - beforeSave, afterSave, beforeCreate, afterCreate, etc.
- ✅ **Change tracking** - isDirty, getChanged for detecting model modifications
- ✅ **TypeScript support** - Full type definitions for models and migrations

### v5.7.1 ✅
- 🐛 **Bug fix** - Fixed ServiceClient JSON parsing error handling - now properly rejects on parse failures instead of silently resolving
- ✅ **Improved error handling** - ServiceClient now provides detailed error information (status code, headers, raw body) when JSON parsing fails

### v5.8.0 ✅
- ✅ **Advanced caching strategies** - Multi-level caching (L1 in-memory + L2 Redis)
- ✅ **Cache warming** - Pre-populate cache with frequently accessed data
- ✅ **Cache invalidation** - Tag-based and pattern-based invalidation
- ✅ **Cache statistics** - Comprehensive hit/miss rates, L1/L2 distribution
- ✅ **Cache compression** - Automatic compression for large values
- ✅ **Write strategies** - Write-through, write-back, write-around
- ✅ **Cache stampede prevention** - Prevents concurrent requests for same key
- ✅ **Cache versioning** - Support for cache schema migrations

### v5.8.1 ✅ (Current)
- 📝 **Documentation** - Enhanced README Philosophy section with comprehensive feature highlights

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

### GraphQL Support (v5.4)

```javascript
const {
  NavisApp,
  graphql,
  createGraphQLServer,
  createResolver,
  createSchema,
  combineResolvers,
} = require('navis.js');

// Basic GraphQL setup
const resolvers = {
  Query: {
    users: createResolver(async (variables, context) => {
      return [{ id: '1', name: 'Alice' }];
    }),
  },
  Mutation: {
    createUser: createResolver(async (variables, context) => {
      const { name, email } = variables;
      return { id: '2', name, email };
    }),
  },
};

app.use(graphql({
  path: '/graphql',
  resolvers,
  context: (req) => ({ userId: req.headers['x-user-id'] }),
}));

// Advanced: Custom GraphQL server
const server = createGraphQLServer({
  resolvers,
  context: async (req) => ({ user: await getUser(req) }),
  formatError: (error) => ({ message: error.message, code: 'CUSTOM_ERROR' }),
});

app.use(server.handler({ path: '/graphql', enableGET: true }));

// Schema builder
const schema = createSchema();
schema
  .type('User', { id: 'ID!', name: 'String!', email: 'String!' })
  .query('users', { type: '[User!]!' })
  .mutation('createUser', { args: { name: 'String!', email: 'String!' }, type: 'User!' });
const schemaString = schema.build();

// Resolver utilities
const userResolver = createResolver(
  async (variables, context) => { /* resolver logic */ },
  {
    validate: async (vars) => ({ valid: true }),
    authorize: async (ctx) => true,
    cache: { get: async (k) => null, set: async (k, v) => {}, key: (v, c) => 'key' },
  }
);

// Combine multiple resolvers
const allResolvers = combineResolvers(userResolvers, postResolvers, commentResolvers);
```

**GraphQL Features:**
- Query and mutation support
- Resolver utilities (validation, authorization, caching)
- Schema builder for type definitions
- Context injection for request-specific data
- Error formatting and handling
- GET and POST request support
- TypeScript support included

### Observability (v3)

```javascript
const { Logger, Metrics, Tracer } = require('navis.js');

// Structured logging
const logger = new Logger({ level: 'INFO', context: { service: 'api' } });
logger.info('User logged in', { userId: 123 });

// Metrics collection
const metrics = new Metrics();
metrics.increment('api_calls', 1, { endpoint: '/users' });
metrics.recordRequest('GET', '/users', 150, 200);

// Expose Prometheus metrics
app.get('/metrics', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.end(metrics.toPrometheus());
});

// Distributed tracing
const tracer = new Tracer({ serviceName: 'api' });
const traceId = tracer.startTrace('user-operation');
const spanId = tracer.startSpan('db-query', { traceId });
tracer.finishSpan(spanId, { status: 'ok' });
```

### Async Messaging (v3)

```javascript
const { SQSMessaging, KafkaMessaging, NATSMessaging } = require('navis.js');

// AWS SQS (requires @aws-sdk/client-sqs)
const sqs = new SQSMessaging({ region: 'us-east-1' });
await sqs.connect();
await sqs.publish(queueUrl, { userId: 123, action: 'user.created' });

// Kafka (requires kafkajs)
const kafka = new KafkaMessaging({ brokers: ['localhost:9092'] });
await kafka.connect();
await kafka.publish('user-events', { userId: 123, event: 'created' });

// NATS (requires nats)
const nats = new NATSMessaging({ servers: ['nats://localhost:4222'] });
await nats.connect();
await nats.publish('user.created', { userId: 123 });
```

### Lambda Optimization (v3.1)

```javascript
const {
  NavisApp,
  getPool,
  LambdaHandler,
  coldStartTracker,
  LazyInit,
} = require('navis.js');

// Initialize app OUTSIDE handler (reused across invocations)
const app = new NavisApp();
app.use(coldStartTracker);

// Connection pooling - reuse HTTP connections
const client = getPool().get('http://api.example.com', {
  timeout: 3000,
  maxRetries: 2,
});

// Lazy initialization - defer heavy operations
const dbConnection = new LazyInit();
app.get('/users', async (req, res) => {
  const db = await dbConnection.init(async () => {
    return await connectToDatabase(); // Only runs once
  });
  res.body = await db.query('SELECT * FROM users');
});

// Optimized Lambda handler
const handler = new LambdaHandler(app, {
  enableMetrics: true,
  warmupPath: '/warmup',
});

exports.handler = async (event, context) => {
  return await handler.handle(event, context);
};
```

### GraphQL Support (v5.4)

**JavaScript Example:**
```javascript
const { NavisApp, graphql, createResolver } = require('navis.js');

const app = new NavisApp();

// Define resolvers
const resolvers = {
  Query: {
    // Get all users
    users: createResolver(async (variables, context) => {
      return [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
    }),

    // Get user by ID
    user: createResolver(async (variables, context) => {
      const { id } = variables;
      return { id, name: 'Alice', email: 'alice@example.com' };
    }),
  },

  Mutation: {
    // Create user
    createUser: createResolver(async (variables, context) => {
      const { name, email } = variables;
      return { id: '3', name, email };
    }),
  },
};

// Add GraphQL middleware
app.use(graphql({
  path: '/graphql',
  resolvers,
  context: (req) => ({
    userId: req.headers['x-user-id'] || null,
  }),
}));

app.listen(3000);
```

**TypeScript Example:**
```typescript
import {
  NavisApp,
  graphql,
  createResolver,
  GraphQLContext,
} from 'navis.js';

interface User {
  id: string;
  name: string;
  email: string;
}

const app = new NavisApp();

// Define resolvers with TypeScript types
const resolvers = {
  Query: {
    users: createResolver<User[]>(async (variables, context: GraphQLContext) => {
      return [{ id: '1', name: 'Alice', email: 'alice@example.com' }];
    }),

    user: createResolver<User | null>(async (variables, context: GraphQLContext) => {
      const { id } = variables as { id: string };
      return { id, name: 'Alice', email: 'alice@example.com' };
    }),
  },

  Mutation: {
    createUser: createResolver<User>(async (variables, context: GraphQLContext) => {
      const { name, email } = variables as { name: string; email: string };
      return { id: '3', name, email };
    }),
  },
};

// Add GraphQL middleware
app.use(graphql({
  path: '/graphql',
  resolvers,
  context: (req) => ({
    userId: (req.headers['x-user-id'] as string) || null,
  }),
}));

app.listen(3000);
```

**GraphQL Query Example:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { users { id name } }"}'
```

**GraphQL Mutation Example:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createUser(name: \"Charlie\", email: \"charlie@example.com\") { id name email } }"}'
```

See `examples/graphql-demo.js` for a complete GraphQL example.

### Extended Database Adapters (v5.5)

**JavaScript Example:**
```javascript
const { NavisApp, createPool, response } = require('navis.js');

const app = new NavisApp();

// SQLite Database
app.get('/sqlite/users', async (req, res) => {
  const db = createPool({
    type: 'sqlite',
    connectionString: ':memory:', // or path to .db file
  });
  
  await db.connect();
  const users = await db.query('SELECT * FROM users');
  await db.close();
  
  response.success(res, { users });
});

// SQL Server Database
app.get('/sqlserver/users', async (req, res) => {
  const db = createPool({
    type: 'mssql',
    connectionString: 'Server=localhost;Database=testdb;User Id=sa;Password=pass',
  });
  
  await db.connect();
  const users = await db.query('SELECT TOP 10 * FROM users');
  await db.close();
  
  response.success(res, { users });
});
```

**TypeScript Example:**
```typescript
import { NavisApp, createPool, response, DatabasePool } from 'navis.js';

const app = new NavisApp();

// SQLite with TypeScript
app.get('/sqlite/users', async (req, res) => {
  const db: DatabasePool = createPool({
    type: 'sqlite',
    connectionString: ':memory:',
  });
  
  await db.connect();
  const users = await db.query('SELECT * FROM users') as User[];
  await db.close();
  
  response.success(res, { users });
});
```

**Supported Databases:**
- ✅ PostgreSQL (`postgres` or `postgresql`)
- ✅ MySQL/MariaDB (`mysql` or `mariadb`)
- ✅ MongoDB (`mongodb`)
- ✅ SQLite (`sqlite` or `sqlite3`) - **NEW in v5.5**
- ✅ SQL Server (`mssql` or `sqlserver`) - **NEW in v5.5**

See `examples/database-adapters-demo.js` and `examples/database-adapters-demo.ts` for complete examples.

### Advanced Query Builders (v5.6)

**JavaScript Example:**
```javascript
const { NavisApp, createPool, queryBuilder, mongoQueryBuilder, response } = require('navis.js');

const app = new NavisApp();

// SQL Query Builder
app.get('/users', async (req, res) => {
  const db = createPool({
    type: 'postgres',
    connectionString: process.env.DATABASE_URL,
  });
  
  await db.connect();
  
  // Fluent query builder
  const users = await queryBuilder(db, 'users')
    .select(['id', 'name', 'email'])
    .where('status', '=', 'active')
    .where('age', '>', 18)
    .whereIn('role', ['user', 'admin'])
    .orderBy('name', 'ASC')
    .limit(10)
    .execute();
  
  await db.close();
  response.success(res, { users });
});

// Complex WHERE with nested conditions
app.get('/products', async (req, res) => {
  const db = createPool({ type: 'sqlite', connectionString: ':memory:' });
  await db.connect();
  
  const products = await queryBuilder(db, 'products')
    .select('*')
    .where((qb) => {
      qb.where('category', '=', 'Electronics')
        .orWhere('price', '<', 50);
    })
    .where('in_stock', '>', 0)
    .groupBy('category')
    .having('COUNT(*)', '>', 5)
    .orderBy('price', 'DESC')
    .execute();
  
  await db.close();
  response.success(res, { products });
});

// INSERT, UPDATE, DELETE
app.post('/users', async (req, res) => {
  const db = createPool({ type: 'postgres', connectionString: process.env.DATABASE_URL });
  await db.connect();
  
  const result = await queryBuilder(db)
    .insert('users', {
      name: req.body.name,
      email: req.body.email,
      age: req.body.age,
    })
    .execute();
  
  await db.close();
  response.success(res, { id: result.insertId });
});

// MongoDB Query Builder
app.get('/mongo/users', async (req, res) => {
  const db = createPool({
    type: 'mongodb',
    connectionString: process.env.MONGODB_URI,
  });
  
  await db.connect();
  
  const users = await mongoQueryBuilder(db, 'users')
    .where('status', 'active')
    .gt('age', 18)
    .in('role', ['user', 'admin'])
    .sortDesc('created_at')
    .limit(10)
    .find();
  
  await db.close();
  response.success(res, { users });
});
```

**TypeScript Example:**
```typescript
import { NavisApp, createPool, queryBuilder, mongoQueryBuilder, response, DatabasePool, QueryBuilder } from 'navis.js';

const app = new NavisApp();

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

app.get('/users', async (req, res) => {
  const db: DatabasePool = createPool({
    type: 'postgres',
    connectionString: process.env.DATABASE_URL!,
  });
  
  await db.connect();
  
  const users = await queryBuilder(db, 'users')
    .select(['id', 'name', 'email'])
    .where('status', '=', 'active')
    .where((qb: QueryBuilder) => {
      qb.where('age', '>', 18)
        .orWhere('role', '=', 'admin');
    })
    .orderBy('name', 'ASC')
    .limit(10)
    .execute() as User[];
  
  await db.close();
  response.success(res, { users });
});
```

**Query Builder Features:**
- ✅ **SELECT** - Fluent SELECT queries with WHERE, JOIN, GROUP BY, HAVING, ORDER BY, LIMIT, OFFSET
- ✅ **INSERT** - Type-safe INSERT operations
- ✅ **UPDATE** - UPDATE with WHERE conditions
- ✅ **DELETE** - DELETE with WHERE conditions
- ✅ **JOINs** - LEFT, RIGHT, INNER, FULL JOIN support
- ✅ **Nested conditions** - Complex WHERE with callbacks
- ✅ **Database-specific** - Automatic SQL dialect handling
- ✅ **MongoDB** - Full MongoDB query builder with aggregation pipeline
- ✅ **TypeScript** - Full type definitions and IntelliSense support

See `examples/query-builder-demo.js` and `examples/query-builder-demo.ts` for complete examples.

## Examples

See the `examples/` directory:

- `server.js` - Node.js HTTP server example
- `server.ts` - TypeScript HTTP server example (v5.3)
- `lambda.js` - AWS Lambda handler example
- `lambda.ts` - TypeScript Lambda handler example (v5.3)
- `lambda-optimized.js` - Optimized Lambda handler with cold start optimizations (v3.1)
- `typescript-features-demo.ts` - Complete TypeScript features demonstration (v5.3)
- `v2-features-demo.js` - v2 features demonstration (retry, circuit breaker, etc.)
- `v3-features-demo.js` - v3 features demonstration (messaging, observability, etc.)
- `v4-features-demo.js` - v4 features demonstration (routing, validation, auth, rate limiting, etc.)
- `v5-features-demo.js` - v5 features demonstration (caching, CORS, security, compression, health checks, etc.)
- `v5.1-features-demo.js` - v5.1 features demonstration (Swagger, versioning, upload, testing)
- `v5.2-features-demo.js` - v5.2 features demonstration (WebSocket, SSE, database)
- `graphql-demo.js` - GraphQL server example with queries and mutations (v5.4) - JavaScript
- `graphql-demo.ts` - GraphQL server example with TypeScript types (v5.4) - TypeScript
- `database-adapters-demo.js` - Extended database adapters example (v5.5) - JavaScript
- `database-adapters-demo.ts` - Extended database adapters example (v5.5) - TypeScript
- `query-builder-demo.js` - Advanced query builder example (v5.6) - JavaScript
- `query-builder-demo.ts` - Advanced query builder example (v5.6) - TypeScript
- `orm-migrations-demo.js` - ORM-like features and migrations example (v5.7) - JavaScript
- `orm-migrations-demo.ts` - ORM-like features and migrations example (v5.7) - TypeScript
- `advanced-cache-demo.js` - Advanced caching strategies example (v5.8) - JavaScript
- `advanced-cache-demo.ts` - Advanced caching strategies example (v5.8) - TypeScript
- `service-client-demo.js` - ServiceClient usage example

## Roadmap

### v1 ✅
Core functionality: routing, middleware, Lambda support, ServiceClient

### v2 ✅
Resilience patterns: retry, circuit breaker, service discovery, CLI generators

### v3 ✅
Advanced features: async messaging (SQS/Kafka/NATS), observability, enhanced CLI

### v4 ✅
Production-ready: advanced routing, validation, authentication, rate limiting, error handling

### v5 ✅
Enterprise-grade: caching, CORS, security headers, compression, health checks, graceful shutdown

### v5.1 ✅
Developer experience: OpenAPI/Swagger, API versioning, file upload, testing utilities

### v5.2 ✅
Real-time features: WebSocket, Server-Sent Events, database integration

### v5.3 ✅
TypeScript support: Full type definitions, type-safe API, IntelliSense

### v5.4 ✅
GraphQL support: Lightweight GraphQL server, queries, mutations, resolvers, schema builder

### v5.5 ✅
Extended database adapters: SQLite and SQL Server support, enhanced connection pooling

### v5.6 ✅
Advanced query builders: Fluent SQL and MongoDB query builders with TypeScript support

### v5.7 ✅
ORM-like features: Model definitions with relationships, hooks, validation, and database migrations

### v5.7.1 ✅
Bug fixes: ServiceClient JSON parsing error handling improvements

### v5.8 ✅
Advanced caching strategies: Multi-level caching, cache warming, invalidation, statistics, compression

### v5.8.1 ✅ (Current)
Documentation: Enhanced README Philosophy section with comprehensive feature highlights

## What's Next?

Future versions may include:
- gRPC integration
- Enhanced monitoring and alerting
- Additional database adapters
- Performance optimizations

## Documentation

- [V2 Features Guide](./docs/V2_FEATURES.md) - Complete v2 features documentation
- [V5.6 Features Guide](./docs/V5.6_FEATURES.md) - Advanced query builders documentation
- [V5.7 Features Guide](./docs/V5.7_FEATURES.md) - ORM-like features and migrations documentation
- [V5.8 Features Guide](./docs/V5.8_FEATURES.md) - Advanced caching strategies documentation
- [V3 Features Guide](./docs/V3_FEATURES.md) - Complete v3 features documentation
- [V4 Features Guide](./docs/V4_FEATURES.md) - Complete v4 features documentation
- [V5 Features Guide](./docs/V5_FEATURES.md) - Complete v5 features documentation
- [V5.1 Features Guide](./docs/V5.1_FEATURES.md) - Complete v5.1 features documentation
- [V5.2 Features Guide](./docs/V5.2_FEATURES.md) - Complete v5.2 features documentation
- [TypeScript Guide](./docs/TYPESCRIPT.md) - Complete TypeScript support documentation (v5.3)
- [Lambda Optimization Guide](./docs/LAMBDA_OPTIMIZATION.md) - Lambda cold start optimization guide (v3.1)
- [Verification Guide v2](./docs/VERIFY_V2.md) - How to verify v2 features
- [Verification Guide v3](./docs/VERIFY_V3.md) - How to verify v3 features

## License

MIT

## Author

**Syed Imran Ali**

Created with ❤️ for the serverless microservices community.