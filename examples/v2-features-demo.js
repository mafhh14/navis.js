/**
 * Navis.js v2 Features Demo
 * Demonstrates retry logic, circuit breaker, service config, and service discovery
 */

const {
  ServiceClient,
  ServiceConfig,
  ServiceDiscovery,
  retry,
} = require('../src/index');

// Example 1: ServiceClient with retry and circuit breaker
async function demoServiceClient() {
  console.log('\n=== ServiceClient with Retry & Circuit Breaker ===\n');

  const client = new ServiceClient('http://localhost:3000', {
    timeout: 3000,
    maxRetries: 3,
    retryBaseDelay: 1000,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 10000,
    },
  });

  try {
    const response = await client.get('/health');
    console.log('✅ Request successful:', response.data);
  } catch (error) {
    if (error.circuitBreakerOpen) {
      console.log('❌ Circuit breaker is OPEN:', error.message);
      console.log('Circuit state:', error.circuitState);
    } else {
      console.log('❌ Request failed:', error.message);
    }
  }

  // Check circuit breaker state
  const state = client.getCircuitBreakerState();
  if (state) {
    console.log('Circuit breaker state:', state);
  }
}

// Example 2: Service Configuration
async function demoServiceConfig() {
  console.log('\n=== Service Configuration ===\n');

  const config = new ServiceConfig({
    defaultOptions: {
      timeout: 5000,
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000,
      },
    },
  });

  // Register services
  config.register('userService', 'http://localhost:3001', {
    timeout: 3000,
  });

  config.register('orderService', 'http://localhost:3002', {
    retry: {
      maxRetries: 5,
    },
  });

  console.log('Registered services:', Object.keys(config.getAll()));

  // Get service config
  const userServiceConfig = config.get('userService');
  console.log('User service config:', userServiceConfig);
}

// Example 3: Service Discovery
async function demoServiceDiscovery() {
  console.log('\n=== Service Discovery ===\n');

  const discovery = new ServiceDiscovery({
    healthCheckInterval: 10000,
    healthCheckPath: '/health',
  });

  // Register service with multiple endpoints
  discovery.register('api', [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ]);

  // Get next available service (round-robin)
  const url1 = discovery.getNext('api');
  console.log('Next service URL:', url1);

  const url2 = discovery.getNext('api');
  console.log('Next service URL:', url2);

  // Get all healthy services
  const healthy = discovery.getHealthy('api');
  console.log('Healthy services:', healthy);
}

// Example 4: Using retry utility directly
async function demoRetryUtility() {
  console.log('\n=== Retry Utility ===\n');

  let attemptCount = 0;

  const flakyFunction = async () => {
    attemptCount++;
    console.log(`Attempt ${attemptCount}...`);
    
    if (attemptCount < 3) {
      throw new Error('Temporary failure');
    }
    
    return { success: true, attempt: attemptCount };
  };

  try {
    const result = await retry(flakyFunction, {
      maxRetries: 3,
      baseDelay: 500,
    });
    console.log('✅ Success after retries:', result);
  } catch (error) {
    console.log('❌ Failed after all retries:', error.message);
  }
}

// Example 5: ServiceClient with additional HTTP methods
async function demoHttpMethods() {
  console.log('\n=== Additional HTTP Methods ===\n');

  const client = new ServiceClient('http://localhost:3000', {
    retry: false, // Disable retry for demo
  });

  try {
    // PUT request
    const putResponse = await client.put('/api/users/1', { name: 'John' });
    console.log('PUT response:', putResponse.data);

    // DELETE request
    const deleteResponse = await client.delete('/api/users/1');
    console.log('DELETE response:', deleteResponse.data);

    // PATCH request
    const patchResponse = await client.patch('/api/users/1', { name: 'Jane' });
    console.log('PATCH response:', patchResponse.data);
  } catch (error) {
    console.log('Request failed (expected if server not running):', error.message);
  }
}

// Run all demos
async function runDemos() {
  console.log('🚀 Navis.js v2 Features Demo\n');
  console.log('='.repeat(50));

  await demoServiceConfig();
  await demoServiceDiscovery();
  await demoRetryUtility();
  await demoHttpMethods();
  
  // ServiceClient demo requires a running server
  console.log('\n💡 Note: ServiceClient demo requires a running server on port 3000');
  console.log('   Run: node examples/server.js');
}

// Run if called directly
if (require.main === module) {
  runDemos().catch(console.error);
}

module.exports = {
  demoServiceClient,
  demoServiceConfig,
  demoServiceDiscovery,
  demoRetryUtility,
  demoHttpMethods,
};

