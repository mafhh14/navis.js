/**
 * Verification Script for v7.0
 * WebAuthn/passkeys and Lambda deploy CLI
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const navis = require('../src/index.js');
const {
  createWebAuthnStore,
  createTestCredential,
  signTestAuthentication,
  createRegistrationOptions,
  authenticateWebAuthn,
  NavisApp,
} = navis;

const { generateDeployConfig, packageLambda } = require('../bin/deploy/lambda');

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
console.log('Verifying v7.0 Features');
console.log('='.repeat(60));

async function run() {
  test('WebAuthn - registration options', () => {
    const store = createWebAuthnStore();
    const options = createRegistrationOptions('user-1', { store });
    if (!options.challenge || !options.rp?.name) {
      throw new Error('Registration options incomplete');
    }
  });

  await asyncTest('WebAuthn - register and authenticate', async () => {
    const store = createWebAuthnStore();
    const userId = 'user-42';
    const { credentialId, privateKeyPem, store: credStore } = createTestCredential(userId, { store });
    const result = signTestAuthentication({
      userId,
      credentialId,
      privateKeyPem,
      store: credStore,
    });
    if (result.userId !== 'user-42' || !result.credentialId) {
      throw new Error('WebAuthn authentication failed');
    }
  });

  await asyncTest('WebAuthn - middleware', async () => {
    const store = createWebAuthnStore();
    const userId = 'user-mw';
    const { credentialId, privateKeyPem, store: credStore } = createTestCredential(userId, { store });
    const app = new NavisApp();

    app.get('/secure/passkey', authenticateWebAuthn({ store: credStore }), (req, res) => {
      res.body = { ok: true, user: req.webauthn.userId };
    });

  // Pre-auth: get challenge via createAuthenticationOptions internally in signTest
    const authOptions = navis.createAuthenticationOptions(userId, { store: credStore });
    const clientData = JSON.stringify({
      type: 'webauthn.get',
      challenge: authOptions.challenge,
      origin: 'http://localhost',
      crossOrigin: false,
    });
    const clientDataJSON = Buffer.from(clientData).toString('base64url');
    const authenticatorData = Buffer.alloc(37, 0);
    const crypto = require('crypto');
    const clientDataHash = crypto.createHash('sha256').update(clientData).digest();
    const signedData = Buffer.concat([authenticatorData, clientDataHash]);
    const signature = crypto.sign('SHA256', signedData, privateKeyPem).toString('base64url');

    const response = await app.handleLambda({
      httpMethod: 'GET',
      path: '/secure/passkey',
      headers: {
        'x-user-id': userId,
        'x-credential-id': credentialId,
        'x-client-data': clientDataJSON,
        'x-authenticator-data': authenticatorData.toString('base64url'),
        'x-signature': signature,
      },
    });

    const body = JSON.parse(response.body);
    if (!body.ok || body.user !== userId) {
      throw new Error('WebAuthn middleware did not authenticate');
    }
  });

  await asyncTest('Deploy - generate SAM template', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'navis-deploy-test-'));
    const lambdaPath = path.join(tempDir, 'lambda.js');
    fs.writeFileSync(lambdaPath, 'exports.handler = async () => ({ statusCode: 200, body: "ok" });');

    const config = generateDeployConfig(tempDir, { stackName: 'navis-test' });
    if (!fs.existsSync(config.templatePath) || !fs.existsSync(config.deployDocPath)) {
      throw new Error('Deploy config files not generated');
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  await asyncTest('Deploy - package lambda zip', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'navis-zip-test-'));
    fs.writeFileSync(
      path.join(tempDir, 'lambda.js'),
      'exports.handler = async () => ({ statusCode: 200, body: "ok" });'
    );
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));

    const zipPath = packageLambda(tempDir);
    if (!fs.existsSync(zipPath)) {
      throw new Error('deployment.zip not created');
    }

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('Module exports - v7.0', () => {
    const required = [
      'WebAuthnStore',
      'createWebAuthnStore',
      'createRegistrationOptions',
      'completeRegistration',
      'createAuthenticationOptions',
      'verifyAuthentication',
      'authenticateWebAuthn',
      'createTestCredential',
      'signTestAuthentication',
    ];

    for (const name of required) {
      if (!navis[name]) {
        throw new Error(`${name} not exported`);
      }
    }
  });

  test('Package version - 7.0.0', () => {
    const pkg = require('../package.json');
    if (pkg.version !== '7.0.0') {
      throw new Error(`Expected version 7.0.0, got ${pkg.version}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ All v7.0 tests passed!');
  console.log('='.repeat(60));
}

run().then(() => process.exit(0)).catch(() => process.exit(1));
