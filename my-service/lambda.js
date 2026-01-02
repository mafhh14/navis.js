const { NavisApp } = require('navis.js');

const app = new NavisApp();

// Middleware
app.use((req, res, next) => {
  console.log(`Lambda: ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.statusCode = 200;
  res.body = { 
    service: 'my-service',
    message: 'Welcome to my-service service (Lambda)',
    version: '1.0.0'
  };
});

app.get('/health', (req, res) => {
  res.statusCode = 200;
  res.body = { status: 'ok', service: 'my-service' };
});

// Lambda handler
exports.handler = async (event) => {
  return await app.handleLambda(event);
};
