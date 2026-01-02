/**
 * Navis.js CLI
 * v1: Basic start command
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const command = process.argv[2];

if (command === 'start') {
  // Check if examples/server.js exists
  const serverPath = path.join(__dirname, '..', 'examples', 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.error('Error: examples/server.js not found');
    process.exit(1);
  }

  // Run the server
  const server = spawn('node', [serverPath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  server.on('error', (err) => {
    console.error('Error starting server:', err);
    process.exit(1);
  });

  server.on('exit', (code) => {
    process.exit(code);
  });
} else if (command === 'generate') {
  const subcommand = process.argv[3];
  
  if (subcommand === 'service') {
    const serviceName = process.argv[4];
    
    if (!serviceName) {
      console.error('Error: Service name is required');
      console.log('Usage: navis generate service <service-name>');
      process.exit(1);
    }
    
    const { generateService } = require('./generators/service');
    generateService(serviceName);
  } else {
    console.log('Generator commands:');
    console.log('  navis generate service <name>    Generate a new microservice');
    console.log('');
    console.log('Example:');
    console.log('  navis generate service user-service');
  }
} else {
  console.log('Navis.js CLI');
  console.log('');
  console.log('Usage:');
  console.log('  navis start        Start the example server');
  console.log('');
  console.log('v2 commands:');
  console.log('  navis generate     Generate service boilerplate');
}