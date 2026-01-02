const { NavisApp, response } = require('../src/index');

const app = new NavisApp();

// Middleware example
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  response.success(res, { message: 'Welcome to Navis.js!' });
});

app.get('/health', (req, res) => {
  response.success(res, { status: 'ok' });
});

app.post('/echo', (req, res) => {
  // In Node.js, we need to parse body manually (v1 simplicity)
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  req.on('end', () => {
    const data = body ? JSON.parse(body) : {};
    response.success(res, { echo: data });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Example server running on http://localhost:${PORT}`);
});