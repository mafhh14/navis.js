/**
 * Verification Script for v6.0
 * Route middleware, DynamoDB, alerting, gRPC
 */

const navis = require('../src/index.js');
const { executeMiddleware } = require('../src/core/middleware');
const { parseRouteHandlers } = require('../src/core/route-utils');

const {
  NavisApp,
  Metrics,
  createAlertManager,
  createGrpcServer,
  GrpcServer,
} = navis;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}:`, error.message);
    throw error;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}:`, error.message);
    throw error;
  }
}

console.log('='.repeat(60));
console.log('Verifying v6.0 Features');
console.log('='.repeat(60));

async function run() {
  test('Route utils - parse middleware + handler', () => {
    const { middlewares, handler } = parseRouteHandlers([
      () => {},
      () => {},
      (req, res) => {},
    ]);
    if (middlewares.length !== 2 || typeof handler !== 'function') {
      throw new Error('Route handler parsing failed');
    }
  });

  await asyncTest('Route middleware - per-route on Lambda', async () => {
    const app = new NavisApp();
    let middlewareRan = false;

    app.get('/secure', (req, res, next) => {
      middlewareRan = true;
      return next();
    }, async (req, res) => {
      res.body = { ok: true };
    });

    const response = await app.handleLambda({
      httpMethod: 'GET',
      path: '/secure',
      headers: {},
    });

    if (!middlewareRan) {
      throw new Error('Route middleware did not run');
    }

    const body = JSON.parse(response.body);
    if (!body.ok) {
      throw new Error('Route handler did not run');
    }
  });

  test('Metrics - getSnapshot for alerting', () => {
    const metrics = new Metrics();
    metrics.increment('http_errors', 3);
    metrics.gauge('cpu_usage', 91);

    const snapshot = metrics.getSnapshot();
    if (snapshot.counters.http_errors !== 3 || snapshot.gauges.cpu_usage !== 91) {
      throw new Error('Metrics snapshot failed');
    }
  });

  await asyncTest('AlertManager - rule evaluation', async () => {
    const alerts = [];
    const manager = createAlertManager();
    manager.addChannel(async (alert) => alerts.push(alert));
    manager.addRule({
      name: 'high-errors',
      metric: 'http_errors',
      condition: 'gte',
      threshold: 5,
      message: 'Too many errors',
    });

    const fired = await manager.evaluate({ counters: { http_errors: 10 } });
    if (fired.length !== 1 || alerts.length !== 1) {
      throw new Error('Alert rule did not fire');
    }
  });

  test('DynamoDB - type supported in createPool', () => {
    const pool = navis.createPool({ type: 'dynamodb' });
    if (!pool || pool.type !== 'dynamodb') {
      throw new Error('DynamoDB pool not created');
    }
  });

  test('gRPC - server instantiation', () => {
    const server = createGrpcServer({ port: 50052 });
    if (!server || typeof server.addService !== 'function') {
      throw new Error('GrpcServer not created');
    }
  });

  test('gRPC - unary handler wrapper', async () => {
    const wrapped = GrpcServer.unaryHandler(async (call) => ({ ok: true, input: call.request }));
    let callbackResult = null;
    await new Promise((resolve) => {
      wrapped({ request: { id: 1 } }, (err, result) => {
        callbackResult = { err, result };
        resolve();
      });
    });

    if (callbackResult.err || !callbackResult.result.ok) {
      throw new Error('Unary handler wrapper failed');
    }
  });

  test('Module exports - v6.0', () => {
    const required = [
      'createAlertManager',
      'AlertManager',
      'createGrpcServer',
      'GrpcServer',
      'createGrpcClient',
    ];

    for (const name of required) {
      if (!navis[name]) {
        throw new Error(`${name} not exported`);
      }
    }
  });

  test('Package version - 6.0.0', () => {
    const pkg = require('../package.json');
    if (pkg.version !== '6.0.0') {
      throw new Error(`Expected version 6.0.0, got ${pkg.version}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ All v6.0 tests passed!');
  console.log('='.repeat(60));
}

run().catch(() => process.exit(1));
