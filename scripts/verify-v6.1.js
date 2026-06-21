/**
 * Verification Script for v6.1
 * Lambda response helpers, proto loading, polish
 */

const path = require('path');
const navis = require('../src/index.js');
const { success, error, isNavisLambdaRes } = require('../src/utils/response');

const {
  NavisApp,
  loadProto,
  loadProtoService,
} = navis;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}:`, err.message);
    throw err;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}:`, err.message);
    throw err;
  }
}

console.log('='.repeat(60));
console.log('Verifying v6.1 Features');
console.log('='.repeat(60));

async function run() {
  test('Response - isNavisLambdaRes detection', () => {
    const lambdaRes = { statusCode: 200, headers: {}, body: null, _navisLambda: true };
    const httpRes = { writeHead: () => {}, end: () => {} };
    if (!isNavisLambdaRes(lambdaRes) || isNavisLambdaRes(httpRes)) {
      throw new Error('Lambda res detection failed');
    }
  });

  test('Response - isNavisLambdaRes with middleware wrappers', () => {
    const lambdaRes = {
      statusCode: 200,
      headers: {},
      body: null,
      _navisLambda: true,
      end: () => {},
      finish: async () => {},
    };
    if (!isNavisLambdaRes(lambdaRes)) {
      throw new Error('Lambda res should be detected even with end/finish wrappers');
    }
  });

  test('Response - success() on Navis Lambda res', () => {
    const res = { statusCode: 200, headers: {}, body: null, _navisLambda: true };
    success(res, { ok: true });
    if (res.statusCode !== 200 || !res.body.ok) {
      throw new Error('success() did not set Lambda res body');
    }
  });

  test('Response - error() on Navis Lambda res', () => {
    const res = { statusCode: 200, headers: {}, body: null, _navisLambda: true };
    error(res, 'bad request', 400);
    if (res.statusCode !== 400 || res.body.error !== 'bad request') {
      throw new Error('error() did not set Lambda res correctly');
    }
  });

  await asyncTest('Response - success() in Lambda handler via handleLambda', async () => {
    const app = new NavisApp();
    app.get('/hello', (req, res) => {
      success(res, { message: 'Hello Lambda' });
    });

    const response = await app.handleLambda({
      httpMethod: 'GET',
      path: '/hello',
      headers: {},
    });

    const body = JSON.parse(response.body);
    if (body.message !== 'Hello Lambda') {
      throw new Error('handleLambda did not return success() body');
    }
  });

  test('Proto loader - module exports', () => {
    if (typeof loadProto !== 'function' || typeof loadProtoService !== 'function') {
      throw new Error('Proto loader not exported');
    }
  });

  test('Proto loader - helpful error without deps', () => {
    let grpc;
    try {
      grpc = require('@grpc/grpc-js');
    } catch (e) {
      grpc = null;
    }

    if (!grpc) {
      try {
        loadProto('missing.proto');
        throw new Error('Expected loadProto to throw');
      } catch (err) {
        if (!err.message.includes('@grpc/grpc-js')) {
          throw new Error(`Unexpected error: ${err.message}`);
        }
      }
    }
  });

  test('Proto loader - load hello service when deps available', () => {
    let grpc;
    try {
      grpc = require('@grpc/grpc-js');
      require('@grpc/proto-loader');
    } catch (e) {
      grpc = null;
    }

    if (!grpc) {
      console.log('   (skipped — install @grpc/grpc-js @grpc/proto-loader for live proto test)');
      return;
    }

    const protoPath = path.join(__dirname, '..', 'examples', 'proto', 'hello.proto');
    const service = loadProtoService(protoPath, 'hello.HelloService', {
      includeDirs: [path.join(__dirname, '..', 'examples', 'proto')],
    });
    if (!service || !service.service) {
      throw new Error('HelloService not loaded from proto');
    }
  });

  test('Package version - 6.x+', () => {
    const pkg = require('../package.json');
    const major = Number(pkg.version.split('.')[0]);
    if (major < 6) {
      throw new Error(`Expected version 6.x+, got ${pkg.version}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ All v6.1 tests passed!');
  console.log('='.repeat(60));
}

run().then(() => process.exit(0)).catch(() => process.exit(1));
