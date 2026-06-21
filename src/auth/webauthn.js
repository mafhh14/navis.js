/**
 * WebAuthn / Passkey Authentication
 * v7.0: Challenge-based passkey registration and authentication
 */

const crypto = require('crypto');
const { AuthenticationError } = require('./authenticator');

const DEFAULT_CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * In-memory credential and challenge store
 */
class WebAuthnStore {
  constructor() {
    this.credentials = new Map();
    this.challenges = new Map();
  }

  saveCredential(credentialId, data) {
    this.credentials.set(credentialId, data);
  }

  getCredential(credentialId) {
    return this.credentials.get(credentialId) || null;
  }

  getCredentialsForUser(userId) {
    const results = [];
    for (const [id, cred] of this.credentials.entries()) {
      if (cred.userId === userId) {
        results.push({ id, ...cred });
      }
    }
    return results;
  }

  saveChallenge(key, challenge, ttlMs = DEFAULT_CHALLENGE_TTL_MS) {
    this.challenges.set(key, {
      challenge,
      expiresAt: Date.now() + ttlMs,
    });
  }

  consumeChallenge(key, challenge) {
    const entry = this.challenges.get(key);
    this.challenges.delete(key);

    if (!entry || Date.now() > entry.expiresAt) {
      return false;
    }

    return entry.challenge === challenge;
  }

  clear() {
    this.credentials.clear();
    this.challenges.clear();
  }
}

const defaultStore = new WebAuthnStore();

function decodeBase64Url(value) {
  return Buffer.from(value, 'base64url');
}

function parseClientData(clientDataJSON) {
  const buffer = typeof clientDataJSON === 'string'
    ? decodeBase64Url(clientDataJSON)
    : clientDataJSON;
  return JSON.parse(buffer.toString('utf8'));
}

function verifyClientData(clientData, expectedChallenge, expectedType) {
  if (clientData.type !== expectedType) {
    return false;
  }
  if (clientData.challenge !== expectedChallenge) {
    return false;
  }
  return true;
}

function verifyAssertionSignature({ publicKeyPem, authenticatorData, clientDataJSON, signature }) {
  const authData = typeof authenticatorData === 'string'
    ? decodeBase64Url(authenticatorData)
    : authenticatorData;
  const clientData = typeof clientDataJSON === 'string'
    ? decodeBase64Url(clientDataJSON)
    : clientDataJSON;
  const clientDataHash = crypto.createHash('sha256').update(clientData).digest();
  const signedData = Buffer.concat([authData, clientDataHash]);
  const sig = typeof signature === 'string' ? decodeBase64Url(signature) : signature;

  return crypto.createVerify('SHA256').update(signedData).verify(
    { key: publicKeyPem, format: 'pem', type: 'spki' },
    sig
  );
}

/**
 * Create WebAuthn registration options
 */
function createRegistrationOptions(userId, options = {}) {
  const store = options.store || defaultStore;
  const challenge = crypto.randomBytes(32).toString('base64url');
  const challengeKey = `reg:${userId}`;

  store.saveChallenge(challengeKey, challenge, options.challengeTtlMs);

  return {
    challenge,
    rp: {
      name: options.rpName || 'Navis',
      id: options.rpId || 'localhost',
    },
    user: {
      id: userId,
      name: options.userName || userId,
      displayName: options.displayName || options.userName || userId,
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    timeout: options.timeout || 60000,
    attestation: options.attestation || 'none',
    authenticatorSelection: {
      authenticatorAttachment: options.authenticatorAttachment || 'platform',
      residentKey: options.residentKey || 'preferred',
      userVerification: options.userVerification || 'preferred',
    },
  };
}

/**
 * Complete WebAuthn registration
 */
function completeRegistration(userId, response, options = {}) {
  const store = options.store || defaultStore;
  const {
    credentialId,
    clientDataJSON,
    publicKeyPem,
  } = response;

  if (!credentialId || !clientDataJSON || !publicKeyPem) {
    throw new AuthenticationError('Invalid WebAuthn registration response');
  }

  const clientData = parseClientData(clientDataJSON);
  const challengeKey = `reg:${userId}`;

  if (!store.consumeChallenge(challengeKey, clientData.challenge)) {
    throw new AuthenticationError('Invalid or expired WebAuthn registration challenge');
  }

  if (clientData.type !== 'webauthn.create') {
    throw new AuthenticationError('Invalid WebAuthn registration type');
  }

  store.saveCredential(credentialId, {
    userId,
    publicKeyPem,
    counter: 0,
    createdAt: new Date().toISOString(),
  });

  return { credentialId, userId };
}

/**
 * Create WebAuthn authentication options
 */
function createAuthenticationOptions(userId, options = {}) {
  const store = options.store || defaultStore;
  const challenge = crypto.randomBytes(32).toString('base64url');
  const challengeKey = `auth:${userId}`;

  store.saveChallenge(challengeKey, challenge, options.challengeTtlMs);

  const credentials = store.getCredentialsForUser(userId).map((cred) => ({
    type: 'public-key',
    id: cred.id,
  }));

  return {
    challenge,
    timeout: options.timeout || 60000,
    rpId: options.rpId || 'localhost',
    allowCredentials: credentials,
    userVerification: options.userVerification || 'preferred',
  };
}

/**
 * Verify WebAuthn authentication assertion
 */
function verifyAuthentication(userId, response, options = {}) {
  const store = options.store || defaultStore;
  const {
    credentialId,
    clientDataJSON,
    authenticatorData,
    signature,
  } = response;

  if (!credentialId || !clientDataJSON || !authenticatorData || !signature) {
    throw new AuthenticationError('Invalid WebAuthn authentication response');
  }

  const credential = store.getCredential(credentialId);
  if (!credential || credential.userId !== userId) {
    throw new AuthenticationError('Unknown WebAuthn credential');
  }

  const clientData = parseClientData(clientDataJSON);
  const challengeKey = `auth:${userId}`;

  if (!store.consumeChallenge(challengeKey, clientData.challenge)) {
    throw new AuthenticationError('Invalid or expired WebAuthn authentication challenge');
  }

  if (!verifyClientData(clientData, clientData.challenge, 'webauthn.get')) {
    throw new AuthenticationError('Invalid WebAuthn client data');
  }

  const valid = verifyAssertionSignature({
    publicKeyPem: credential.publicKeyPem,
    authenticatorData,
    clientDataJSON,
    signature,
  });

  if (!valid) {
    throw new AuthenticationError('WebAuthn signature verification failed');
  }

  credential.counter += 1;
  store.saveCredential(credentialId, credential);

  return {
    userId,
    credentialId,
    counter: credential.counter,
  };
}

/**
 * Create test EC key pair and signed assertion (for demos/tests)
 */
function createTestCredential(userId, options = {}) {
  const store = options.store || defaultStore;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const credentialId = crypto.randomBytes(16).toString('base64url');

  const regOptions = createRegistrationOptions(userId, { store, ...options });
  const clientData = JSON.stringify({
    type: 'webauthn.create',
    challenge: regOptions.challenge,
    origin: options.origin || 'http://localhost',
    crossOrigin: false,
  });
  const clientDataJSON = Buffer.from(clientData).toString('base64url');

  completeRegistration(userId, {
    credentialId,
    clientDataJSON,
    publicKeyPem,
  }, { store });

  return { credentialId, publicKeyPem, privateKeyPem, store };
}

/**
 * Sign a test authentication assertion
 */
function signTestAuthentication({ userId, credentialId, privateKeyPem, store }) {
  const authOptions = createAuthenticationOptions(userId, { store });
  const clientData = JSON.stringify({
    type: 'webauthn.get',
    challenge: authOptions.challenge,
    origin: 'http://localhost',
    crossOrigin: false,
  });
  const clientDataJSON = Buffer.from(clientData).toString('base64url');
  const authenticatorData = Buffer.alloc(37, 0);
  const clientDataHash = crypto.createHash('sha256').update(clientData).digest();
  const signedData = Buffer.concat([authenticatorData, clientDataHash]);
  const signature = crypto.sign('SHA256', signedData, privateKeyPem).toString('base64url');

  return verifyAuthentication(userId, {
    credentialId,
    clientDataJSON,
    authenticatorData: authenticatorData.toString('base64url'),
    signature,
  }, { store });
}

/**
 * WebAuthn authentication middleware
 */
function authenticateWebAuthn(options = {}) {
  const store = options.store || defaultStore;

  return async (req, res, next) => {
    try {
      const userId = req.headers['x-user-id'] || req.body?.userId;
      const credentialId = req.headers['x-credential-id'] || req.body?.credentialId;
      const clientDataJSON = req.headers['x-client-data'] || req.body?.clientDataJSON;
      const authenticatorData = req.headers['x-authenticator-data'] || req.body?.authenticatorData;
      const signature = req.headers['x-signature'] || req.body?.signature;

      if (!userId || !credentialId) {
        throw new AuthenticationError('WebAuthn credentials required');
      }

      const result = verifyAuthentication(userId, {
        credentialId,
        clientDataJSON,
        authenticatorData,
        signature,
      }, { store });

      req.webauthn = result;
      return next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.statusCode = error.statusCode || 401;
        res.body = { error: error.message };
        return;
      }
      throw error;
    }
  };
}

function createWebAuthnStore() {
  return new WebAuthnStore();
}

module.exports = {
  WebAuthnStore,
  createWebAuthnStore,
  createRegistrationOptions,
  completeRegistration,
  createAuthenticationOptions,
  verifyAuthentication,
  authenticateWebAuthn,
  createTestCredential,
  signTestAuthentication,
  verifyAssertionSignature,
};
