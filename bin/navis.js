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
} else if (command === 'deploy') {
  // v3: Deploy command (placeholder for future deployment features)
  console.log('Deploy command - Coming soon');
  console.log('This will support deployment to AWS Lambda, Docker, etc.');
} else if (command === 'test') {
  // v3: Test command
  const { spawn } = require('child_process');
  const testPath = path.join(__dirname, '..', 'verify-v2.js');
  
  if (fs.existsSync(testPath)) {
    const test = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    
    test.on('exit', (code) => {
      process.exit(code);
    });
  } else {
    console.log('No test file found');
  }
} else if (command === 'metrics') {
  // v3: Show metrics endpoint
  console.log('Metrics endpoint:');
  console.log('  Add /metrics route to your app to expose Prometheus metrics');
  console.log('');
  console.log('Example:');
  console.log('  app.get("/metrics", (req, res) => {');
  console.log('    res.setHeader("Content-Type", "text/plain");');
  console.log('    res.end(metrics.toPrometheus());');
  console.log('  });');
} else {
  console.log('Navis.js CLI');
  console.log('');
  console.log('Usage:');
  console.log('  navis start        Start the example server');
  console.log('');
  console.log('v2 commands:');
  console.log('  navis generate     Generate service boilerplate');
  console.log('');
  console.log('v3 commands:');
  console.log('  navis test         Run verification tests');
  console.log('  navis metrics      Show metrics endpoint info');
  console.log('  navis deploy       Deploy service (coming soon)');
}