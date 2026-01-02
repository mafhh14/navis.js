/**
 * Verification Script for Navis.js v2 Features
 * Tests all new v2 functionality
 */

const {
  ServiceClient,
  ServiceConfig,
  ServiceDiscovery,
  CircuitBreaker,
  retry: retryUtil,
  NavisApp,
} = require('../src/index');

const { retry } = retryUtil;

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

console.log('🧪 Verifying Navis.js v2 Features\n');
console.log('='.repeat(60));

// Test 1: ServiceClient with retry configuration
test('ServiceClient - Retry configuration', () => {
  const client = new ServiceClient('http://localhost:3000', {
    maxRetries: 3,
    retryBaseDelay: 1000,
  });
  
  if (client.retryConfig.maxRetries !== 3) {
    throw new Error('Retry config not set correctly');
  }
  if (client.retryConfig.baseDelay !== 1000) {
    throw new Error('Retry base delay not set correctly');
  }
});

// Test 2: ServiceClient with circuit breaker
test('ServiceClient - Circuit breaker configuration', () => {
  const client = new ServiceClient('http://localhost:3000', {
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
    },
  });
  
  if (!client.circuitBreaker) {
    throw new Error('Circuit breaker not initialized');
  }
  if (client.circuitBreaker.failureThreshold !== 5) {
    throw new Error('Circuit breaker threshold not set correctly');
  }
});

// Test 3: Circuit breaker states
test('CircuitBreaker - State management', () => {
  const cb = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeout: 1000,
  });
  
  // Should start CLOSED
  if (cb.state !== 'CLOSED') {
    throw new Error('Circuit breaker should start CLOSED');
  }
  
  // Should allow attempts when CLOSED
  if (!cb.canAttempt()) {
    throw new Error('Should allow attempts when CLOSED');
  }
  
  // Record failures to open circuit
  cb.recordFailure();
  cb.recordFailure();
  
  if (cb.state !== 'OPEN') {
    throw new Error('Circuit breaker should be OPEN after threshold failures');
  }
  
  // Should not allow attempts when OPEN
  if (cb.canAttempt()) {
    throw new Error('Should not allow attempts when OPEN');
  }
});

// Test 4: Retry utility
testAsync('Retry utility - Exponential backoff', async () => {
  let attempts = 0;
  const fn = async () => {
    attempts++;
    if (attempts < 3) {
      throw new Error('Temporary failure');
    }
    return { success: true };
  };
  
  const result = await retry(fn, {
    maxRetries: 3,
    baseDelay: 100,
  });
  
  if (attempts !== 3) {
    throw new Error(`Expected 3 attempts, got ${attempts}`);
  }
  if (!result.success) {
    throw new Error('Retry should succeed after 3 attempts');
  }
});

// Test 5: ServiceClient HTTP methods
test('ServiceClient - HTTP methods exist', () => {
  const client = new ServiceClient('http://localhost:3000');
  
  if (typeof client.get !== 'function') {
    throw new Error('GET method missing');
  }
  if (typeof client.post !== 'function') {
    throw new Error('POST method missing');
  }
  if (typeof client.put !== 'function') {
    throw new Error('PUT method missing (v2)');
  }
  if (typeof client.delete !== 'function') {
    throw new Error('DELETE method missing (v2)');
  }
  if (typeof client.patch !== 'function') {
    throw new Error('PATCH method missing (v2)');
  }
});

// Test 6: ServiceConfig
test('ServiceConfig - Register and retrieve services', () => {
  const config = new ServiceConfig();
  
  config.register('userService', 'http://localhost:3001', {
    timeout: 3000,
  });
  
  const service = config.get('userService');
  if (!service) {
    throw new Error('Service not found');
  }
  if (service.baseUrl !== 'http://localhost:3001') {
    throw new Error('Service URL incorrect');
  }
  if (service.timeout !== 3000) {
    throw new Error('Service timeout not set correctly');
  }
});

// Test 7: ServiceConfig - Default options
test('ServiceConfig - Default options inheritance', () => {
  const config = new ServiceConfig({
    defaultOptions: {
      timeout: 5000,
      retry: { maxRetries: 3 },
    },
  });
  
  config.register('testService', 'http://localhost:3000');
  const service = config.get('testService');
  
  if (service.timeout !== 5000) {
    throw new Error('Default timeout not inherited');
  }
  if (service.retry.maxRetries !== 3) {
    throw new Error('Default retry config not inherited');
  }
});

// Test 8: ServiceDiscovery
test('ServiceDiscovery - Register and round-robin', () => {
  const discovery = new ServiceDiscovery();
  
  discovery.register('api', [
    'http://api1.example.com',
    'http://api2.example.com',
  ]);
  
  const url1 = discovery.getNext('api');
  const url2 = discovery.getNext('api');
  const url3 = discovery.getNext('api');
  
  if (url1 !== 'http://api1.example.com') {
    throw new Error('First URL should be api1');
  }
  if (url2 !== 'http://api2.example.com') {
    throw new Error('Second URL should be api2');
  }
  if (url3 !== 'http://api1.example.com') {
    throw new Error('Third URL should wrap to api1 (round-robin)');
  }
});

// Test 9: ServiceDiscovery - Health tracking
test('ServiceDiscovery - Health status', () => {
  const discovery = new ServiceDiscovery();
  
  discovery.register('api', ['http://api1.example.com']);
  
  discovery.markUnhealthy('api', 'http://api1.example.com');
  const healthy = discovery.getHealthy('api');
  
  // Should return empty if all unhealthy
  if (healthy.length !== 0) {
    throw new Error('Should return no healthy services');
  }
  
  discovery.markHealthy('api', 'http://api1.example.com');
  const healthy2 = discovery.getHealthy('api');
  
  if (healthy2.length !== 1) {
    throw new Error('Should return healthy service');
  }
});

// Test 10: Circuit breaker state methods
test('ServiceClient - Circuit breaker state methods', () => {
  const client = new ServiceClient('http://localhost:3000', {
    circuitBreaker: true,
  });
  
  const state = client.getCircuitBreakerState();
  if (!state) {
    throw new Error('Circuit breaker state should be available');
  }
  if (state.state !== 'CLOSED') {
    throw new Error('Circuit breaker should start CLOSED');
  }
  
  // Test reset
  client.resetCircuitBreaker();
  const stateAfterReset = client.getCircuitBreakerState();
  if (stateAfterReset.failureCount !== 0) {
    throw new Error('Circuit breaker should be reset');
  }
});

// Test 11: Exports verification
test('Module exports - All v2 features exported', () => {
  const navis = require('./src/index');
  
  if (!navis.ServiceClient) {
    throw new Error('ServiceClient not exported');
  }
  if (!navis.ServiceConfig) {
    throw new Error('ServiceConfig not exported (v2)');
  }
  if (!navis.ServiceDiscovery) {
    throw new Error('ServiceDiscovery not exported (v2)');
  }
  if (!navis.CircuitBreaker) {
    throw new Error('CircuitBreaker not exported (v2)');
  }
  if (!navis.retry || !navis.retry.retry) {
    throw new Error('Retry utility not exported (v2)');
  }
  if (!navis.NavisApp) {
    throw new Error('NavisApp not exported');
  }
});

// Test 12: CLI generator file exists
test('CLI Generator - Generator file exists', () => {
  const fs = require('fs');
  const path = require('path');
  
  const generatorPath = path.join(__dirname, 'bin', 'generators', 'service.js');
  if (!fs.existsSync(generatorPath)) {
    throw new Error('Service generator file not found');
  }
  
  const { generateService } = require(generatorPath);
  if (typeof generateService !== 'function') {
    throw new Error('generateService function not exported');
  }
});

// Run all tests
async function runTests() {
  await testAsync('Retry utility - Exponential backoff', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return { success: true };
    };
    
    const result = await retry(fn, {
      maxRetries: 3,
      baseDelay: 100,
    });
    
    if (attempts !== 3) {
      throw new Error(`Expected 3 attempts, got ${attempts}`);
    }
    if (!result.success) {
      throw new Error('Retry should succeed after 3 attempts');
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All v2 features verified successfully!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

runTests().catch(console.error);

