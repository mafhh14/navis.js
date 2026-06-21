/**
 * Unified response helper for Node.js HTTP and AWS Lambda
 */

/**
 * Detect Navis Lambda mock response object (used by handleLambda)
 * @param {Object} context
 * @returns {boolean}
 */
function isNavisLambdaRes(context) {
  return context && context._navisLambda === true;
}

/**
 * Send a unified response
 * @param {Object} context - Response context (res for Node.js, Navis Lambda res, or unused for API Gateway return)
 * @param {number} statusCode - HTTP status code
 * @param {Object|string} data - Response data
 * @param {boolean} isLambda - Return API Gateway response object when true and context is not Navis Lambda res
 */
function sendResponse(context, statusCode, data, isLambda = false) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  const bodyObject = typeof data === 'string' ? JSON.parse(data) : data;

  if (isLambda && !isNavisLambdaRes(context)) {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    };
  }

  if (isNavisLambdaRes(context)) {
    context.statusCode = statusCode;
    context.headers = {
      ...context.headers,
      'Content-Type': 'application/json',
    };
    context.body = bodyObject;
    return context;
  }

  context.writeHead(statusCode, {
    'Content-Type': 'application/json',
  });
  context.end(body);
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
  isNavisLambdaRes,
};
