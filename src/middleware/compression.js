/**
 * Response Compression Middleware
 * v5: Gzip and Brotli compression support
 */

const zlib = require('zlib');

/**
 * Compression middleware
 * @param {Object} options - Compression options
 * @returns {Function} - Middleware function
 */
function compress(options = {}) {
  const {
    level = 6, // Compression level (1-9)
    threshold = 1024, // Minimum size to compress (bytes)
    algorithm = 'gzip', // 'gzip' or 'brotli'
    filter = (req, res) => {
      // Default: compress JSON and text responses
      const contentType = res.headers?.['content-type'] || '';
      return contentType.includes('application/json') ||
             contentType.includes('text/') ||
             contentType.includes('application/javascript');
    },
  } = options;

  return async (req, res, next) => {
    // Store original body setter
    const originalBody = res.body;
    const originalEnd = res.end || (() => {});

    // Wrap response to compress before sending
    res.end = function(...args) {
      // Check if should compress
      if (!filter(req, res)) {
        return originalEnd.apply(this, args);
      }

      // Get response body
      let body = res.body;
      if (typeof body === 'object') {
        body = JSON.stringify(body);
      } else if (typeof body !== 'string') {
        body = String(body);
      }

      // Check threshold
      if (Buffer.byteLength(body, 'utf8') < threshold) {
        return originalEnd.apply(this, args);
      }

      // Check if client supports compression
      const acceptEncoding = req.headers['accept-encoding'] || req.headers['Accept-Encoding'] || '';
      const supportsGzip = acceptEncoding.includes('gzip');
      const supportsBrotli = acceptEncoding.includes('br');

      // Choose compression algorithm
      let compressed;
      let encoding;

      if (algorithm === 'brotli' && supportsBrotli) {
        try {
          compressed = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level } });
          encoding = 'br';
        } catch (error) {
          // Fallback to gzip if brotli fails
          compressed = zlib.gzipSync(body, { level });
          encoding = 'gzip';
        }
      } else if (supportsGzip) {
        compressed = zlib.gzipSync(body, { level });
        encoding = 'gzip';
      } else {
        // No compression support
        return originalEnd.apply(this, args);
      }

      // Set compression headers
      res.headers = res.headers || {};
      res.headers['Content-Encoding'] = encoding;
      res.headers['Vary'] = 'Accept-Encoding';
      
      // Update content length
      res.headers['Content-Length'] = compressed.length.toString();

      // Update body with compressed data
      res.body = compressed;

      return originalEnd.apply(this, args);
    };

    next();
  };
}

module.exports = compress;

