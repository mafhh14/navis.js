/**
 * Navis.js TypeScript Example - Node.js HTTP Server
 */

import { NavisApp, response } from 'navis.js';

const app = new NavisApp();

// Basic route with TypeScript types
app.get('/', (req, res) => {
  response.success(res, { 
    message: 'Hello from Navis.js with TypeScript!',
    version: '5.3.0'
  });
});

// Route with parameters
app.get('/users/:id', (req, res) => {
  const userId = req.params?.id;
  response.success(res, {
    userId,
    message: `User ${userId} found`
  });
});

// POST route with body validation
app.post('/users', (req, res) => {
  const { name, email } = req.body || {};
  
  if (!name || !email) {
    response.error(res, 'Name and email are required', 400);
    return;
  }
  
  response.success(res, {
    id: Math.random().toString(36).substr(2, 9),
    name,
    email
  }, 201);
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Navis.js TypeScript server running on http://localhost:${PORT}`);
});

