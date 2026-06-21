# Navis.js v7.0 Features

## Overview

v7.0 delivers the AI roadmap flagship features:

- **WebAuthn / passkeys** — Registration, authentication, and middleware
- **`navis deploy lambda`** — AWS SAM template generation, zip packaging, and deployment

## WebAuthn / Passkeys

```javascript
const {
  NavisApp,
  createWebAuthnStore,
  createRegistrationOptions,
  createAuthenticationOptions,
  authenticateWebAuthn,
} = require('navis.js');

const store = createWebAuthnStore();
const app = new NavisApp();

app.post('/auth/register/options', (req, res) => {
  res.body = createRegistrationOptions(req.body.userId, { store });
});

app.get('/secure', authenticateWebAuthn({ store }), (req, res) => {
  res.body = { user: req.webauthn.userId };
});
```

### Test helpers

```javascript
const { createTestCredential, signTestAuthentication } = require('navis.js');

const cred = createTestCredential('user-1', { store });
const session = signTestAuthentication({
  userId: 'user-1',
  credentialId: cred.credentialId,
  privateKeyPem: cred.privateKeyPem,
  store,
});
```

## Lambda Deploy CLI

### Generate SAM config

```bash
navis deploy lambda --generate-only
```

Creates `template.yaml`, `samconfig.toml`, and `DEPLOY.md`.

### Package zip only

```bash
navis deploy lambda --zip-only
```

Creates `deployment.zip` for manual `aws lambda update-function-code`.

### Full SAM deploy

```bash
navis deploy lambda --guided
```

Requires AWS SAM CLI (`sam`) and configured AWS credentials.

### Service generator integration

```bash
navis generate service my-api
cd my-api
navis deploy lambda --generate-only
```

## Examples

```bash
node examples/webauthn-demo.js
```

## Verification

```bash
node scripts/verify-v7.0.js
npm test
```
