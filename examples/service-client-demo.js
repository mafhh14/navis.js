const { ServiceClient } = require('../src/index');

// Example: Call another microservice
async function demo() {
  const client = new ServiceClient('http://localhost:3000', {
    timeout: 3000,
  });

  try {
    // GET request
    const healthCheck = await client.get('/health');
    console.log('Health check:', healthCheck);

    // POST request
    const echo = await client.post('/echo', { message: 'Hello from ServiceClient!' });
    console.log('Echo:', echo);
  } catch (err) {
    console.error('Service call failed:', err.message);
  }
}

// Run demo if called directly
if (require.main === module) {
  demo();
}

module.exports = { demo };