/**
 * Unified response helper for Node.js HTTP and AWS Lambda
 */

/**
 * Send a unified response
 * @param {Object} context - Response context (res for Node.js, or Lambda context)
 * @param {number} statusCode - HTTP status code
 * @param {Object|string} data - Response data
 * @param {boolean} isLambda - Whether this is a Lambda invocation
 */
function sendResponse(context, statusCode, data, isLambda = false) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  
  if (isLambda) {
    // Lambda response format
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    };
  } else {
    // Node.js HTTP response
    context.writeHead(statusCode, {
      'Content-Type': 'application/json',
    });
    context.end(body);
  }
}

/**
 * Success response helper
 */
function success(context, data, statusCode = 200, isLambda = false) {
  return sendResponse(context, statusCode, data, isLambda);
}

/**
 * Error response helper
 */
function error(context, message, statusCode = 500, isLambda = false) {
  return sendResponse(
    context,
    statusCode,
    { error: message },
    isLambda
  );
}

module.exports = {
  sendResponse,
  success,
  error,
};