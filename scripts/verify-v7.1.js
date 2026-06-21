/**
 * Verification Script for v7.1
 * Docker deploy, lazy exports, Lambda cold-start optimizations
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const navis = require('../src/index.js');
const { applyLazyExports } = require('../src/utils/lazy-export');
const { generateDockerConfig } = require('../bin/deploy/docker');

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
console.log('Verifying v7.1 Features');
console.log('='.repeat(60));

async function run() {
  test('Lazy exports - gRPC loads on first access', () => {
    if (typeof navis.GrpcServer !== 'function') {
      throw new Error('GrpcServer not available via lazy export');
    }
    if (typeof navis.createGrpcServer !== 'function') {
      throw new Error('createGrpcServer not available via lazy export');
    }
  });

  test('Lazy exports - GraphQL loads on first access', () => {
    if (typeof navis.createGraphQLServer !== 'function') {
      throw new Error('createGraphQLServer not available via lazy export');
    }
  });

  test('Lazy exports - core modules still eager', () => {
    if (typeof navis.NavisApp !== 'function' || typeof navis.Cache !== 'function') {
      throw new Error('Core modules should load eagerly');
    }
  });

  await asyncTest('Docker - generate config files', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'navis-docker-test-'));
    fs.writeFileSync(path.join(tempDir, 'service.js'), 'module.exports = {};');
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));

    const config = generateDockerConfig(tempDir, { entry: 'service.js', port: 3000 });
    if (!fs.existsSync(config.dockerfilePath) || !fs.existsSync(config.composePath)) {
      throw new Error('Docker files not generated');
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  await asyncTest('v5-features-demo - Lambda handler with response.success', async () => {
    const app = require('../examples/v5-features-demo.js');
    const response = await app.handleLambda({
      httpMethod: 'GET',
      path: '/users/99',
      headers: {},
    });

    const body = JSON.parse(response.body);
    if (body.id !== '99' || body.name !== 'John Doe') {
      throw new Error('Cached route failed on Lambda handler');
    }
  });

  test('Module exports - lazy applyLazyExports', () => {
    if (typeof applyLazyExports !== 'function') {
      throw new Error('applyLazyExports not exported from lazy-export util');
    }
  });

  test('Package version - 7.1.0', () => {
    const pkg = require('../package.json');
    if (pkg.version !== '7.1.0') {
      throw new Error(`Expected version 7.1.0, got ${pkg.version}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ All v7.1 tests passed!');
  console.log('='.repeat(60));
}

run().then(() => process.exit(0)).catch(() => process.exit(1));
