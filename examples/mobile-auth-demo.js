/**
 * Mobile, Face (Biometric), and Bluetooth Authentication Demo
 * v5.9
 */

const {
  NavisApp,
  response,
  createMobileChallenge,
  createBiometricToken,
  createBluetoothChallenge,
  verifyMobileSignature,
  authenticateMobile,
  authenticateFace,
  authenticateBluetooth,
  authenticateDevice,
  sign,
} = require('../src/index');

const SECRET = process.env.MOBILE_AUTH_SECRET || 'demo-mobile-secret-change-in-production';

const app = new NavisApp();

// Issue mobile challenge
app.post('/auth/mobile/challenge', (req, res) => {
  const deviceId = req.body?.deviceId || 'mobile-device-001';
  const challenge = createMobileChallenge(deviceId, { secret: SECRET });
  response.success(res, challenge);
});

// Issue Bluetooth challenge
app.post('/auth/bluetooth/challenge', (req, res) => {
  const bleDeviceId = req.body?.bleDeviceId || 'ble-device-aa:bb:cc';
  const challenge = createBluetoothChallenge(bleDeviceId, { secret: SECRET });
  response.success(res, challenge);
});

// Issue biometric token (simulates Face ID / Touch ID on mobile)
app.post('/auth/biometric/token', (req, res) => {
  const { userId, type = 'face', deviceId } = req.body || {};
  const token = createBiometricToken(
    { userId: userId || 'user-123', type, deviceId },
    { secret: SECRET }
  );
  response.success(res, { token, type });
});

// Mobile-only protected route
app.get('/secure/mobile', authenticateMobile({ secret: SECRET }), (req, res) => {
  response.success(res, {
    message: 'Mobile device verified',
    device: req.mobile,
  });
});

// Face ID protected route
app.get('/secure/face', authenticateFace({ secret: SECRET }), (req, res) => {
  response.success(res, {
    message: 'Face biometric verified',
    biometric: req.biometric,
  });
});

// Bluetooth protected route
app.get('/secure/bluetooth', authenticateBluetooth({
  secret: SECRET,
  registeredDevices: ['ble-device-aa:bb:cc', 'ble-beacon-001'],
}), (req, res) => {
  response.success(res, {
    message: 'Bluetooth device verified',
    bluetooth: req.bluetooth,
  });
});

// Combined: mobile + face + bluetooth
app.get('/secure/device', authenticateDevice({
  require: ['mobile', 'face', 'bluetooth'],
  secret: SECRET,
  bluetooth: {
    registeredDevices: ['ble-device-aa:bb:cc'],
  },
}), (req, res) => {
  response.success(res, {
    message: 'Full device verification passed',
    auth: req.deviceAuth,
  });
});

// Demo helper: generate headers for testing
app.get('/demo/headers', (req, res) => {
  const deviceId = 'mobile-device-001';
  const timestamp = Date.now();
  const mobileSignature = sign(SECRET, `${deviceId}:${timestamp}`);

  const biometricToken = createBiometricToken(
    { userId: 'user-123', type: 'face', deviceId },
    { secret: SECRET }
  );

  const ble = createBluetoothChallenge('ble-device-aa:bb:cc', { secret: SECRET });
  const bleSignature = sign(SECRET, `${ble.bleDeviceId}:${ble.challenge}`);

  response.success(res, {
    mobile: {
      'x-device-id': deviceId,
      'x-device-timestamp': String(timestamp),
      'x-device-signature': mobileSignature,
    },
    face: {
      'x-biometric-token': biometricToken,
    },
    bluetooth: {
      'x-ble-device-id': ble.bleDeviceId,
      'x-ble-challenge': ble.challenge,
      'x-ble-signature': bleSignature,
    },
  });
});

const PORT = process.env.PORT || 3090;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Mobile auth demo: http://localhost:${PORT}`);
    console.log(`  GET  /demo/headers - Sample auth headers for testing`);
    console.log(`  GET  /secure/mobile - Mobile device auth`);
    console.log(`  GET  /secure/face - Face biometric auth`);
    console.log(`  GET  /secure/bluetooth - Bluetooth auth`);
    console.log(`  GET  /secure/device - Combined mobile + face + bluetooth`);
  });
}

module.exports = app;
