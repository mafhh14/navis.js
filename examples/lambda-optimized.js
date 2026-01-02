/**
 * Optimized Lambda Handler Example
 * v3.1: Best practices for reducing cold start time
 */

const { NavisApp, response, getPool } = require('../src/index');
const LambdaHandler = require('../src/core/lambda-handler');
const { coldStartTracker } = require('../src/middleware/cold-start-tracker');

// ============================================
// CRITICAL: Initialize app OUTSIDE handler
// This ensures the app is reused across invocations
// ============================================
const app = new NavisApp();

// Add cold start tracking middleware
app.use(coldStartTracker);

// ============================================
// Register routes at MODULE LEVEL (not in handler)
// This runs once per container, not per invocation
// ============================================
app.get('/', (req, res) => {
  res.statusCode = 200;
  res.body = { 
    message: 'Welcome to Navis.js Lambda (Optimized)!',
    optimized: true,
  };
});

app.get('/health', (req, res) => {
  res.statusCode = 200;
  res.body = { status: 'ok' };
});

app.get('/warmup', (req, res) => {
  res.statusCode = 200;
  res.body = { status: 'warmed' };
});

// Example: Using ServiceClient with connection pooling
app.get('/external', async (req, res) => {
  try {
    // Get client from pool (reuses connections)
    const client = getPool().get('http://api.example.com', {
      timeout: 3000,
      maxRetries: 2,
    });
    
    const result = await client.get('/data');
    res.statusCode = 200;
    res.body = { data: result.data };
  } catch (error) {
    res.statusCode = 500;
    res.body = { error: error.message };
  }
});

// ============================================
// OPTIMIZED HANDLER
// ============================================

// Create handler instance (reused across invocations)
const handler = new LambdaHandler(app, {
  enableMetrics: true,
  warmupPath: '/warmup',
});

// Cache the handler function (V8 optimization)
let cachedHandler = null;

/**
 * Lambda handler - optimized for cold starts
 * @param {Object} event - Lambda event
 * @param {Object} context - Lambda context
 */
exports.handler = async (event, context) => {
  // Reuse handler function (V8 JIT optimization)
  if (!cachedHandler) {
    cachedHandler = async (event, context) => {
      return await handler.handle(event, context);
    };
  }
  
  return await cachedHandler(event, context);
};

/**
 * Optional: Pre-warm function
 * Can be called during container initialization
 */
exports.preWarm = async () => {
  // Pre-initialize any heavy operations
  // This runs once per container
  console.log('Pre-warming Lambda container...');
  
  // Example: Pre-initialize service clients
  const pool = getPool();
  pool.get('http://api.example.com', { timeout: 3000 });
  
  console.log('Pre-warming complete');
};

