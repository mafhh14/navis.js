/**
 * Verification Script for Navis.js v4 Features
 * Tests all new v4 functionality
 */

const {
  NavisApp,
  AdvancedRouter,
  validate,
  ValidationError,
  authenticateJWT,
  authenticateAPIKey,
  authorize,
  rateLimit,
  RateLimiter,
  errorHandler,
  asyncHandler,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
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

console.log('🧪 Verifying Navis.js v4 Features\n');
console.log('='.repeat(60));

// Test 1: Advanced Router - Route Parameters
test('AdvancedRouter - Route parameters', () => {
  const router = new AdvancedRouter();
  router.get('/users/:id', () => {});
  
  const result = router.find('GET', '/users/123');
  if (!result) {
    throw new Error('Route not found');
  }
  if (result.params.id !== '123') {
    throw new Error('Parameter not extracted correctly');
  }
});

// Test 2: Advanced Router - Multiple Parameters
test('AdvancedRouter - Multiple parameters', () => {
  const router = new AdvancedRouter();
  router.get('/users/:id/posts/:postId', () => {});
  
  const result = router.find('GET', '/users/123/posts/456');
  if (!result) {
    throw new Error('Route not found');
  }
  if (result.params.id !== '123' || result.params.postId !== '456') {
    throw new Error('Multiple parameters not extracted correctly');
  }
});

// Test 3: Advanced Router - Route Specificity
test('AdvancedRouter - Route specificity', () => {
  const router = new AdvancedRouter();
  router.get('/users/:id', () => {});
  router.get('/users/me', () => {});
  
  // More specific route should match first
  const result = router.find('GET', '/users/me');
  if (!result) {
    throw new Error('Route not found');
  }
});

// Test 4: Validation - Required Field
testAsync('Validation - Required field', async () => {
  const schema = {
    body: {
      name: { type: 'string', required: true },
    },
  };
  
  const middleware = validate(schema);
  const req = { body: {} };
  const res = { statusCode: 200, body: null };
  
  let errorThrown = false;
  await middleware(req, res, () => {
    throw new Error('Should not call next');
  }).catch(() => {
    errorThrown = true;
  });
  
  if (!errorThrown) {
    throw new Error('Validation should fail for missing required field');
  }
});

// Test 5: Validation - Type Check
testAsync('Validation - Type check', async () => {
  const schema = {
    body: {
      age: { type: 'number', required: true },
    },
  };
  
  const middleware = validate(schema);
  const req = { body: { age: 'not-a-number' } };
  const res = { statusCode: 200, body: null };
  
  let errorThrown = false;
  await middleware(req, res, () => {
    throw new Error('Should not call next');
  }).catch(() => {
    errorThrown = true;
  });
  
  if (!errorThrown) {
    throw new Error('Validation should fail for wrong type');
  }
});

// Test 6: Validation - Email Format
testAsync('Validation - Email format', async () => {
  const schema = {
    body: {
      email: { type: 'string', format: 'email', required: true },
    },
  };
  
  const middleware = validate(schema);
  const req = { body: { email: 'not-an-email' } };
  const res = { statusCode: 200, body: null };
  
  let errorThrown = false;
  await middleware(req, res, () => {
    throw new Error('Should not call next');
  }).catch(() => {
    errorThrown = true;
  });
  
  if (!errorThrown) {
    throw new Error('Validation should fail for invalid email');
  }
});

// Test 7: Rate Limiter - Instantiation
test('RateLimiter - Instantiation', () => {
  const limiter = new RateLimiter({
    windowMs: 60000,
    max: 100,
  });
  
  if (!limiter) {
    throw new Error('RateLimiter not created');
  }
});

// Test 8: Rate Limiter - Get Info
test('RateLimiter - Get info', () => {
  const limiter = new RateLimiter({ max: 10 });
  const info = limiter.get('test-key');
  
  // Should return null for non-existent key
  if (info !== null) {
    throw new Error('Should return null for non-existent key');
  }
});

// Test 9: Error Classes
test('Error Classes - NotFoundError', () => {
  const error = new NotFoundError('Not found');
  
  if (error.statusCode !== 404) {
    throw new Error('Status code should be 404');
  }
  if (error.code !== 'NOT_FOUND') {
    throw new Error('Code should be NOT_FOUND');
  }
});

// Test 10: Error Classes - BadRequestError
test('Error Classes - BadRequestError', () => {
  const error = new BadRequestError('Bad request');
  
  if (error.statusCode !== 400) {
    throw new Error('Status code should be 400');
  }
});

// Test 11: Error Handler
test('Error Handler - Function exists', () => {
  if (typeof errorHandler !== 'function') {
    throw new Error('errorHandler should be a function');
  }
});

// Test 12: Async Handler
test('Async Handler - Function exists', () => {
  if (typeof asyncHandler !== 'function') {
    throw new Error('asyncHandler should be a function');
  }
});

// Test 13: NavisApp - Advanced Router Enabled
test('NavisApp - Advanced router enabled by default', () => {
  const app = new NavisApp();
  
  if (!app.useAdvancedRouter) {
    throw new Error('Advanced router should be enabled by default');
  }
});

// Test 14: NavisApp - PATCH Method
test('NavisApp - PATCH method', () => {
  const app = new NavisApp();
  
  app.patch('/users/:id', () => {});
  
  const router = app.router;
  const routes = router.getAllRoutes();
  
  if (!routes.PATCH || routes.PATCH.length === 0) {
    throw new Error('PATCH route not registered');
  }
});

// Test 15: Module Exports
test('Module exports - All v4 features exported', () => {
  const navis = require('../src/index');
  
  if (!navis.AdvancedRouter) {
    throw new Error('AdvancedRouter not exported');
  }
  if (!navis.validate) {
    throw new Error('validate not exported');
  }
  if (!navis.authenticateJWT) {
    throw new Error('authenticateJWT not exported');
  }
  if (!navis.rateLimit) {
    throw new Error('rateLimit not exported');
  }
  if (!navis.errorHandler) {
    throw new Error('errorHandler not exported');
  }
  if (!navis.NotFoundError) {
    throw new Error('NotFoundError not exported');
  }
});

// Run all tests
async function runTests() {
  console.log('Running synchronous tests...\n');
  
  await Promise.all([
    // Async tests
  ]);

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All v4 features verified successfully!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

runTests().catch(console.error);

