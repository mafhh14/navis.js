/**
 * File Upload Middleware
 * v5.1: Multipart form data and file upload handling
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * File upload middleware
 * @param {Object} options - Upload options
 * @returns {Function} - Middleware function
 */
function upload(options = {}) {
  const {
    dest = '/tmp/uploads',
    limits = {
      fileSize: 5 * 1024 * 1024, // 5MB default
      files: 10, // Max 10 files
    },
    fileFilter = null, // Function to filter files
    preserveExtension = true,
    generateFilename = (file) => {
      // Generate unique filename
      const ext = preserveExtension ? path.extname(file.originalName || '') : '';
      return `${crypto.randomBytes(16).toString('hex')}${ext}`;
    },
  } = options;

  // Ensure destination directory exists
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  return async (req, res, next) => {
    // Check content type
    const contentType = req.headers['content-type'] || req.headers['Content-Type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return next();
    }

    // Parse multipart form data (simplified implementation)
    // In production, use a library like busboy or multer
    try {
      req.files = [];
      req.body = req.body || {};

      // For Lambda, body is already parsed
      if (req.event && req.event.isBase64Encoded) {
        // Handle base64 encoded body
        const body = Buffer.from(req.event.body, 'base64').toString();
        // Parse multipart data (simplified)
        // In production, use proper multipart parser
      }

      // For Node.js HTTP, parse from request stream
      if (req.on && typeof req.on === 'function') {
        await parseMultipart(req, dest, limits, fileFilter, generateFilename, (files, fields) => {
          req.files = files;
          req.body = { ...req.body, ...fields };
        });
      }

      next();
    } catch (error) {
      res.statusCode = 400;
      res.body = { error: error.message || 'File upload failed' };
    }
  };
}

/**
 * Parse multipart form data (simplified)
 * @private
 */
function parseMultipart(req, dest, limits, fileFilter, generateFilename, callback) {
  return new Promise((resolve, reject) => {
    const files = [];
    const fields = {};
    let totalSize = 0;
    let fileCount = 0;

    // Simplified multipart parser
    // In production, use busboy or multer
    let buffer = '';
    
    req.on('data', (chunk) => {
      buffer += chunk.toString();
      totalSize += chunk.length;

      if (totalSize > limits.fileSize) {
        reject(new Error('File size exceeds limit'));
        return;
      }
    });

    req.on('end', () => {
      // Basic multipart parsing (simplified)
      // This is a placeholder - in production use proper parser
      try {
        callback(files, fields);
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

/**
 * Save uploaded file
 * @param {Object} file - File object
 * @param {string} dest - Destination directory
 * @param {Function} generateFilename - Filename generator
 * @returns {Promise<string>} - File path
 */
async function saveFile(file, dest, generateFilename) {
  const filename = generateFilename(file);
  const filepath = path.join(dest, filename);

  // Ensure directory exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write file
  if (file.buffer) {
    fs.writeFileSync(filepath, file.buffer);
  } else if (file.stream) {
    // Handle stream
    const writeStream = fs.createWriteStream(filepath);
    file.stream.pipe(writeStream);
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  return filepath;
}

module.exports = {
  upload,
  saveFile,
};

