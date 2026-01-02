/**
 * Structured Logger
 * v3: Logging with levels and structured output
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

class Logger {
  constructor(options = {}) {
    const level = options.level || process.env.LOG_LEVEL || 'INFO';
    this.level = level;
    this.levelValue = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
    this.format = options.format || 'json'; // 'json' or 'text'
    this.enableColors = options.enableColors !== false;
    this.context = options.context || {};
  }

  /**
   * Log a message
   * @private
   */
  _log(level, message, data = {}) {
    const levelValue = LOG_LEVELS[level];
    if (levelValue < this.levelValue) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };

    if (this.format === 'json') {
      console.log(JSON.stringify(logEntry));
    } else {
      const color = this._getColor(level);
      const reset = this.enableColors ? '\x1b[0m' : '';
      const coloredLevel = this.enableColors ? `${color}${level}${reset}` : level;
      console.log(`[${logEntry.timestamp}] ${coloredLevel}: ${message}`, data);
    }
  }

  /**
   * Get color for log level
   * @private
   */
  _getColor(level) {
    if (!this.enableColors) return '';
    
    const colors = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      FATAL: '\x1b[35m', // Magenta
    };
    return colors[level] || '';
  }

  /**
   * Debug log
   */
  debug(message, data = {}) {
    this._log('DEBUG', message, data);
  }

  /**
   * Info log
   */
  info(message, data = {}) {
    this._log('INFO', message, data);
  }

  /**
   * Warning log
   */
  warn(message, data = {}) {
    this._log('WARN', message, data);
  }

  /**
   * Error log
   */
  error(message, error = null, data = {}) {
    const errorData = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    } : {};
    this._log('ERROR', message, { ...errorData, ...data });
  }

  /**
   * Fatal log
   */
  fatal(message, error = null, data = {}) {
    const errorData = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    } : {};
    this._log('FATAL', message, { ...errorData, ...data });
  }

  /**
   * Create child logger with additional context
   */
  child(context) {
    return new Logger({
      level: this.level,
      format: this.format,
      enableColors: this.enableColors,
      context: { ...this.context, ...context },
    });
  }

  /**
   * Set log level
   */
  setLevel(level) {
    const upperLevel = level.toUpperCase();
    this.level = upperLevel;
    this.levelValue = LOG_LEVELS[upperLevel] !== undefined ? LOG_LEVELS[upperLevel] : LOG_LEVELS.INFO;
  }
}

module.exports = Logger;

