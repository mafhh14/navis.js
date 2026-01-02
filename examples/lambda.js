const { NavisApp } = require('../src/index');

// Initialize app at module level (reused across invocations)
const app = new NavisApp();

// Middleware example
app.use((req, res, next) => {
  console.log(`Lambda: ${req.method} ${req.path}`);
  next();
});

// Routes registered at module level (not in handler)
app.get('/', (req, res) => {
  res.statusCode = 200;
  res.body = { message: 'Welcome to Navis.js Lambda!' };
});

app.get('/health', (req, res) => {
  res.statusCode = 200;
  res.body = { status: 'ok' };
});

app.post('/echo', (req, res) => {
  res.statusCode = 200;
  res.body = { echo: req.body };
});

// Lambda handler - optimized for reuse
exports.handler = async (event) => {
  return await app.handleLambda(event);
};