/**
 * Optimized Lambda Handler
 * v3.1: Enhanced Lambda handler with cold start optimizations
 */

class LambdaHandler {
  constructor(app, options = {}) {
    this.app = app;
    this.isWarm = false;
    this.initTime = Date.now();
    this.invocationCount = 0;
    this.coldStartCount = 0;
    this.enableMetrics = options.enableMetrics !== false;
    this.warmupPath = options.warmupPath || '/warmup';
  }

  /**
   * Handle Lambda invocation
   * @param {Object} event - Lambda event
   * @param {Object} context - Lambda context
   * @returns {Promise<Object>} - Lambda response
   */
  async handle(event, context) {
    this.invocationCount++;

    // Detect warm-up events
    if (this.isWarmupEvent(event)) {
      return this.handleWarmup();
    }

    // Track cold start
    const isColdStart = !this.isWarm;
    if (isColdStart) {
      this.isWarm = true;
      this.coldStartCount++;
      
      if (this.enableMetrics) {
        const coldStartDuration = Date.now() - this.initTime;
        console.log(JSON.stringify({
          type: 'cold-start',
          duration: coldStartDuration,
          memoryLimit: context.memoryLimitInMB,
          requestId: context.requestId,
        }));
      }
    }

    // Add cold start headers to response
    const response = await this.app.handleLambda(event);
    
    if (isColdStart && response.headers) {
      response.headers['X-Cold-Start'] = 'true';
      response.headers['X-Init-Time'] = (Date.now() - this.initTime).toString();
    }

    return response;
  }

  /**
   * Check if event is a warm-up event
   * @param {Object} event - Lambda event
   * @returns {boolean} - True if warm-up event
   */
  isWarmupEvent(event) {
    // Check various warm-up event formats
    if (event.source === 'serverless-plugin-warmup') {
      return true;
    }
    
    if (event.warmup === true || event['serverless-plugin-warmup']) {
      return true;
    }
    
    // Check if it's a warm-up HTTP request
    if (event.httpMethod === 'GET' && 
        (event.path === this.warmupPath || event.rawPath === this.warmupPath)) {
      return true;
    }
    
    return false;
  }

  /**
   * Handle warm-up event
   * @returns {Object} - Warm-up response
   */
  handleWarmup() {
    // Mark as warm
    this.isWarm = true;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'warmed',
        invocationCount: this.invocationCount,
        coldStartCount: this.coldStartCount,
      }),
    };
  }

  /**
   * Get handler statistics
   * @returns {Object} - Handler statistics
   */
  getStats() {
    return {
      isWarm: this.isWarm,
      invocationCount: this.invocationCount,
      coldStartCount: this.coldStartCount,
      initTime: this.initTime,
      uptime: Date.now() - this.initTime,
    };
  }

  /**
   * Reset handler state (useful for testing)
   */
  reset() {
    this.isWarm = false;
    this.invocationCount = 0;
    this.coldStartCount = 0;
    this.initTime = Date.now();
  }
}

module.exports = LambdaHandler;

