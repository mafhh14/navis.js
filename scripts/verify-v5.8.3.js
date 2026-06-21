/**
 * Verification Script for v5.8.3: Cache Middleware + AdvancedCache Compatibility
 */

const navis = require('../src/index.js');
const { executeMiddleware } = require('../src/core/middleware');

const { AdvancedCache, Cache, cache, NavisApp } = navis;

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
console.log('Verifying v5.8.3: Cache Middleware Compatibility');
console.log('='.repeat(60));

async function run() {
  await asyncTest('AdvancedCache - Accepts numeric TTL', async () => {
    const advancedCache = new AdvancedCache({ l1Cache: new Cache() });

    await advancedCache.set('numeric:ttl', { ok: true }, 5000);
    const value = await advancedCache.get('numeric:ttl');

    if (!value || value.ok !== true) {
      throw new Error('Numeric TTL set/get failed');
    }
  });

  await asyncTest('Cache middleware - Stores responses with AdvancedCache', async () => {
    const advancedCache = new AdvancedCache({ l1Cache: new Cache() });
    const middleware = cache({
      cacheStore: advancedCache,
      ttl: 60,
      keyGenerator: () => 'middleware:test',
    });

    const req = { method: 'GET', path: '/test', query: {} };
    const res = { statusCode: 200, headers: {}, body: null };

    let handlerCalled = false;
    const handler = async () => {
      handlerCalled = true;
      res.body = { cached: true };
    };

    await executeMiddleware([middleware], req, res, handler, true);

    if (!handlerCalled) {
      throw new Error('Handler should run on cache miss');
    }

    const cached = await advancedCache.get('middleware:test');
    if (!cached || cached.body?.cached !== true) {
      throw new Error('AdvancedCache did not receive cached response');
    }
  });

  await asyncTest('Cache middleware - Returns cached response on hit', async () => {
    const advancedCache = new AdvancedCache({ l1Cache: new Cache() });
    const middleware = cache({
      cacheStore: advancedCache,
      ttl: 60,
      keyGenerator: () => 'middleware:hit',
    });

    await advancedCache.set('middleware:hit', {
      statusCode: 200,
      body: { fromCache: true },
      headers: {},
    }, { ttl: 60000 });

    const req = { method: 'GET', path: '/test', query: {} };
    const res = { statusCode: 200, headers: {}, body: null };

    let handlerCalled = false;
    const handler = async () => {
      handlerCalled = true;
      res.body = { fromCache: false };
    };

    await executeMiddleware([middleware], req, res, handler, true);

    if (handlerCalled) {
      throw new Error('Handler should not run on cache hit');
    }

    if (!res.body || res.body.fromCache !== true) {
      throw new Error('Cached response body not returned');
    }

    if (res.headers['X-Cache'] !== 'HIT') {
      throw new Error('X-Cache header should be HIT');
    }
  });

  await asyncTest('Cache middleware - Uses seconds TTL for in-memory Cache', async () => {
    const cacheStore = new Cache({ defaultTTL: 3600000 });
    const middleware = cache({
      cacheStore,
      ttl: 30,
      keyGenerator: () => 'memory:ttl',
    });

    const req = { method: 'GET', path: '/test', query: {} };
    const res = { statusCode: 200, headers: {}, body: null };

    await executeMiddleware([middleware], req, res, async () => {
      res.body = { value: 1 };
    }, true);

    const entry = cacheStore.get('memory:ttl');
    if (!entry || entry.body?.value !== 1) {
      throw new Error('In-memory cache entry missing');
    }
  });

  await asyncTest('NavisApp - AdvancedCache middleware integration', async () => {
    const app = new NavisApp();
    const advancedCache = new AdvancedCache({ l1Cache: new Cache() });

    app.use(cache({
      cacheStore: advancedCache,
      ttl: 120,
      keyGenerator: (req) => `app:${req.path}`,
    }));

    app.get('/cached', async (req, res) => {
      res.body = { message: 'hello' };
    });

    const first = await app.handleLambda({
      httpMethod: 'GET',
      path: '/cached',
      headers: {},
    });

    const second = await app.handleLambda({
      httpMethod: 'GET',
      path: '/cached',
      headers: {},
    });

    const firstBody = JSON.parse(first.body);
    const secondBody = JSON.parse(second.body);

    if (firstBody.message !== 'hello' || secondBody.message !== 'hello') {
      throw new Error('Lambda handler did not return expected body');
    }

    if (second.headers['X-Cache'] !== 'HIT') {
      throw new Error('Second request should be a cache HIT');
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
  console.log('✅ All v5.8.3 compatibility tests passed!');
  console.log('='.repeat(60));
}

run().then(() => process.exit(0)).catch(() => process.exit(1));
