/**
 * Retry utility with exponential backoff
 * v2: Retry logic for resilient service calls
 */

/**
 * Sleep for specified milliseconds
 * @private
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} maxDelay - Maximum delay in milliseconds
 * @param {number} jitter - Random jitter factor (0-1)
 */
function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 30000, jitter = 0.1) {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitterAmount = exponentialDelay * jitter * Math.random();
  return Math.floor(exponentialDelay + jitterAmount);
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry (must return a Promise)
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 30000)
 * @param {number} options.jitter - Jitter factor 0-1 (default: 0.1)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried (default: retry on all errors)
 * @returns {Promise} - Result of the function
 */
async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    jitter = 0.1,
    shouldRetry = () => true, // Retry on all errors by default
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delay = calculateBackoff(attempt, baseDelay, maxDelay, jitter);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Check if HTTP status code should be retried
 * @param {number} statusCode - HTTP status code
 * @returns {boolean} - true if status code should be retried
 */
function shouldRetryHttpStatus(statusCode) {
  // Retry on 5xx errors and 429 (Too Many Requests)
  return statusCode >= 500 || statusCode === 429;
}

module.exports = {
  retry,
  calculateBackoff,
  shouldRetryHttpStatus,
  sleep,
};

