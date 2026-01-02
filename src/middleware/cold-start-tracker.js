/**
 * Cold Start Tracker Middleware
 * v3.1: Track and log cold start metrics
 */

let isFirstInvocation = true;
let initTime = Date.now();

/**
 * Cold start tracking middleware
 * Tracks cold starts and adds headers to response
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
function coldStartTracker(req, res, next) {
  if (isFirstInvocation) {
    const coldStartDuration = Date.now() - initTime;
    
    // Add cold start info to response headers
    if (res.headers) {
      res.headers['X-Cold-Start'] = 'true';
      res.headers['X-Cold-Start-Duration'] = coldStartDuration.toString();
    }
    
    // Log cold start (structured logging)
    console.log(JSON.stringify({
      type: 'cold-start',
      duration: coldStartDuration,
      path: req.path || req.url,
      method: req.method,
    }));
    
    isFirstInvocation = false;
  } else {
    if (res.headers) {
      res.headers['X-Cold-Start'] = 'false';
    }
  }
  
  next();
}

/**
 * Reset cold start tracker (useful for testing)
 */
function resetColdStartTracker() {
  isFirstInvocation = true;
  initTime = Date.now();
}

module.exports = {
  coldStartTracker,
  resetColdStartTracker,
};

