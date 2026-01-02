/**
 * Navis.js v5.1 Features Demo
 * Demonstrates OpenAPI/Swagger, API versioning, file upload, and testing utilities
 */

const {
  NavisApp,
  response,
  swagger,
  createVersionManager,
  headerVersioning,
  upload,
  testApp,
} = require('../src/index');

const app = new NavisApp();

// ============================================
// OpenAPI/Swagger Documentation
// ============================================
const swaggerMiddleware = swagger({
  title: 'Navis.js API',
  version: '5.1.0',
  description: 'API documentation for Navis.js',
  path: '/swagger.json',
  uiPath: '/docs',
  servers: [{ url: 'http://localhost:3000', description: 'Development server' }],
  tags: [
    { name: 'users', description: 'User operations' },
    { name: 'posts', description: 'Post operations' },
  ],
});

app.use(swaggerMiddleware.middleware);

// Add routes to Swagger
swaggerMiddleware.generator.addRoute('GET', '/users/:id', {
  summary: 'Get user by ID',
  description: 'Retrieve a user by their ID',
  tags: ['users'],
  parameters: [
    {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
  ],
  responses: {
    '200': {
      description: 'User found',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
    },
    '404': { description: 'User not found' },
  },
});

// ============================================
// API Versioning
// ============================================
const versionManager = createVersionManager();

// Version 1
const v1 = versionManager.version('v1');
v1.get('/users/:id', (req, res) => {
  response.success(res, {
    version: 'v1',
    userId: req.params.id,
    format: 'legacy',
  });
});

// Version 2
const v2 = versionManager.version('v2');
v2.get('/users/:id', (req, res) => {
  response.success(res, {
    version: 'v2',
    userId: req.params.id,
    format: 'modern',
    metadata: { source: 'v2-api' },
  });
});

// Register versioned routes
v1.get('/users/:id', (req, res) => {
  response.success(res, { version: 'v1', userId: req.params.id });
});
v2.get('/users/:id', (req, res) => {
  response.success(res, { version: 'v2', userId: req.params.id });
});

// Apply versioned routes to app
for (const version of versionManager.getVersions()) {
  const routes = versionManager.getRoutes(version);
  for (const method in routes) {
    for (const route of routes[method]) {
      app[method.toLowerCase()](route.path, route.handler);
    }
  }
}

// Header-based versioning
app.use(headerVersioning({
  header: 'X-API-Version',
  defaultVersion: 'v1',
}));

// ============================================
// File Upload
// ============================================
app.post('/upload', upload({
  dest: './uploads',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5,
  },
  fileFilter: (file) => {
    // Allow images and PDFs
    return file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
  },
}), (req, res) => {
  response.success(res, {
    message: 'Files uploaded',
    files: req.files || [],
    fields: req.body,
  });
});

// ============================================
// Routes
// ============================================
app.get('/', (req, res) => {
  response.success(res, {
    message: 'Navis.js v5.1 Features Demo',
    features: [
      'OpenAPI/Swagger Documentation',
      'API Versioning',
      'File Upload',
      'Testing Utilities',
    ],
    endpoints: {
      swagger: '/swagger.json',
      docs: '/docs',
      v1: '/v1/users/:id',
      v2: '/v2/users/:id',
      upload: 'POST /upload',
    },
  });
});

app.get('/users/:id', (req, res) => {
  response.success(res, {
    userId: req.params.id,
    version: req.apiVersion || 'default',
  });
});

// ============================================
// Start Server
// ============================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Navis.js v5.1 Features Demo Server`);
  console.log(`📡 Listening on http://localhost:${PORT}\n`);
  console.log('Available endpoints:');
  console.log('  GET  /');
  console.log('  GET  /swagger.json (OpenAPI spec)');
  console.log('  GET  /docs (Swagger UI)');
  console.log('  GET  /v1/users/:id (API v1)');
  console.log('  GET  /v2/users/:id (API v2)');
  console.log('  GET  /users/:id (with X-API-Version header)');
  console.log('  POST /upload (file upload)');
  console.log('\n💡 Test with:');
  console.log('  curl http://localhost:3000/');
  console.log('  curl http://localhost:3000/v1/users/123');
  console.log('  curl http://localhost:3000/v2/users/123');
  console.log('  curl -H "X-API-Version: v2" http://localhost:3000/users/123');
  console.log('  curl http://localhost:3000/swagger.json');
});

module.exports = app;

