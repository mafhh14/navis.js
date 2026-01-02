/**
 * Navis.js v5 Features Demo
 * Demonstrates caching, CORS, security, compression, health checks, and graceful shutdown
 */

const {
  NavisApp,
  response,
  Cache,
  cache,
  cors,
  security,
  compress,
  createHealthChecker,
  gracefulShutdown,
} = require('../src/index');

const app = new NavisApp();

// ============================================
// CORS Middleware
// ============================================
app.use(cors({
  origin: ['http://localhost:3000', 'https://example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// ============================================
// Security Headers
// ============================================
app.use(security({
  helmet: true,
  hsts: true,
  noSniff: true,
  xssFilter: true,
  frameOptions: 'DENY',
  referrerPolicy: 'no-referrer',
}));

// ============================================
// Response Compression
// ============================================
app.use(compress({
  level: 6,
  threshold: 1024,
  algorithm: 'gzip',
}));

// ============================================
// Caching
// ============================================
const cacheStore = new Cache({
  maxSize: 1000,
  defaultTTL: 3600000, // 1 hour
});

// Cached route
app.get('/users/:id', cache({
  cacheStore,
  ttl: 1800, // 30 minutes
  keyGenerator: (req) => `user:${req.params.id}`,
}), (req, res) => {
  // Simulate database query
  const user = {
    id: req.params.id,
    name: 'John Doe',
    email: 'john@example.com',
  };
  
  response.success(res, user);
});

// Non-cached route
app.get('/users/:id/posts', (req, res) => {
  response.success(res, {
    userId: req.params.id,
    posts: [],
  });
});

// ============================================
// Health Checks
// ============================================
const healthChecker = createHealthChecker({
  livenessPath: '/health/live',
  readinessPath: '/health/ready',
  checks: {
    database: async () => {
      // Simulate database check
      return true;
    },
    cache: async () => {
      // Check cache
      return cacheStore.size() >= 0;
    },
  },
});

app.use(healthChecker.middleware());

// ============================================
// Routes
// ============================================
app.get('/', (req, res) => {
  response.success(res, {
    message: 'Navis.js v5 Features Demo',
    features: [
      'Caching',
      'CORS',
      'Security Headers',
      'Compression',
      'Health Checks',
      'Graceful Shutdown',
    ],
  });
});

app.get('/cache-stats', (req, res) => {
  response.success(res, {
    size: cacheStore.size(),
    keys: cacheStore.keys().slice(0, 10), // First 10 keys
  });
});

app.post('/cache/clear', (req, res) => {
  cacheStore.clear();
  response.success(res, { message: 'Cache cleared' });
});

// ============================================
// Start Server
// ============================================
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Navis.js v5 Features Demo Server`);
  console.log(`📡 Listening on http://localhost:${PORT}\n`);
  console.log('Available endpoints:');
  console.log('  GET  /');
  console.log('  GET  /users/:id (cached)');
  console.log('  GET  /users/:id/posts');
  console.log('  GET  /health/live (liveness)');
  console.log('  GET  /health/ready (readiness)');
  console.log('  GET  /cache-stats');
  console.log('  POST /cache/clear');
  console.log('\n💡 Test with:');
  console.log('  curl http://localhost:3000/');
  console.log('  curl http://localhost:3000/users/123');
  console.log('  curl http://localhost:3000/health/ready');
});

// ============================================
// Graceful Shutdown
// ============================================
gracefulShutdown(server, {
  timeout: 10000,
  onShutdown: async () => {
    console.log('Cleaning up...');
    // Close database connections
    // Close cache connections
    cacheStore.destroy();
    console.log('Cleanup complete');
  },
});

module.exports = app;

