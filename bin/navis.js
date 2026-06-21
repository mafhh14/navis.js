/**
 * Navis.js CLI
 * v7.0: Deploy command for AWS Lambda
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const command = process.argv[2];
const isHelp = !command || command === 'help' || command === '--help' || command === '-h';

function printHelp() {
  console.log('Navis.js CLI v7.0');
  console.log('');
  console.log('Usage: navis <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  start                          Start the example HTTP server');
  console.log('  generate service <name>        Scaffold a new microservice');
  console.log('  test                           Run verification test suites');
  console.log('  metrics                        Show Prometheus metrics setup help');
  console.log('  deploy lambda [options]        Deploy to AWS Lambda');
  console.log('  help                           Show this help message');
  console.log('');
  console.log('Deploy options:');
  console.log('  --generate-only                Create template.yaml and DEPLOY.md');
  console.log('  --zip-only                     Package deployment.zip');
  console.log('  --guided                       Run sam deploy --guided');
  console.log('  --dir <path>                   Service directory (default: cwd)');
  console.log('  --entry <file>                 Lambda entry (default: lambda.js)');
  console.log('  --stack <name>                 CloudFormation stack name');
  console.log('');
  console.log('Examples:');
  console.log('  navis generate service user-api');
  console.log('  navis deploy lambda --generate-only');
  console.log('  navis deploy lambda --zip-only');
  console.log('  navis deploy lambda --guided');
  console.log('');
  console.log('Documentation: https://github.com/mafhh14/navis.js#cli-reference--help');
}

if (isHelp) {
  printHelp();
  process.exit(0);
}

if (command === 'start') {
  const serverPath = path.join(__dirname, '..', 'examples', 'server.js');

  if (!fs.existsSync(serverPath)) {
    console.error('Error: examples/server.js not found');
    process.exit(1);
  }

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
  const target = process.argv[3] || 'lambda';
  const { deployLambda, generateDeployConfig, packageLambda } = require('./deploy/lambda');

  const args = process.argv.slice(4);
  const options = { dir: process.cwd() };

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--dir' && args[i + 1]) {
      options.dir = path.resolve(args[i + 1]);
      i += 1;
    } else if (args[i] === '--entry' && args[i + 1]) {
      options.entry = args[i + 1];
      i += 1;
    } else if (args[i] === '--stack' && args[i + 1]) {
      options.stackName = args[i + 1];
      i += 1;
    } else if (args[i] === '--zip-only') {
      options.zipOnly = true;
    } else if (args[i] === '--guided') {
      options.guided = true;
    } else if (args[i] === '--generate-only') {
      options.generateOnly = true;
    }
  }

  try {
    if (target === 'lambda') {
      if (options.generateOnly) {
        const config = generateDeployConfig(options.dir, options);
        console.log('✅ Deploy config generated:');
        console.log(`   ${config.templatePath}`);
        console.log(`   ${config.deployDocPath}`);
      } else if (options.zipOnly) {
        generateDeployConfig(options.dir, options);
        const zipPath = packageLambda(options.dir, options);
        console.log(`✅ Lambda package: ${zipPath}`);
      } else {
        deployLambda(options);
      }
    } else {
      console.error(`Unknown deploy target: ${target}`);
      console.log('Usage: navis deploy lambda [--dir <path>] [--zip-only] [--guided] [--generate-only]');
      process.exit(1);
    }
  } catch (error) {
    console.error('Deploy failed:', error.message);
    process.exit(1);
  }
} else if (command === 'test') {
  const testPath = path.join(__dirname, '..', 'scripts', 'run-tests.js');

  if (fs.existsSync(testPath)) {
    const test = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    test.on('exit', (code) => {
      process.exit(code);
    });
  } else {
    console.log('No test runner found');
    process.exit(1);
  }
} else if (command === 'metrics') {
  console.log('Metrics endpoint:');
  console.log('  Add /metrics route to your app to expose Prometheus metrics');
  console.log('');
  console.log('Example:');
  console.log('  app.get("/metrics", (req, res) => {');
  console.log('    res.setHeader("Content-Type", "text/plain");');
  console.log('    res.end(metrics.toPrometheus());');
  console.log('  });');
} else {
  console.error(`Unknown command: ${command}`);
  console.log('');
  printHelp();
  process.exit(1);
}
