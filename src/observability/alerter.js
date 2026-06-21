/**
 * Alert Manager
 * v6.0: Metric-based alerting with webhook notifications
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class AlertManager {
  constructor(options = {}) {
    this.rules = [];
    this.channels = options.channels || [];
    this.cooldownMs = options.cooldownMs || 60000;
    this.lastFired = new Map();
  }

  /**
   * Add alert rule
   * @param {Object} rule
   */
  addRule(rule) {
    this.rules.push({
      name: rule.name,
      metric: rule.metric,
      condition: rule.condition || 'gt',
      threshold: rule.threshold,
      labels: rule.labels || {},
      message: rule.message || `Alert: ${rule.name}`,
      severity: rule.severity || 'warning',
    });
  }

  /**
   * Remove alert rule by name
   * @param {string} name
   */
  removeRule(name) {
    this.rules = this.rules.filter((rule) => rule.name !== name);
  }

  /**
   * Add notification channel
   * @param {Function} channel - async (alert) => void
   */
  addChannel(channel) {
    if (typeof channel === 'function') {
      this.channels.push(channel);
    }
  }

  /**
   * Webhook notification channel
   * @param {Object} options
   * @returns {Function}
   */
  static webhookChannel(options = {}) {
    const { url, headers = {} } = options;
    if (!url) {
      throw new Error('Webhook URL is required');
    }

    return async (alert) => {
      await postJson(url, alert, headers);
    };
  }

  /**
   * Evaluate metrics and fire alerts
   * @param {Object} metrics - Metrics instance
   * @returns {Promise<Array>}
   */
  async evaluate(metrics) {
    const fired = [];
    const snapshot = metrics.getSnapshot ? metrics.getSnapshot() : metrics;

    for (const rule of this.rules) {
      const value = this._resolveMetric(snapshot, rule.metric, rule.labels);
      if (value === null || value === undefined) {
        continue;
      }

      if (!this._matches(rule, value)) {
        continue;
      }

      const cooldownKey = `${rule.name}:${JSON.stringify(rule.labels)}`;
      const last = this.lastFired.get(cooldownKey) || 0;
      if (Date.now() - last < this.cooldownMs) {
        continue;
      }

      const alert = {
        name: rule.name,
        severity: rule.severity,
        message: rule.message,
        metric: rule.metric,
        value,
        threshold: rule.threshold,
        labels: rule.labels,
        timestamp: new Date().toISOString(),
      };

      await this._notify(alert);
      this.lastFired.set(cooldownKey, Date.now());
      fired.push(alert);
    }

    return fired;
  }

  /**
   * @private
   */
  _matches(rule, value) {
    switch (rule.condition) {
      case 'gt':
        return value > rule.threshold;
      case 'gte':
        return value >= rule.threshold;
      case 'lt':
        return value < rule.threshold;
      case 'lte':
        return value <= rule.threshold;
      case 'eq':
        return value === rule.threshold;
      default:
        return false;
    }
  }

  /**
   * @private
   */
  _resolveMetric(snapshot, name, labels = {}) {
    if (typeof snapshot === 'object' && snapshot !== null) {
      if (snapshot.counters && snapshot.counters[name] !== undefined) {
        return snapshot.counters[name];
      }
      if (snapshot.gauges && snapshot.gauges[name] !== undefined) {
        return snapshot.gauges[name];
      }
      if (snapshot[name] !== undefined) {
        return snapshot[name];
      }
    }
    return null;
  }

  /**
   * @private
   */
  async _notify(alert) {
    for (const channel of this.channels) {
      try {
        await channel(alert);
      } catch (error) {
        // Continue notifying other channels
        if (process.env.NODE_ENV !== 'test') {
          console.error('Alert channel error:', error.message);
        }
      }
    }
  }
}

/**
 * Create alert manager
 * @param {Object} options
 * @returns {AlertManager}
 */
function createAlertManager(options = {}) {
  return new AlertManager(options);
}

module.exports = {
  AlertManager,
  createAlertManager,
};

/**
 * POST JSON payload to URL
 * @param {string} targetUrl
 * @param {Object} payload
 * @param {Object} headers
 * @returns {Promise<void>}
 */
function postJson(targetUrl, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const body = JSON.stringify(payload);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
          return;
        }
        reject(new Error(`Webhook alert failed: ${res.statusCode}`));
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
