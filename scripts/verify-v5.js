/**
 * Verification Script for Navis.js v5 Features
 * Tests all new v5 functionality
 */

const {
  Cache,
  RedisCache,
  cache,
  cors,
  security,
  compress,
  HealthChecker,
  createHealthChecker,
  gracefulShutdown,
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

console.log('🧪 Verifying Navis.js v5 Features\n');
console.log('='.repeat(60));

// Test 1: Cache - Instantiation
test('Cache - Instantiation', () => {
  const cacheStore = new Cache();
  
  if (!cacheStore) {
    throw new Error('Cache not created');
  }
  if (cacheStore.size() !== 0) {
    throw new Error('Cache should be empty initially');
  }
});

// Test 2: Cache - Set and Get
test('Cache - Set and Get', () => {
  const cacheStore = new Cache();
  
  cacheStore.set('key1', 'value1', 1000);
  const value = cacheStore.get('key1');
  
  if (value !== 'value1') {
    throw new Error('Cache value not retrieved correctly');
  }
});

// Test 3: Cache - Expiration
testAsync('Cache - Expiration', async () => {
  const cacheStore = new Cache();
  
  cacheStore.set('key2', 'value2', 100); // 100ms TTL
  
  await new Promise(resolve => setTimeout(resolve, 150));
  
  const value = cacheStore.get('key2');
  
  if (value !== null) {
    throw new Error('Cache entry should be expired');
  }
});

// Test 4: Cache - Has method
test('Cache - Has method', () => {
  const cacheStore = new Cache();
  
  cacheStore.set('key3', 'value3');
  
  if (!cacheStore.has('key3')) {
    throw new Error('Cache should have key3');
  }
  
  if (cacheStore.has('nonexistent')) {
    throw new Error('Cache should not have nonexistent key');
  }
});

// Test 5: Cache - Delete and Clear
test('Cache - Delete and Clear', () => {
  const cacheStore = new Cache();
  
  cacheStore.set('key4', 'value4');
  cacheStore.set('key5', 'value5');
  
  cacheStore.delete('key4');
  
  if (cacheStore.has('key4')) {
    throw new Error('Key should be deleted');
  }
  
  cacheStore.clear();
  
  if (cacheStore.size() !== 0) {
    throw new Error('Cache should be empty after clear');
  }
});

// Test 6: RedisCache - Instantiation (without redis)
test('RedisCache - Instantiation error handling', () => {
  try {
    const redisCache = new RedisCache();
    // Should throw if redis not installed
    throw new Error('Should throw error if redis not installed');
  } catch (error) {
    if (!error.message.includes('Redis package not installed')) {
      throw error;
    }
    // Expected error
  }
});

// Test 7: CORS - Function exists
test('CORS - Function exists', () => {
  if (typeof cors !== 'function') {
    throw new Error('cors should be a function');
  }
});

// Test 8: Security - Function exists
test('Security - Function exists', () => {
  if (typeof security !== 'function') {
    throw new Error('security should be a function');
  }
});

// Test 9: Compression - Function exists
test('Compression - Function exists', () => {
  if (typeof compress !== 'function') {
    throw new Error('compress should be a function');
  }
});

// Test 10: HealthChecker - Instantiation
test('HealthChecker - Instantiation', () => {
  const checker = createHealthChecker();
  
  if (!checker) {
    throw new Error('HealthChecker not created');
  }
});

// Test 11: HealthChecker - Add and run checks
testAsync('HealthChecker - Add and run checks', async () => {
  const checker = createHealthChecker();
  
  checker.addCheck('test', async () => true);
  checker.addCheck('failing', async () => false);
  
  const status = await checker.runChecks();
  
  if (status.status !== 'unhealthy') {
    throw new Error('Should be unhealthy due to failing check');
  }
  
  if (!status.checks.test) {
    throw new Error('Test check should be present');
  }
});

// Test 12: HealthChecker - Remove check
test('HealthChecker - Remove check', () => {
  const checker = createHealthChecker();
  
  checker.addCheck('test', async () => true);
  checker.removeCheck('test');
  
  if (checker.checks.test) {
    throw new Error('Check should be removed');
  }
});

// Test 13: Graceful Shutdown - Function exists
test('Graceful Shutdown - Function exists', () => {
  if (typeof gracefulShutdown !== 'function') {
    throw new Error('gracefulShutdown should be a function');
  }
});

// Test 14: Cache Middleware - Function exists
test('Cache Middleware - Function exists', () => {
  if (typeof cache !== 'function') {
    throw new Error('cache should be a function');
  }
});

// Test 15: Module Exports
test('Module exports - All v5 features exported', () => {
  const navis = require('../src/index');
  
  if (!navis.Cache) {
    throw new Error('Cache not exported');
  }
  if (!navis.RedisCache) {
    throw new Error('RedisCache not exported');
  }
  if (!navis.cache) {
    throw new Error('cache middleware not exported');
  }
  if (!navis.cors) {
    throw new Error('cors not exported');
  }
  if (!navis.security) {
    throw new Error('security not exported');
  }
  if (!navis.compress) {
    throw new Error('compress not exported');
  }
  if (!navis.HealthChecker) {
    throw new Error('HealthChecker not exported');
  }
  if (!navis.gracefulShutdown) {
    throw new Error('gracefulShutdown not exported');
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
    console.log('\n🎉 All v5 features verified successfully!');
    console.log('\n💡 Note: RedisCache requires redis package: npm install redis');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

runTests().catch(console.error);

