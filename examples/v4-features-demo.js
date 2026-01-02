/**
 * Navis.js v4 Features Demo
 * Demonstrates advanced routing, validation, auth, rate limiting, and error handling
 */

const {
  NavisApp,
  response,
  validate,
  authenticateJWT,
  authorize,
  rateLimit,
  errorHandler,
  asyncHandler,
  NotFoundError,
  BadRequestError,
} = require('../src/index');

const app = new NavisApp();

// Set error handler
app.setErrorHandler(errorHandler({
  includeStack: true,
  logErrors: true,
}));

// Global rate limiting
app.use(rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute
}));

// Example 1: Route Parameters
console.log('\n=== Route Parameters (v4) ===\n');

app.get('/users/:id', (req, res) => {
  console.log('User ID:', req.params.id);
  response.success(res, {
    message: `Fetching user ${req.params.id}`,
    userId: req.params.id,
  });
});

app.get('/users/:id/posts/:postId', (req, res) => {
  console.log('User ID:', req.params.id);
  console.log('Post ID:', req.params.postId);
  response.success(res, {
    userId: req.params.id,
    postId: req.params.postId,
  });
});

// Example 2: Request Validation
console.log('\n=== Request Validation (v4) ===\n');

const createUserSchema = {
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
  },
};

app.post('/users', validate(createUserSchema), (req, res) => {
  console.log('Validated body:', req.body);
  response.success(res, {
    message: 'User created',
    user: req.body,
  }, 201);
});

// Example 3: Authentication (Mock JWT)
console.log('\n=== Authentication (v4) ===\n');

// Mock JWT secret (in production, use environment variable)
process.env.JWT_SECRET = 'your-secret-key';

// Protected route
app.get('/profile', authenticateJWT(), (req, res) => {
  response.success(res, {
    message: 'Protected route',
    user: req.user,
  });
});

// Role-based authorization
app.get('/admin', authenticateJWT(), authorize(['admin']), (req, res) => {
  response.success(res, {
    message: 'Admin area',
    user: req.user,
  });
});

// Example 4: Error Handling
console.log('\n=== Error Handling (v4) ===\n');

app.get('/error-test', asyncHandler(async (req, res) => {
  throw new BadRequestError('This is a bad request');
}));

app.get('/not-found-test', asyncHandler(async (req, res) => {
  throw new NotFoundError('Resource not found');
}));

// Example 5: Rate Limiting per Route
console.log('\n=== Rate Limiting (v4) ===\n');

app.post('/login', rateLimit({ max: 5, windowMs: 60000 }), (req, res) => {
  response.success(res, {
    message: 'Login endpoint (5 requests per minute)',
  });
});

// Example 6: Query Parameters
app.get('/search', (req, res) => {
  console.log('Query params:', req.query);
  response.success(res, {
    query: req.query.q,
    filters: req.query,
  });
});

// Example 7: PATCH Method (v4)
app.patch('/users/:id', validate({
  body: {
    name: { type: 'string', required: false },
    email: { type: 'string', required: false, format: 'email' },
  },
}), (req, res) => {
  response.success(res, {
    message: `Updating user ${req.params.id}`,
    updates: req.body,
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Navis.js v4 Features Demo Server`);
  console.log(`📡 Listening on http://localhost:${PORT}\n`);
  console.log('Available endpoints:');
  console.log('  GET  /users/:id');
  console.log('  GET  /users/:id/posts/:postId');
  console.log('  POST /users (with validation)');
  console.log('  GET  /profile (requires JWT)');
  console.log('  GET  /admin (requires admin role)');
  console.log('  GET  /error-test');
  console.log('  GET  /not-found-test');
  console.log('  POST /login (rate limited)');
  console.log('  GET  /search?q=test');
  console.log('  PATCH /users/:id');
  console.log('\n💡 Test with:');
  console.log('  curl http://localhost:3000/users/123');
  console.log('  curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d \'{"name":"John","email":"john@example.com","age":25}\'');
});

module.exports = app;

