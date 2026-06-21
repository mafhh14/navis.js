/**
 * Verification Script for v6.2
 * Alert channels: Slack, PagerDuty, SNS
 */

const navis = require('../src/index.js');
const { AlertManager, createAlertManager } = navis;

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
console.log('Verifying v6.2 Features');
console.log('='.repeat(60));

async function run() {
  test('AlertManager - slackChannel factory', () => {
    const channel = AlertManager.slackChannel({ webhookUrl: 'https://hooks.slack.com/test' });
    if (typeof channel !== 'function') {
      throw new Error('slackChannel should return a function');
    }
  });

  test('AlertManager - pagerDutyChannel factory', () => {
    const channel = AlertManager.pagerDutyChannel({ routingKey: 'test-routing-key' });
    if (typeof channel !== 'function') {
      throw new Error('pagerDutyChannel should return a function');
    }
  });

  await asyncTest('AlertManager - snsChannel requires SDK', async () => {
    const channel = AlertManager.snsChannel({ topicArn: 'arn:aws:sns:us-east-1:123:alerts' });
    try {
      await channel({
        name: 'test',
        severity: 'warning',
        message: 'test',
        metric: 'errors',
        value: 1,
        threshold: 0,
        labels: {},
        timestamp: new Date().toISOString(),
      });
      throw new Error('Expected SNS channel to fail without SDK');
    } catch (err) {
      if (!err.message.includes('@aws-sdk/client-sns')) {
        throw err;
      }
    }
  });

  await asyncTest('AlertManager - custom channel integration', async () => {
    const received = [];
    const manager = createAlertManager();
    manager.addChannel(async (alert) => received.push(alert));
    manager.addRule({
      name: 'cpu-high',
      metric: 'cpu_usage',
      condition: 'gte',
      threshold: 90,
      message: 'CPU high',
    });

    const fired = await manager.evaluate({ gauges: { cpu_usage: 95 } });
    if (fired.length !== 1 || received.length !== 1) {
      throw new Error('Alert channel did not receive alert');
    }
  });

  test('Module exports - v6.2 alert channels', () => {
    if (!AlertManager.slackChannel || !AlertManager.pagerDutyChannel || !AlertManager.snsChannel) {
      throw new Error('Alert channel factories missing');
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ All v6.2 tests passed!');
  console.log('='.repeat(60));
}

run().then(() => process.exit(0)).catch(() => process.exit(1));
