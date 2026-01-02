/**
 * Circuit Breaker - Prevents cascading failures in microservices
 * v2: Circuit breaker pattern implementation
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5; // Open circuit after 5 failures
    this.resetTimeout = options.resetTimeout || 60000; // 60 seconds
    this.monitoringWindow = options.monitoringWindow || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Record a successful request
   */
  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) {
        // Reset to CLOSED after 2 successes in HALF_OPEN
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0; // Reset failure count on success
    }
  }

  /**
   * Record a failed request
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      // Open the circuit
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
    } else if (this.state === 'HALF_OPEN') {
      // Failed in half-open, go back to open
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      this.successCount = 0;
    }
  }

  /**
   * Check if request should be allowed
   * @returns {boolean} - true if request should proceed
   */
  canAttempt() {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttemptTime) {
        // Transition to HALF_OPEN
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        return true;
      }
      return false; // Circuit is open, reject request
    }

    if (this.state === 'HALF_OPEN') {
      return true; // Allow limited requests in half-open state
    }

    return false;
  }

  /**
   * Get current circuit state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
}

module.exports = CircuitBreaker;

