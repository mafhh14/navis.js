/**
 * Mobile, Biometric (Face), and Bluetooth Authentication
 * v5.9: Device-based verification for mobile apps
 */

const crypto = require('crypto');
const { AuthenticationError } = require('./authenticator');

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Create HMAC-SHA256 signature
 * @param {string} secret
 * @param {string} data
 * @returns {string}
 */
function sign(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Timing-safe string comparison
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify mobile device signature
 * @param {Object} params
 * @returns {boolean}
 */
function verifyMobileSignature({
  deviceId,
  signature,
  timestamp,
  secret,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
}) {
  if (!deviceId || !signature || !timestamp || !secret) {
    return false;
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Date.now() - ts > maxAgeMs || ts > Date.now() + 60000) {
    return false;
  }

  const expected = sign(secret, `${deviceId}:${ts}`);
  return safeEqual(expected, signature);
}

/**
 * Create a mobile challenge for client apps
 * @param {string} deviceId
 * @param {Object} options
 * @returns {Object}
 */
function createMobileChallenge(deviceId, options = {}) {
  const secret = options.secret || process.env.MOBILE_AUTH_SECRET;
  if (!secret) {
    throw new Error('Mobile auth secret is required');
  }

  const timestamp = Date.now();
  const challenge = sign(secret, `challenge:${deviceId}:${timestamp}`);

  return {
    deviceId,
    challenge,
    timestamp,
    expiresAt: timestamp + (options.maxAgeMs || DEFAULT_MAX_AGE_MS),
  };
}

/**
 * Create a biometric (face/fingerprint) assertion token
 * @param {Object} payload
 * @param {Object} options
 * @returns {string}
 */
function createBiometricToken(payload, options = {}) {
  const secret = options.secret || process.env.BIOMETRIC_AUTH_SECRET || process.env.MOBILE_AUTH_SECRET;
  if (!secret) {
    throw new Error('Biometric auth secret is required');
  }

  const data = {
    sub: payload.userId || payload.sub,
    type: payload.type || 'face',
    deviceId: payload.deviceId || null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (options.ttlSeconds || 300),
  };

  const body = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = sign(secret, body);

  return `${body}.${sig}`;
}

/**
 * Verify biometric / face assertion token
 * @param {string} token
 * @param {Object} options
 * @returns {Object|null}
 */
function verifyBiometricToken(token, options = {}) {
  const secret = options.secret || process.env.BIOMETRIC_AUTH_SECRET || process.env.MOBILE_AUTH_SECRET;
  if (!token || !secret) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [body, sig] = parts;
  const expected = sign(secret, body);
  if (!safeEqual(expected, sig)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    if (options.allowedTypes && !options.allowedTypes.includes(payload.type)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify Bluetooth device proximity auth
 * @param {Object} params
 * @returns {boolean}
 */
function verifyBluetoothSignature({
  deviceId,
  challenge,
  signature,
  secret,
  registeredDevices = [],
}) {
  if (!deviceId || !challenge || !signature || !secret) {
    return false;
  }

  if (registeredDevices.length > 0 && !registeredDevices.includes(deviceId)) {
    return false;
  }

  const expected = sign(secret, `${deviceId}:${challenge}`);
  return safeEqual(expected, signature);
}

/**
 * Create Bluetooth auth challenge
 * @param {string} bleDeviceId
 * @param {Object} options
 * @returns {Object}
 */
function createBluetoothChallenge(bleDeviceId, options = {}) {
  const secret = options.secret || process.env.BLUETOOTH_AUTH_SECRET || process.env.MOBILE_AUTH_SECRET;
  if (!secret) {
    throw new Error('Bluetooth auth secret is required');
  }

  const challenge = crypto.randomBytes(16).toString('hex');
  const signature = sign(secret, `${bleDeviceId}:${challenge}`);

  return {
    bleDeviceId,
    challenge,
    serverSignature: signature,
    expiresAt: Date.now() + (options.maxAgeMs || DEFAULT_MAX_AGE_MS),
  };
}

/**
 * Mobile device authentication middleware
 */
function authenticateMobile(options = {}) {
  const {
    secret = process.env.MOBILE_AUTH_SECRET,
    deviceIdHeader = 'x-device-id',
    signatureHeader = 'x-device-signature',
    timestampHeader = 'x-device-timestamp',
    maxAgeMs = DEFAULT_MAX_AGE_MS,
    validateDevice = null,
  } = options;

  if (!secret) {
    throw new Error('Mobile auth secret is required');
  }

  return async (req, res, next) => {
    try {
      const deviceId = req.headers[deviceIdHeader] || req.headers[deviceIdHeader.toLowerCase()];
      const signature = req.headers[signatureHeader] || req.headers[signatureHeader.toLowerCase()];
      const timestamp = req.headers[timestampHeader] || req.headers[timestampHeader.toLowerCase()];

      if (!deviceId || !signature || !timestamp) {
        throw new AuthenticationError('Mobile device verification required');
      }

      const valid = verifyMobileSignature({ deviceId, signature, timestamp, secret, maxAgeMs });
      if (!valid) {
        throw new AuthenticationError('Invalid mobile device verification');
      }

      if (validateDevice) {
        const allowed = await validateDevice(deviceId, req);
        if (!allowed) {
          throw new AuthenticationError('Device not registered');
        }
      }

      req.mobile = { deviceId, verified: true, method: 'mobile' };
      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.statusCode = error.statusCode;
        res.body = { error: error.message };
        return;
      }
      throw error;
    }
  };
}

/**
 * Face / biometric authentication middleware
 */
function authenticateFace(options = {}) {
  return authenticateBiometric({ ...options, allowedTypes: options.allowedTypes || ['face'] });
}

/**
 * Biometric authentication middleware (face, fingerprint, etc.)
 */
function authenticateBiometric(options = {}) {
  const {
    secret = process.env.BIOMETRIC_AUTH_SECRET || process.env.MOBILE_AUTH_SECRET,
    tokenHeader = 'x-biometric-token',
    allowedTypes = ['face', 'fingerprint', 'biometric'],
  } = options;

  if (!secret) {
    throw new Error('Biometric auth secret is required');
  }

  return async (req, res, next) => {
    try {
      const token = req.headers[tokenHeader]
        || req.headers[tokenHeader.toLowerCase()]
        || req.headers['x-face-token']
        || req.headers['x-face-token'.toLowerCase()];

      if (!token) {
        throw new AuthenticationError('Biometric verification required');
      }

      const payload = verifyBiometricToken(token, { secret, allowedTypes });
      if (!payload) {
        throw new AuthenticationError('Invalid biometric verification');
      }

      req.biometric = {
        userId: payload.sub,
        type: payload.type,
        deviceId: payload.deviceId,
        verified: true,
        method: payload.type,
      };
      req.user = req.user || { id: payload.sub, authMethod: payload.type };
      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.statusCode = error.statusCode;
        res.body = { error: error.message };
        return;
      }
      throw error;
    }
  };
}

/**
 * Bluetooth device authentication middleware
 */
function authenticateBluetooth(options = {}) {
  const {
    secret = process.env.BLUETOOTH_AUTH_SECRET || process.env.MOBILE_AUTH_SECRET,
    deviceIdHeader = 'x-ble-device-id',
    challengeHeader = 'x-ble-challenge',
    signatureHeader = 'x-ble-signature',
    registeredDevices = [],
    validateDevice = null,
  } = options;

  if (!secret) {
    throw new Error('Bluetooth auth secret is required');
  }

  return async (req, res, next) => {
    try {
      const deviceId = req.headers[deviceIdHeader] || req.headers[deviceIdHeader.toLowerCase()];
      const challenge = req.headers[challengeHeader] || req.headers[challengeHeader.toLowerCase()];
      const signature = req.headers[signatureHeader] || req.headers[signatureHeader.toLowerCase()];

      if (!deviceId || !challenge || !signature) {
        throw new AuthenticationError('Bluetooth device verification required');
      }

      const valid = verifyBluetoothSignature({
        deviceId,
        challenge,
        signature,
        secret,
        registeredDevices,
      });

      if (!valid) {
        throw new AuthenticationError('Invalid Bluetooth device verification');
      }

      if (validateDevice) {
        const allowed = await validateDevice(deviceId, req);
        if (!allowed) {
          throw new AuthenticationError('Bluetooth device not registered');
        }
      }

      req.bluetooth = { deviceId, verified: true, method: 'bluetooth' };
      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.statusCode = error.statusCode;
        res.body = { error: error.message };
        return;
      }
      throw error;
    }
  };
}

/**
 * Combined mobile auth - require multiple verification methods
 * @param {Object} options
 * @param {Array<'mobile'|'face'|'biometric'|'bluetooth'>} options.require - Methods to require
 */
function authenticateDevice(options = {}) {
  const { require: methods = ['mobile'], secret, ...methodOptions } = options;

  const withSecret = (opts = {}) => ({ secret, ...opts });

  const middlewares = [];

  if (methods.includes('mobile')) {
    middlewares.push(authenticateMobile(withSecret(methodOptions.mobile || methodOptions)));
  }
  if (methods.includes('face')) {
    middlewares.push(authenticateFace(withSecret(methodOptions.face || methodOptions.biometric || methodOptions)));
  }
  if (methods.includes('biometric')) {
    middlewares.push(authenticateBiometric(withSecret(methodOptions.biometric || methodOptions)));
  }
  if (methods.includes('bluetooth')) {
    middlewares.push(authenticateBluetooth(withSecret(methodOptions.bluetooth || methodOptions)));
  }

  return async (req, res, next) => {
    let index = 0;

    const runNext = async () => {
      if (index >= middlewares.length) {
        req.deviceAuth = {
          mobile: req.mobile || null,
          biometric: req.biometric || null,
          bluetooth: req.bluetooth || null,
          methods,
        };
        return next();
      }

      const middleware = middlewares[index++];
      await middleware(req, res, runNext);
    };

    await runNext();
  };
}

module.exports = {
  sign,
  verifyMobileSignature,
  createMobileChallenge,
  createBiometricToken,
  verifyBiometricToken,
  verifyBluetoothSignature,
  createBluetoothChallenge,
  authenticateMobile,
  authenticateFace,
  authenticateBiometric,
  authenticateBluetooth,
  authenticateDevice,
};
