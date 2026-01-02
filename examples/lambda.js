const { NavisApp } = require('../src/index');

const app = new NavisApp();

// Middleware example
app.use((req, res, next) => {
  console.log(`Lambda: ${req.method} ${req.path}`);
  next();
});

// Routes
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

// Lambda handler
exports.handler = async (event) => {
  return await app.handleLambda(event);
};