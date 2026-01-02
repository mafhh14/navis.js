# Navis.js v4 Features

## Overview

v4 introduces advanced features to make Navis.js production-ready: route parameters, request validation, authentication/authorization, rate limiting, and enhanced error handling.

## New Features

### 1. Advanced Routing with Parameters

Support for route parameters (`:id`), nested routes, and path matching.

**Features:**
- Route parameters (`/users/:id`)
- Multiple parameters (`/users/:id/posts/:postId`)
- Route specificity (more specific routes match first)
- PATCH method support

**Usage:**

```javascript
const { NavisApp } = require('navis.js');

const app = new NavisApp(); // Advanced router enabled by default

// Route parameters
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.body = { userId };
});

// Multiple parameters
app.get('/users/:id/posts/:postId', (req, res) => {
  res.body = {
    userId: req.params.id,
    postId: req.params.postId,
  };
});

// Query parameters (automatically parsed)
app.get('/search', (req, res) => {
  const query = req.query.q;
  res.body = { query };
});

// PATCH method
app.patch('/users/:id', (req, res) => {
  res.body = { updated: req.params.id };
});
```

### 2. Request Validation

Schema-based request validation with comprehensive rules.

**Features:**
- Body, query, params, and headers validation
- Type checking (string, number, boolean, array, object)
- String validations (minLength, maxLength, pattern, format)
- Number validations (min, max)
- Array validations (minItems, maxItems)
- Custom validators
- Email and UUID format validation

**Usage:**

```javascript
const { validate } = require('navis.js');

const userSchema = {
  body: {
    name: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 50,
    },
    email: {
      type: 'string',
      required: true,
      format: 'email',
    },
    age: {
      type: 'number',
      min: 18,
      max: 100,
    },
    tags: {
      type: 'array',
      minItems: 1,
      maxItems: 10,
    },
  },
  params: {
    id: {
      type: 'string',
      pattern: '^[0-9a-f]{24}$', // MongoDB ObjectId
    },
  },
};

app.post('/users', validate(userSchema), (req, res) => {
  // req.body is validated
  res.body = { message: 'User created', user: req.body };
});
```

**Validation Rules:**

- `type`: 'string' | 'number' | 'boolean' | 'array' | 'object'
- `required`: boolean
- `minLength` / `maxLength`: number (for strings)
- `min` / `max`: number (for numbers)
- `pattern`: regex string
- `format`: 'email' | 'uuid'
- `minItems` / `maxItems`: number (for arrays)
- `validator`: function(value) => boolean | string

### 3. Authentication & Authorization

JWT and API Key authentication with role-based access control.

**Features:**
- JWT authentication
- API Key authentication
- Role-based authorization
- Optional authentication

**Usage:**

```javascript
const {
  authenticateJWT,
  authenticateAPIKey,
  authorize,
  optionalAuth,
} = require('navis.js');

// JWT Authentication
app.use(authenticateJWT({
  secret: process.env.JWT_SECRET,
  header: 'authorization', // Default
}));

// Protected route
app.get('/profile', (req, res) => {
  res.body = { user: req.user };
});

// Role-based authorization
app.get('/admin', authenticateJWT(), authorize(['admin']), (req, res) => {
  res.body = { message: 'Admin area' };
});

// API Key authentication
app.use(authenticateAPIKey({
  header: 'x-api-key',
  keys: ['key1', 'key2'], // Or use validateKey function
}));

// Optional authentication (doesn't fail if no token)
app.get('/public', optionalAuth(), (req, res) => {
  if (req.user) {
    res.body = { message: 'Authenticated user' };
  } else {
    res.body = { message: 'Anonymous user' };
  }
});
```

### 4. Rate Limiting

In-memory rate limiting with configurable windows and limits.

**Features:**
- Global or per-route rate limiting
- Configurable window and max requests
- Skip successful/failed requests option
- Custom key generator
- Rate limit headers

**Usage:**

```javascript
const { rateLimit } = require('navis.js');

// Global rate limiting
app.use(rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per window
}));

// Per-route rate limiting
app.post('/login', rateLimit({
  max: 5, // 5 login attempts per minute
  windowMs: 60000,
}), loginHandler);

// Custom key generator
app.use(rateLimit({
  max: 10,
  keyGenerator: (req) => {
    return req.user ? req.user.id : req.ip;
  },
}));
```

**Rate Limit Headers:**

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Reset time (ISO string)

### 5. Enhanced Error Handling

Custom error classes and centralized error handling.

**Features:**
- Custom error classes (NotFoundError, BadRequestError, etc.)
- Error handler middleware
- Async error wrapper
- Structured error responses
- Stack traces in development

**Usage:**

```javascript
const {
  errorHandler,
  asyncHandler,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require('navis.js');

// Set error handler
app.setErrorHandler(errorHandler({
  includeStack: process.env.NODE_ENV === 'development',
  logErrors: true,
}));

// Use async handler for async routes
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  if (user.status === 'inactive') {
    throw new BadRequestError('User is inactive');
  }
  
  res.body = user;
}));

// Custom error classes
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}
```

**Error Classes:**

- `AppError`: Base error class
- `NotFoundError`: 404 errors
- `BadRequestError`: 400 errors
- `UnauthorizedError`: 401 errors
- `ForbiddenError`: 403 errors
- `ConflictError`: 409 errors
- `InternalServerError`: 500 errors

## Complete Example

```javascript
const {
  NavisApp,
  validate,
  authenticateJWT,
  authorize,
  rateLimit,
  errorHandler,
  asyncHandler,
  NotFoundError,
  response,
} = require('navis.js');

const app = new NavisApp();

// Error handling
app.setErrorHandler(errorHandler({
  includeStack: true,
  logErrors: true,
}));

// Global rate limiting
app.use(rateLimit({ max: 100, windowMs: 60000 }));

// Authentication
app.use(authenticateJWT({ secret: process.env.JWT_SECRET }));

// Routes with validation
const createUserSchema = {
  body: {
    name: { type: 'string', required: true, minLength: 3 },
    email: { type: 'string', required: true, format: 'email' },
  },
};

app.post('/users', validate(createUserSchema), asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  response.success(res, user, 201);
}));

// Route with parameters
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  
  if (!user) {
    throw new NotFoundError('User not found');
  }
  
  response.success(res, user);
}));

// Protected admin route
app.get('/admin/users', authorize(['admin']), asyncHandler(async (req, res) => {
  const users = await getAllUsers();
  response.success(res, users);
}));

app.listen(3000);
```

## Migration from v3

v4 is backward compatible. Existing code continues to work:

```javascript
// v3 code still works
const app = new NavisApp();
app.get('/users', handler);
```

To use v4 features, simply enable them:

```javascript
// Advanced router is enabled by default
const app = new NavisApp(); // Uses AdvancedRouter

// Or explicitly disable for v3 compatibility
const app = new NavisApp({ useAdvancedRouter: false });
```

## Best Practices

1. **Route Parameters**: Use descriptive parameter names
2. **Validation**: Validate all user input
3. **Authentication**: Use JWT for stateless auth
4. **Rate Limiting**: Set appropriate limits per endpoint
5. **Error Handling**: Use custom error classes for clarity
6. **Async Routes**: Always use `asyncHandler` for async routes

## Examples

See `examples/v4-features-demo.js` for complete working examples of all v4 features.

