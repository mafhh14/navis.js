/**
 * Verification Script for Lambda Optimization Features
 * Tests all v3.1 Lambda cold start optimizations
 */

const {
  ServiceClientPool,
  getPool,
  LazyInit,
  createLazyInit,
  LambdaHandler,
  coldStartTracker,
  NavisApp,
} = require('./src/index');

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

console.log('🧪 Verifying Lambda Optimization Features\n');
console.log('='.repeat(60));

// Test 1: ServiceClientPool instantiation
test('ServiceClientPool - Instantiation', () => {
  const pool = new ServiceClientPool();
  
  if (!pool) {
    throw new Error('ServiceClientPool not created');
  }
  if (pool.size() !== 0) {
    throw new Error('Pool should be empty initially');
  }
});

// Test 2: ServiceClientPool get
test('ServiceClientPool - Get client', () => {
  const pool = new ServiceClientPool();
  
  const client1 = pool.get('http://api.example.com');
  const client2 = pool.get('http://api.example.com');
  
  if (!client1) {
    throw new Error('Client not created');
  }
  if (client1 !== client2) {
    throw new Error('Client should be reused from pool');
  }
  if (pool.size() !== 1) {
    throw new Error('Pool should have 1 client');
  }
});

// Test 3: ServiceClientPool different options
test('ServiceClientPool - Different options create different clients', () => {
  const pool = new ServiceClientPool();
  
  const client1 = pool.get('http://api.example.com', { timeout: 5000 });
  const client2 = pool.get('http://api.example.com', { timeout: 10000 });
  
  if (client1 === client2) {
    throw new Error('Different options should create different clients');
  }
  if (pool.size() !== 2) {
    throw new Error('Pool should have 2 clients');
  }
});

// Test 4: ServiceClientPool singleton
test('ServiceClientPool - Singleton pattern', () => {
  const pool1 = getPool();
  const pool2 = getPool();
  
  if (pool1 !== pool2) {
    throw new Error('getPool should return singleton instance');
  }
});

// Test 5: ServiceClientPool clear
test('ServiceClientPool - Clear pool', () => {
  const pool = new ServiceClientPool();
  
  pool.get('http://api.example.com');
  pool.get('http://api2.example.com');
  
  if (pool.size() !== 2) {
    throw new Error('Pool should have 2 clients');
  }
  
  pool.clear();
  
  if (pool.size() !== 0) {
    throw new Error('Pool should be empty after clear');
  }
});

// Test 6: LazyInit instantiation
test('LazyInit - Instantiation', () => {
  const lazy = new LazyInit();
  
  if (!lazy) {
    throw new Error('LazyInit not created');
  }
  if (lazy.isInitialized()) {
    throw new Error('Should not be initialized initially');
  }
});

// Test 7: LazyInit initialization
testAsync('LazyInit - Initialize', async () => {
  const lazy = new LazyInit();
  
  const result = await lazy.init(async () => {
    return 'test-value';
  });
  
  if (result !== 'test-value') {
    throw new Error('Init result not correct');
  }
  if (!lazy.isInitialized()) {
    throw new Error('Should be initialized after init');
  }
});

// Test 8: LazyInit caching
testAsync('LazyInit - Result caching', async () => {
  const lazy = new LazyInit({ cacheResult: true });
  
  let callCount = 0;
  const initFn = async () => {
    callCount++;
    return 'cached-value';
  };
  
  const result1 = await lazy.init(initFn);
  const result2 = await lazy.init(initFn);
  
  if (callCount !== 1) {
    throw new Error('Init function should only be called once');
  }
  if (result1 !== result2) {
    throw new Error('Results should be cached');
  }
});

// Test 9: LazyInit reset
testAsync('LazyInit - Reset', async () => {
  const lazy = new LazyInit();
  
  await lazy.init(async () => 'value');
  
  if (!lazy.isInitialized()) {
    throw new Error('Should be initialized');
  }
  
  lazy.reset();
  
  if (lazy.isInitialized()) {
    throw new Error('Should not be initialized after reset');
  }
});

// Test 10: createLazyInit helper
testAsync('createLazyInit - Helper function', async () => {
  const lazy = createLazyInit(async () => 'helper-value');
  
  const result = await lazy.init();
  
  if (result !== 'helper-value') {
    throw new Error('Helper function not working');
  }
});

// Test 11: LambdaHandler instantiation
test('LambdaHandler - Instantiation', () => {
  const app = new NavisApp();
  const handler = new LambdaHandler(app);
  
  if (!handler) {
    throw new Error('LambdaHandler not created');
  }
  if (handler.isWarm) {
    throw new Error('Should not be warm initially');
  }
});

// Test 12: LambdaHandler warm-up detection
test('LambdaHandler - Warm-up event detection', () => {
  const app = new NavisApp();
  const handler = new LambdaHandler(app);
  
  const warmupEvent1 = { source: 'serverless-plugin-warmup' };
  const warmupEvent2 = { warmup: true };
  const warmupEvent3 = { httpMethod: 'GET', path: '/warmup' };
  const normalEvent = { httpMethod: 'GET', path: '/' };
  
  if (!handler.isWarmupEvent(warmupEvent1)) {
    throw new Error('Should detect serverless-plugin-warmup');
  }
  if (!handler.isWarmupEvent(warmupEvent2)) {
    throw new Error('Should detect warmup flag');
  }
  if (!handler.isWarmupEvent(warmupEvent3)) {
    throw new Error('Should detect warmup path');
  }
  if (handler.isWarmupEvent(normalEvent)) {
    throw new Error('Should not detect normal event as warmup');
  }
});

// Test 13: LambdaHandler stats
test('LambdaHandler - Get stats', () => {
  const app = new NavisApp();
  const handler = new LambdaHandler(app);
  
  const stats = handler.getStats();
  
  if (typeof stats.isWarm !== 'boolean') {
    throw new Error('Stats should include isWarm (boolean)');
  }
  if (typeof stats.invocationCount !== 'number') {
    throw new Error('Stats should include invocationCount');
  }
  if (typeof stats.coldStartCount !== 'number') {
    throw new Error('Stats should include coldStartCount');
  }
  if (typeof stats.uptime !== 'number') {
    throw new Error('Stats should include uptime');
  }
});

// Test 14: LambdaHandler reset
test('LambdaHandler - Reset', () => {
  const app = new NavisApp();
  const handler = new LambdaHandler(app);
  
  handler.isWarm = true;
  handler.invocationCount = 5;
  
  handler.reset();
  
  if (handler.isWarm) {
    throw new Error('Should not be warm after reset');
  }
  if (handler.invocationCount !== 0) {
    throw new Error('Invocation count should be reset');
  }
});

// Test 15: coldStartTracker middleware
test('coldStartTracker - Middleware function', () => {
  if (typeof coldStartTracker !== 'function') {
    throw new Error('coldStartTracker should be a function');
  }
});

// Test 16: Module exports
test('Module exports - All Lambda optimization features exported', () => {
  const navis = require('./src/index');
  
  if (!navis.ServiceClientPool) {
    throw new Error('ServiceClientPool not exported');
  }
  if (!navis.getPool) {
    throw new Error('getPool not exported');
  }
  if (!navis.LazyInit) {
    throw new Error('LazyInit not exported');
  }
  if (!navis.createLazyInit) {
    throw new Error('createLazyInit not exported');
  }
  if (!navis.LambdaHandler) {
    throw new Error('LambdaHandler not exported');
  }
  if (!navis.coldStartTracker) {
    throw new Error('coldStartTracker not exported');
  }
});

// Run all tests
async function runTests() {
  console.log('Running synchronous tests...\n');
  
  await Promise.all([
    // Any async tests would go here
  ]);

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All Lambda optimization features verified successfully!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

runTests().catch(console.error);

