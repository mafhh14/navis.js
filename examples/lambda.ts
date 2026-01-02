/**
 * Navis.js TypeScript Example - AWS Lambda Handler
 */

import { NavisApp } from 'navis.js';

const app = new NavisApp();

// Lambda route handlers
app.get('/hello', (req, res) => {
  res.statusCode = 200;
  res.body = {
    message: 'Hello from Lambda with TypeScript!',
    timestamp: new Date().toISOString()
  };
});

app.get('/users/:id', (req, res) => {
  const userId = req.params?.id;
  res.statusCode = 200;
  res.body = {
    userId,
    name: 'John Doe',
    email: 'john@example.com'
  };
});

// Export Lambda handler
export const handler = async (event: any) => {
  return await app.handleLambda(event);
};

