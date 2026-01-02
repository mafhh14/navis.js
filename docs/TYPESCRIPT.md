# TypeScript Support in Navis.js

## Overview

Navis.js v5.3 includes full TypeScript support with comprehensive type definitions for all features. You get complete type safety, IntelliSense, and autocomplete without any additional setup.

## Installation

TypeScript types are included automatically with the package:

```bash
npm install navis.js
# No @types/navis.js needed - types are included!
```

## Basic Usage

### Import with TypeScript

```typescript
import { NavisApp, response } from 'navis.js';

const app = new NavisApp();

app.get('/', (req, res) => {
  // Full type safety and IntelliSense
  response.success(res, { 
    message: 'Hello from TypeScript!' 
  });
});

app.listen(3000);
```

### Type-Safe Request/Response

```typescript
import { NavisApp, NavisRequest, NavisResponse } from 'navis.js';

const app = new NavisApp();

app.get('/users/:id', (req: NavisRequest, res: NavisResponse) => {
  // TypeScript knows req.params exists and is typed
  const userId = req.params?.id;
  
  // TypeScript knows res has statusCode, body, etc.
  res.statusCode = 200;
  res.body = { userId };
});
```

## Type Definitions

All major components have full type definitions:

### NavisApp

```typescript
import { NavisApp, NavisAppOptions } from 'navis.js';

const app = new NavisApp({
  useAdvancedRouter: true
});
```

### ServiceClient

```typescript
import { ServiceClient, ServiceClientOptions } from 'navis.js';

const client = new ServiceClient('http://api.example.com', {
  timeout: 5000,
  maxRetries: 3,
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 60000,
  },
});

// Fully typed response
const response = await client.get('/users');
// response.statusCode, response.body, response.headers are all typed
```

### Middleware

```typescript
import { Middleware, NavisRequest, NavisResponse } from 'navis.js';

const myMiddleware: Middleware = async (req, res, next) => {
  // TypeScript knows the types
  console.log(req.method, req.path);
  await next();
};

app.use(myMiddleware);
```

### Validation

```typescript
import { validate, ValidationSchema } from 'navis.js';

const schema: ValidationSchema = {
  body: {
    name: { 
      type: 'string', 
      required: true, 
      minLength: 2 
    },
    email: { 
      type: 'string', 
      required: true, 
      format: 'email' 
    },
  },
};

app.post('/users', validate(schema), (req, res) => {
  // req.body is typed based on schema
  const { name, email } = req.body;
});
```

### Authentication

```typescript
import { authenticateJWT, AuthOptions } from 'navis.js';

const authOptions: AuthOptions = {
  secret: process.env.JWT_SECRET || 'secret',
  algorithm: 'HS256',
};

app.get('/protected', authenticateJWT(authOptions), (req, res) => {
  // req.user is typed (if you extend the type)
  response.success(res, { message: 'Protected' });
});
```

### Caching

```typescript
import { Cache, CacheOptions, cache } from 'navis.js';

const cacheOptions: CacheOptions = {
  maxSize: 1000,
  defaultTTL: 3600000,
};

const cacheStore = new Cache(cacheOptions);

app.get('/users/:id', cache({
  cacheStore,
  ttl: 1800,
  keyGenerator: (req) => `user:${req.params?.id}`,
}), (req, res) => {
  response.success(res, { userId: req.params?.id });
});
```

### Observability

```typescript
import { Logger, Metrics, LoggerOptions } from 'navis.js';

const loggerOptions: LoggerOptions = {
  level: 'INFO',
  context: { service: 'api' },
};

const logger = new Logger(loggerOptions);
const metrics = new Metrics();

logger.info('User logged in', { userId: 123 });
metrics.increment('api_calls', 1, { endpoint: '/users' });
```

### Real-time Features

```typescript
import { WebSocketServer, sse, SSEServer } from 'navis.js';

// Server-Sent Events
app.get('/events', sse(), (req, res) => {
  res.sse?.send({ message: 'Connected' }, 'connection');
});

// WebSocket
const wsServer = new WebSocketServer({ path: '/ws' });
wsServer.attach(server);
wsServer.onConnection((client) => {
  client.send({ type: 'welcome' });
});
```

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Using with TypeScript

1. Install TypeScript (if not already installed):
```bash
npm install -D typescript @types/node
```

2. Create `tsconfig.json` (see example above)

3. Write your code in `.ts` files:
```typescript
// app.ts
import { NavisApp } from 'navis.js';
const app = new NavisApp();
// ...
```

4. Compile:
```bash
npx tsc
```

5. Run:
```bash
node dist/app.js
```

## Examples

See the `examples/` directory for complete TypeScript examples:

- `server.ts` - Basic TypeScript HTTP server
- `lambda.ts` - TypeScript Lambda handler
- `typescript-features-demo.ts` - Complete feature demonstration

## Benefits

✅ **Full Type Safety** - Catch errors at compile time  
✅ **IntelliSense** - Autocomplete for all APIs  
✅ **Better Documentation** - Types serve as inline documentation  
✅ **Refactoring Support** - Safe refactoring with type checking  
✅ **No Additional Setup** - Types included in the package  

## Migration from JavaScript

If you're migrating existing JavaScript code:

1. Rename `.js` files to `.ts`
2. Add type annotations gradually
3. Fix type errors as they appear
4. Enjoy better developer experience!

## Type Extensions

You can extend types for custom properties:

```typescript
import { NavisRequest } from 'navis.js';

interface ExtendedRequest extends NavisRequest {
  user?: {
    id: string;
    email: string;
  };
}

app.get('/profile', (req: ExtendedRequest, res) => {
  if (req.user) {
    response.success(res, { user: req.user });
  }
});
```

## Support

All features from v1 through v5.3 have full TypeScript support. If you encounter any type issues, please report them on GitHub.

