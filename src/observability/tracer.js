/**
 * Distributed Tracer
 * v3: Basic distributed tracing support
 */

class Tracer {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'navis-service';
    this.enabled = options.enabled !== false;
    this.spans = new Map();
    this.traceId = null;
  }

  /**
   * Start a new trace
   * @param {string} operationName - Operation name
   * @param {Object} context - Trace context
   * @returns {string} - Trace ID
   */
  startTrace(operationName, context = {}) {
    if (!this.enabled) return null;

    const traceId = this._generateId();
    const spanId = this._generateId();
    
    this.traceId = traceId;
    
    const span = {
      traceId,
      spanId,
      operationName,
      startTime: Date.now(),
      tags: context.tags || {},
      logs: [],
      childSpans: [],
    };

    this.spans.set(spanId, span);
    return traceId;
  }

  /**
   * Start a new span
   * @param {string} operationName - Operation name
   * @param {Object} options - Span options
   * @returns {string} - Span ID
   */
  startSpan(operationName, options = {}) {
    if (!this.enabled) return null;

    const spanId = this._generateId();
    const parentSpanId = options.parentSpanId || this._getCurrentSpanId();
    const traceId = options.traceId || this.traceId || this.startTrace(operationName);

    const span = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: Date.now(),
      tags: options.tags || {},
      logs: [],
      childSpans: [],
    };

    this.spans.set(spanId, span);

    // Add as child span if parent exists
    if (parentSpanId) {
      const parentSpan = this.spans.get(parentSpanId);
      if (parentSpan) {
        parentSpan.childSpans.push(spanId);
      }
    }

    return spanId;
  }

  /**
   * Finish a span
   * @param {string} spanId - Span ID
   * @param {Object} options - Finish options
   */
  finishSpan(spanId, options = {}) {
    if (!this.enabled || !spanId) return;

    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = options.status || 'ok';
    span.error = options.error || null;

    if (options.tags) {
      span.tags = { ...span.tags, ...options.tags };
    }
  }

  /**
   * Add tag to span
   * @param {string} spanId - Span ID
   * @param {string} key - Tag key
   * @param {*} value - Tag value
   */
  addTag(spanId, key, value) {
    if (!this.enabled || !spanId) return;

    const span = this.spans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  /**
   * Add log to span
   * @param {string} spanId - Span ID
   * @param {string} message - Log message
   * @param {Object} fields - Log fields
   */
  addLog(spanId, message, fields = {}) {
    if (!this.enabled || !spanId) return;

    const span = this.spans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        message,
        fields,
      });
    }
  }

  /**
   * Get trace data
   * @param {string} traceId - Trace ID
   * @returns {Object} - Trace data
   */
  getTrace(traceId) {
    const traceSpans = Array.from(this.spans.values()).filter(
      span => span.traceId === traceId
    );
    
    return {
      traceId,
      spans: traceSpans,
      duration: traceSpans.length > 0
        ? Math.max(...traceSpans.map(s => s.endTime || Date.now())) -
          Math.min(...traceSpans.map(s => s.startTime))
        : 0,
    };
  }

  /**
   * Get all traces
   * @returns {Array} - All traces
   */
  getAllTraces() {
    const traceIds = new Set();
    for (const span of this.spans.values()) {
      traceIds.add(span.traceId);
    }

    return Array.from(traceIds).map(traceId => this.getTrace(traceId));
  }

  /**
   * Clear old spans (keep last N)
   * @param {number} keepCount - Number of spans to keep
   */
  clearOldSpans(keepCount = 1000) {
    const spans = Array.from(this.spans.entries());
    if (spans.length > keepCount) {
      // Sort by start time and keep most recent
      spans.sort((a, b) => b[1].startTime - a[1].startTime);
      const toKeep = spans.slice(0, keepCount);
      this.spans.clear();
      for (const [id, span] of toKeep) {
        this.spans.set(id, span);
      }
    }
  }

  /**
   * Get current span ID
   * @private
   */
  _getCurrentSpanId() {
    // Return the most recently created span
    const spans = Array.from(this.spans.values());
    if (spans.length === 0) return null;
    return spans[spans.length - 1].spanId;
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = Tracer;

