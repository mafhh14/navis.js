/**
 * Service Generator
 * v2: Generate service boilerplate
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate service boilerplate
 * @param {string} serviceName - Name of the service
 * @param {string} targetDir - Target directory (default: current directory)
 */
function generateService(serviceName, targetDir = process.cwd()) {
  const serviceDir = path.join(targetDir, serviceName);
  
  // Create service directory
  if (!fs.existsSync(serviceDir)) {
    fs.mkdirSync(serviceDir, { recursive: true });
  }

  // Generate service.js
  const serviceTemplate = `const { NavisApp, response } = require('navis.js');

const app = new NavisApp();

// Middleware
app.use((req, res, next) => {
  console.log(\`\${req.method} \${req.url}\`);
  next();
});

// Routes
app.get('/', (req, res) => {
  response.success(res, { 
    service: '${serviceName}',
    message: 'Welcome to ${serviceName} service',
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  response.success(res, { status: 'ok', service: '${serviceName}' });
});

// Add your routes here
// app.get('/api/users', (req, res) => { ... });
// app.post('/api/users', (req, res) => { ... });

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`${serviceName} service running on http://localhost:\${PORT}\`);
});

module.exports = app;
`;

  fs.writeFileSync(path.join(serviceDir, 'service.js'), serviceTemplate);

  // Generate lambda.js
  const lambdaTemplate = `const { NavisApp } = require('navis.js');

const app = new NavisApp();

// Middleware
app.use((req, res, next) => {
  console.log(\`Lambda: \${req.method} \${req.path}\`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.statusCode = 200;
  res.body = { 
    service: '${serviceName}',
    message: 'Welcome to ${serviceName} service (Lambda)',
    version: '1.0.0'
  };
});

app.get('/health', (req, res) => {
  res.statusCode = 200;
  res.body = { status: 'ok', service: '${serviceName}' };
});

// Lambda handler
exports.handler = async (event) => {
  return await app.handleLambda(event);
};
`;

  fs.writeFileSync(path.join(serviceDir, 'lambda.js'), lambdaTemplate);

  // Generate package.json
  const packageJson = {
    name: serviceName,
    version: '1.0.0',
    description: `${serviceName} microservice`,
    main: 'service.js',
    scripts: {
      start: 'node service.js',
      'start:lambda': 'node lambda.js',
    },
    dependencies: {
      'navis.js': '^1.0.0',
    },
  };

  fs.writeFileSync(
    path.join(serviceDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Generate README.md
  const readmeTemplate = `# ${serviceName}

Microservice generated with Navis.js

## Installation

\`\`\`bash
npm install
\`\`\`

## Running

### Local Development

\`\`\`bash
npm start
# or
node service.js
\`\`\`

### AWS Lambda

Deploy \`lambda.js\` to AWS Lambda and configure API Gateway.

## API Endpoints

- \`GET /\` - Service information
- \`GET /health\` - Health check

## Development

Add your routes in \`service.js\`:

\`\`\`javascript
app.get('/api/users', (req, res) => {
  // Your route handler
});
\`\`\`
`;

  fs.writeFileSync(path.join(serviceDir, 'README.md'), readmeTemplate);

  console.log(`✅ Service "${serviceName}" generated successfully!`);
  console.log(`📁 Location: ${serviceDir}`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${serviceName}`);
  console.log(`  npm install`);
  console.log(`  npm start`);
}

module.exports = { generateService };

