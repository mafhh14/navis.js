const { NavisApp, response } = require('navis.js');

const app = new NavisApp();

// Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  response.success(res, { 
    service: 'my-service',
    message: 'Welcome to my-service service',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  response.success(res, { status: 'ok', service: 'my-service' });
});

// Add your routes here
// app.get('/api/users', (req, res) => { ... });
// app.post('/api/users', (req, res) => { ... });

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`my-service service running on http://localhost:${PORT}`);
});

module.exports = app;
