/**
 * Metrics Collector
 * v3: Collect and expose application metrics
 */

class Metrics {
  constructor(options = {}) {
    this.metrics = {
      counters: new Map(),
      gauges: new Map(),
      histograms: new Map(),
    };
    this.enabled = options.enabled !== false;
  }

  /**
   * Increment a counter
   * @param {string} name - Metric name
   * @param {number} value - Increment value (default: 1)
   * @param {Object} labels - Metric labels
   */
  increment(name, value = 1, labels = {}) {
    if (!this.enabled) return;

    const key = this._getKey(name, labels);
    const current = this.metrics.counters.get(key) || 0;
    this.metrics.counters.set(key, current + value);
  }

  /**
   * Decrement a counter
   * @param {string} name - Metric name
   * @param {number} value - Decrement value (default: 1)
   * @param {Object} labels - Metric labels
   */
  decrement(name, value = 1, labels = {}) {
    this.increment(name, -value, labels);
  }

  /**
   * Set a gauge value
   * @param {string} name - Metric name
   * @param {number} value - Gauge value
   * @param {Object} labels - Metric labels
   */
  gauge(name, value, labels = {}) {
    if (!this.enabled) return;

    const key = this._getKey(name, labels);
    this.metrics.gauges.set(key, value);
  }

  /**
   * Record a histogram value
   * @param {string} name - Metric name
   * @param {number} value - Value to record
   * @param {Object} labels - Metric labels
   */
  histogram(name, value, labels = {}) {
    if (!this.enabled) return;

    const key = this._getKey(name, labels);
    if (!this.metrics.histograms.has(key)) {
      this.metrics.histograms.set(key, []);
    }
    this.metrics.histograms.get(key).push({
      value,
      timestamp: Date.now(),
    });

    // Keep only last 1000 values per histogram
    const values = this.metrics.histograms.get(key);
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * Record request duration
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @param {number} duration - Duration in milliseconds
   * @param {number} statusCode - HTTP status code
   */
  recordRequest(method, path, duration, statusCode) {
    this.histogram('http_request_duration_ms', duration, {
      method,
      path,
      status: statusCode,
    });
    this.increment('http_requests_total', 1, {
      method,
      path,
      status: statusCode,
    });
  }

  /**
   * Get all metrics
   * @returns {Object} - All collected metrics
   */
  getAll() {
    return {
      counters: Object.fromEntries(this.metrics.counters),
      gauges: Object.fromEntries(this.metrics.gauges),
      histograms: Object.fromEntries(
        Array.from(this.metrics.histograms.entries()).map(([key, values]) => [
          key,
          {
            count: values.length,
            sum: values.reduce((sum, v) => sum + v.value, 0),
            avg: values.length > 0 ? values.reduce((sum, v) => sum + v.value, 0) / values.length : 0,
            min: values.length > 0 ? Math.min(...values.map(v => v.value)) : 0,
            max: values.length > 0 ? Math.max(...values.map(v => v.value)) : 0,
            values: values.slice(-100), // Last 100 values
          },
        ])
      ),
    };
  }

  /**
   * Get metrics in Prometheus format
   * @returns {string} - Prometheus metrics format
   */
  toPrometheus() {
    const lines = [];

    // Counters
    for (const [key, value] of this.metrics.counters.entries()) {
      const { name, labels } = this._parseKey(key);
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      lines.push(`${name}{${labelStr}} ${value}`);
    }

    // Gauges
    for (const [key, value] of this.metrics.gauges.entries()) {
      const { name, labels } = this._parseKey(key);
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      lines.push(`${name}{${labelStr}} ${value}`);
    }

    // Histograms
    for (const [key, histogram] of this.metrics.histograms.entries()) {
      const { name, labels } = this._parseKey(key);
      const labelStr = Object.entries(labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      lines.push(`${name}_count{${labelStr}} ${histogram.length}`);
      lines.push(`${name}_sum{${labelStr}} ${histogram.reduce((sum, v) => sum + v.value, 0)}`);
      lines.push(`${name}_avg{${labelStr}} ${histogram.length > 0 ? histogram.reduce((sum, v) => sum + v.value, 0) / histogram.length : 0}`);
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.counters.clear();
    this.metrics.gauges.clear();
    this.metrics.histograms.clear();
  }

  /**
   * Get key for metric storage
   * @private
   */
  _getKey(name, labels) {
    const labelStr = JSON.stringify(labels);
    return `${name}::${labelStr}`;
  }

  /**
   * Parse key back to name and labels
   * @private
   */
  _parseKey(key) {
    const [name, labelStr] = key.split('::');
    return {
      name,
      labels: JSON.parse(labelStr || '{}'),
    };
  }
}

module.exports = Metrics;

