#!/usr/bin/env node

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
  // TODO v2: Implement navis generate service
  console.log('Generator commands coming in v2');
} else {
  console.log('Navis.js CLI');
  console.log('');
  console.log('Usage:');
  console.log('  navis start        Start the example server');
  console.log('');
  console.log('v2 commands:');
  console.log('  navis generate     Generate service boilerplate');
}