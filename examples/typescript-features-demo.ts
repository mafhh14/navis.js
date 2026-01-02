/**
 * Navis.js TypeScript Features Demo
 * Demonstrates TypeScript usage with all v5.3 features
 */

import {
  NavisApp,
  response,
  ServiceClient,
  Cache,
  cache,
  cors,
  security,
  compress,
  createHealthChecker,
  gracefulShutdown,
  swagger,
  createVersionManager,
  headerVersioning,
  upload,
  testApp,
  WebSocketServer,
  sse,
  createPool,
  Logger,
  Metrics,
  validate,
  authenticateJWT,
  rateLimit,
  errorHandler,
} from 'navis.js';

const app = new NavisApp();

// ============================================
// TypeScript with CORS
// ============================================
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}));

// ============================================
// TypeScript with Security Headers
// ============================================
app.use(security({
  helmet: true,
  hsts: true,
  noSniff: true,
}));

// ============================================
// TypeScript with Compression
// ============================================
app.use(compress({
  level: 6,
  threshold: 1024,
}));

// ============================================
// TypeScript with Caching
// ============================================
const cacheStore = new Cache({
  maxSize: 1000,
  defaultTTL: 3600000,
});

app.get('/users/:id', cache({
  cacheStore,
  ttl: 1800,
  keyGenerator: (req) => `user:${req.params?.id}`,
}), (req, res) => {
  const userId = req.params?.id;
  response.success(res, {
    id: userId,
    name: 'John Doe',
    email: 'john@example.com',
  });
});

// ============================================
// TypeScript with Validation
// ============================================
app.post('/users', validate({
  body: {
    name: { type: 'string', required: true, minLength: 2 },
    email: { type: 'string', required: true, format: 'email' },
  },
}), (req, res) => {
  const { name, email } = req.body || {};
  response.success(res, {
    id: Math.random().toString(36).substr(2, 9),
    name,
    email,
  }, 201);
});

// ============================================
// TypeScript with Authentication
// ============================================
app.get('/protected', authenticateJWT({
  secret: process.env.JWT_SECRET || 'secret',
}), (req, res) => {
  response.success(res, {
    message: 'This is a protected route',
    user: (req as any).user,
  });
});

// ============================================
// TypeScript with Rate Limiting
// ============================================
app.post('/api/endpoint', rateLimit({
  windowMs: 60000,
  max: 10,
}), (req, res) => {
  response.success(res, { message: 'Rate limited endpoint' });
});

// ============================================
// TypeScript with Observability
// ============================================
const logger = new Logger({ level: 'INFO' });
const metrics = new Metrics();

app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    path: req.path,
  });
  metrics.increment('http_requests', 1, {
    method: req.method,
    path: req.path || '/',
  });
  next();
});

// ============================================
// TypeScript with Service Client
// ============================================
const client = new ServiceClient('http://api.example.com', {
  timeout: 5000,
  maxRetries: 3,
});

app.get('/external', async (req, res) => {
  try {
    const result = await client.get('/data');
    response.success(res, result.body);
  } catch (error) {
    response.error(res, 'External service error', 502);
  }
});

// ============================================
// TypeScript with Health Checks
// ============================================
const healthChecker = createHealthChecker({
  checks: {
    cache: async () => cacheStore.size() >= 0,
    database: async () => true, // Mock check
  },
});

app.use(healthChecker.middleware());

// ============================================
// TypeScript with Swagger
// ============================================
const swaggerMiddleware = swagger({
  title: 'Navis.js TypeScript API',
  version: '5.3.0',
  description: 'API with full TypeScript support',
});

app.use(swaggerMiddleware.middleware);

// ============================================
// TypeScript with API Versioning
// ============================================
app.use(headerVersioning({
  header: 'X-API-Version',
  defaultVersion: 'v1',
}));

const versionManager = createVersionManager();
const v1 = versionManager.version('v1');
v1.get('/users/:id', (req, res) => {
  response.success(res, { version: 'v1', userId: req.params?.id });
});

// ============================================
// TypeScript with SSE
// ============================================
app.get('/events', sse(), (req, res) => {
  res.sse?.send({ message: 'Connected' }, 'connection');
  
  let count = 0;
  const interval = setInterval(() => {
    count++;
    res.sse?.send({ count, timestamp: new Date().toISOString() }, 'update');
    
    if (count >= 10) {
      clearInterval(interval);
      res.sse?.close();
    }
  }, 1000);
  
  (req as any).on('close', () => {
    clearInterval(interval);
  });
});

// ============================================
// TypeScript with Error Handling
// ============================================
app.use(errorHandler());

// ============================================
// Routes
// ============================================
app.get('/', (req, res) => {
  response.success(res, {
    message: 'Navis.js TypeScript Features Demo',
    version: '5.3.0',
    features: [
      'Full TypeScript support',
      'Type-safe API',
      'IntelliSense',
      'Type checking',
    ],
  });
});

// ============================================
// Start Server
// ============================================
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Navis.js TypeScript Demo Server`);
  console.log(`📡 Listening on http://localhost:${PORT}\n`);
  console.log('Available endpoints:');
  console.log('  GET  /');
  console.log('  GET  /users/:id (cached)');
  console.log('  POST /users (validated)');
  console.log('  GET  /protected (authenticated)');
  console.log('  GET  /events (SSE)');
  console.log('  GET  /swagger.json (OpenAPI)');
  console.log('  GET  /docs (Swagger UI)');
  console.log('  GET  /health/ready (health check)');
});

// ============================================
// Graceful Shutdown
// ============================================
gracefulShutdown(server, {
  timeout: 10000,
  onShutdown: async () => {
    console.log('Cleaning up...');
    cacheStore.destroy();
    console.log('Cleanup complete');
  },
});

