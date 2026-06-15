/**
 * Verification Script for v5.9: Mobile, Face, and Bluetooth Authentication
 */

const navis = require('../src/index.js');
const { executeMiddleware } = require('../src/core/middleware');

const {
  sign,
  verifyMobileSignature,
  createMobileChallenge,
  createBiometricToken,
  verifyBiometricToken,
  createBluetoothChallenge,
  verifyBluetoothSignature,
  authenticateMobile,
  authenticateFace,
  authenticateBluetooth,
  authenticateDevice,
} = navis;

const SECRET = 'test-mobile-auth-secret';

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
console.log('Verifying v5.9: Mobile, Face, and Bluetooth Authentication');
console.log('='.repeat(60));

async function run() {
  test('Mobile challenge - Creation', () => {
    const challenge = createMobileChallenge('device-1', { secret: SECRET });
    if (!challenge.deviceId || !challenge.challenge) {
      throw new Error('Challenge missing fields');
    }
  });

  test('Mobile signature - Valid', () => {
    const deviceId = 'device-1';
    const timestamp = Date.now();
    const signature = sign(SECRET, `${deviceId}:${timestamp}`);
    const valid = verifyMobileSignature({ deviceId, signature, timestamp, secret: SECRET });
    if (!valid) {
      throw new Error('Valid signature rejected');
    }
  });

  test('Mobile signature - Invalid', () => {
    const valid = verifyMobileSignature({
      deviceId: 'device-1',
      signature: 'bad',
      timestamp: Date.now(),
      secret: SECRET,
    });
    if (valid) {
      throw new Error('Invalid signature accepted');
    }
  });

  test('Biometric token - Create and verify face', () => {
    const token = createBiometricToken({ userId: 'user-1', type: 'face' }, { secret: SECRET });
    const payload = verifyBiometricToken(token, { secret: SECRET, allowedTypes: ['face'] });
    if (!payload || payload.sub !== 'user-1' || payload.type !== 'face') {
      throw new Error('Biometric token verification failed');
    }
  });

  test('Bluetooth challenge - Create and verify', () => {
    const ble = createBluetoothChallenge('ble-001', { secret: SECRET });
    const signature = sign(SECRET, `${ble.bleDeviceId}:${ble.challenge}`);
    const valid = verifyBluetoothSignature({
      deviceId: ble.bleDeviceId,
      challenge: ble.challenge,
      signature,
      secret: SECRET,
      registeredDevices: ['ble-001'],
    });
    if (!valid) {
      throw new Error('Bluetooth verification failed');
    }
  });

  test('Bluetooth - Unregistered device rejected', () => {
    const valid = verifyBluetoothSignature({
      deviceId: 'unknown-ble',
      challenge: 'abc',
      signature: sign(SECRET, 'unknown-ble:abc'),
      secret: SECRET,
      registeredDevices: ['ble-001'],
    });
    if (valid) {
      throw new Error('Unregistered BLE device accepted');
    }
  });

  await asyncTest('Middleware - authenticateMobile', async () => {
    const deviceId = 'device-1';
    const timestamp = Date.now();
    const signature = sign(SECRET, `${deviceId}:${timestamp}`);

    const middleware = authenticateMobile({ secret: SECRET });
    const req = {
      headers: {
        'x-device-id': deviceId,
        'x-device-timestamp': String(timestamp),
        'x-device-signature': signature,
      },
    };
    const res = { statusCode: 200, body: null };

    await executeMiddleware([middleware], req, res, async () => {}, true);
    if (!req.mobile?.verified) {
      throw new Error('Mobile middleware did not verify device');
    }
  });

  await asyncTest('Middleware - authenticateFace', async () => {
    const token = createBiometricToken({ userId: 'user-42', type: 'face' }, { secret: SECRET });
    const middleware = authenticateFace({ secret: SECRET });
    const req = { headers: { 'x-biometric-token': token } };
    const res = { statusCode: 200, body: null };

    await executeMiddleware([middleware], req, res, async () => {}, true);
    if (!req.biometric?.verified || req.biometric.type !== 'face') {
      throw new Error('Face middleware did not verify');
    }
  });

  await asyncTest('Middleware - authenticateBluetooth', async () => {
    const ble = createBluetoothChallenge('ble-001', { secret: SECRET });
    const signature = sign(SECRET, `${ble.bleDeviceId}:${ble.challenge}`);
    const middleware = authenticateBluetooth({
      secret: SECRET,
      registeredDevices: ['ble-001'],
    });
    const req = {
      headers: {
        'x-ble-device-id': ble.bleDeviceId,
        'x-ble-challenge': ble.challenge,
        'x-ble-signature': signature,
      },
    };
    const res = { statusCode: 200, body: null };

    await executeMiddleware([middleware], req, res, async () => {}, true);
    if (!req.bluetooth?.verified) {
      throw new Error('Bluetooth middleware did not verify');
    }
  });

  await asyncTest('Middleware - authenticateDevice combined', async () => {
    const deviceId = 'device-1';
    const timestamp = Date.now();
    const mobileSignature = sign(SECRET, `${deviceId}:${timestamp}`);
    const biometricToken = createBiometricToken({ userId: 'user-1', type: 'face', deviceId }, { secret: SECRET });
    const ble = createBluetoothChallenge('ble-001', { secret: SECRET });
    const bleSignature = sign(SECRET, `${ble.bleDeviceId}:${ble.challenge}`);

    const middleware = authenticateDevice({
      require: ['mobile', 'face', 'bluetooth'],
      secret: SECRET,
      bluetooth: { registeredDevices: ['ble-001'] },
    });

    const req = {
      headers: {
        'x-device-id': deviceId,
        'x-device-timestamp': String(timestamp),
        'x-device-signature': mobileSignature,
        'x-biometric-token': biometricToken,
        'x-ble-device-id': ble.bleDeviceId,
        'x-ble-challenge': ble.challenge,
        'x-ble-signature': bleSignature,
      },
    };
    const res = { statusCode: 200, body: null };

    await executeMiddleware([middleware], req, res, async () => {}, true);
    if (!req.deviceAuth?.mobile || !req.deviceAuth?.biometric || !req.deviceAuth?.bluetooth) {
      throw new Error('Combined device auth failed');
    }
  });

  test('Module exports - v5.9 mobile auth', () => {
    const required = [
      'authenticateMobile',
      'authenticateFace',
      'authenticateBiometric',
      'authenticateBluetooth',
      'authenticateDevice',
      'createMobileChallenge',
      'createBiometricToken',
      'createBluetoothChallenge',
    ];
    for (const name of required) {
      if (!navis[name]) {
        throw new Error(`${name} not exported`);
      }
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ All v5.9 mobile auth tests passed!');
  console.log('='.repeat(60));
}

run().catch(() => process.exit(1));
