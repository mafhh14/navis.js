/**
 * Navis.js v5.2 Features Demo
 * Demonstrates WebSocket, Server-Sent Events, and database integration
 */

const {
  NavisApp,
  response,
  WebSocketServer,
  sse,
  createPool,
} = require('../src/index');

const app = new NavisApp();

// ============================================
// Server-Sent Events (SSE)
// ============================================
app.get('/events', sse(), (req, res) => {
  // Send initial event
  res.sse.send({ message: 'Connected to SSE stream' }, 'connection');

  // Send periodic updates
  let count = 0;
  const interval = setInterval(() => {
    count++;
    res.sse.send({
      timestamp: new Date().toISOString(),
      count,
      data: `Event ${count}`,
    }, 'update');

    // Close after 10 events
    if (count >= 10) {
      clearInterval(interval);
      res.sse.send({ message: 'Stream ended' }, 'close');
      setTimeout(() => res.sse.close(), 1000);
    }
  }, 1000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

// ============================================
// Database Integration (Example)
// ============================================
// Note: Requires database packages (pg, mysql2, or mongodb)
let dbPool = null;

// Initialize database pool (commented out - requires actual DB)
// dbPool = createPool({
//   type: 'postgres',
//   connectionString: process.env.DATABASE_URL,
// });

// Example route using database
app.get('/db-example', async (req, res) => {
  if (!dbPool) {
    response.success(res, {
      message: 'Database not configured',
      note: 'Set DATABASE_URL and install database package (pg, mysql2, or mongodb)',
    });
    return;
  }

  try {
    // Example query
    const result = await dbPool.query('SELECT NOW() as current_time');
    response.success(res, result);
  } catch (error) {
    response.error(res, error.message, 500);
  }
});

// ============================================
// Routes
// ============================================
app.get('/', (req, res) => {
  response.success(res, {
    message: 'Navis.js v5.2 Features Demo',
    features: [
      'WebSocket Support',
      'Server-Sent Events (SSE)',
      'Database Integration',
    ],
    endpoints: {
      sse: 'GET /events (SSE stream)',
      websocket: 'WS /ws (WebSocket)',
      db: 'GET /db-example',
    },
  });
});

// ============================================
// Start Server
// ============================================
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Navis.js v5.2 Features Demo Server`);
  console.log(`📡 Listening on http://localhost:${PORT}\n`);
  console.log('Available endpoints:');
  console.log('  GET  /');
  console.log('  GET  /events (SSE stream)');
  console.log('  WS   /ws (WebSocket)');
  console.log('  GET  /db-example');
  console.log('\n💡 Test with:');
  console.log('  curl http://localhost:3000/');
  console.log('  curl -N http://localhost:3000/events');
  console.log('  wscat -c ws://localhost:3000/ws');
});

// ============================================
// WebSocket Server
// ============================================
const wsServer = new WebSocketServer({
  path: '/ws',
});

wsServer.attach(server);

wsServer.onConnection((client) => {
  console.log(`WebSocket client connected: ${client.id}`);
  client.send({ type: 'welcome', message: 'Connected to WebSocket server' });
});

wsServer.on('*', (message, client) => {
  console.log(`Message from ${client.id}:`, message);
  
  // Echo message back
  client.send({
    type: 'echo',
    original: message,
    timestamp: new Date().toISOString(),
  });
});

wsServer.onDisconnection((client) => {
  console.log(`WebSocket client disconnected: ${client.id}`);
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  if (dbPool) {
    await dbPool.close();
  }
  process.exit(0);
});

module.exports = app;

