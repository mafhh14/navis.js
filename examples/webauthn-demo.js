/**
 * WebAuthn / Passkey Authentication Demo
 * v7.0
 */

const {
  NavisApp,
  response,
  createWebAuthnStore,
  createRegistrationOptions,
  createAuthenticationOptions,
  createTestCredential,
  signTestAuthentication,
  authenticateWebAuthn,
} = require('../src/index');

const store = createWebAuthnStore();
const app = new NavisApp();
const DEMO_USER = 'demo-user';

// Begin passkey registration
app.post('/auth/webauthn/register/options', (req, res) => {
  const userId = req.body?.userId || DEMO_USER;
  const options = createRegistrationOptions(userId, { store });
  response.success(res, options);
});

// Complete registration (production clients send real WebAuthn attestation)
app.post('/auth/webauthn/register/complete', (req, res) => {
  const userId = req.body?.userId || DEMO_USER;
  const testCred = createTestCredential(userId, { store });
  response.success(res, {
    message: 'Passkey registered (demo uses test credential)',
    credentialId: testCred.credentialId,
  });
});

// Begin authentication
app.post('/auth/webauthn/login/options', (req, res) => {
  const userId = req.body?.userId || DEMO_USER;
  const options = createAuthenticationOptions(userId, { store });
  response.success(res, options);
});

// Demo login helper (simulates client assertion)
app.post('/auth/webauthn/login/demo', (req, res) => {
  const userId = req.body?.userId || DEMO_USER;
  const cred = store.getCredentialsForUser(userId)[0];
  if (!cred) {
    response.error(res, 'Register a passkey first', 400);
    return;
  }

  const testCred = createTestCredential(userId, { store });
  const result = signTestAuthentication({
    userId,
    credentialId: testCred.credentialId,
    privateKeyPem: testCred.privateKeyPem,
    store,
  });

  response.success(res, { message: 'Passkey login successful', auth: result });
});

// Protected route using middleware
app.get('/secure/passkey', authenticateWebAuthn({ store }), (req, res) => {
  response.success(res, {
    message: 'Passkey verified',
    user: req.webauthn,
  });
});

const PORT = process.env.PORT || 3091;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`WebAuthn demo: http://localhost:${PORT}`);
    console.log('  POST /auth/webauthn/register/complete — Register demo passkey');
    console.log('  POST /auth/webauthn/login/demo — Demo login');
    console.log('  GET  /secure/passkey — Protected (requires WebAuthn headers)');
  });
}

module.exports = app;
