/**
 * Request Validation Middleware
 * v4: Schema-based request validation
 */

class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

/**
 * Validate request against schema
 * @param {Object} schema - Validation schema
 * @returns {Function} - Middleware function
 */
function validate(schema) {
  return async (req, res, next) => {
    try {
      const errors = [];

      // Validate body
      if (schema.body) {
        const bodyErrors = validateObject(req.body || {}, schema.body);
        if (bodyErrors.length > 0) {
          errors.push(...bodyErrors.map(e => ({ field: `body.${e.field}`, ...e })));
        }
      }

      // Validate query parameters
      if (schema.query) {
        const queryErrors = validateObject(req.query || {}, schema.query);
        if (queryErrors.length > 0) {
          errors.push(...queryErrors.map(e => ({ field: `query.${e.field}`, ...e })));
        }
      }

      // Validate path parameters
      if (schema.params) {
        const paramsErrors = validateObject(req.params || {}, schema.params);
        if (paramsErrors.length > 0) {
          errors.push(...paramsErrors.map(e => ({ field: `params.${e.field}`, ...e })));
        }
      }

      // Validate headers
      if (schema.headers) {
        const headersErrors = validateObject(req.headers || {}, schema.headers);
        if (headersErrors.length > 0) {
          errors.push(...headersErrors.map(e => ({ field: `headers.${e.field}`, ...e })));
        }
      }

      if (errors.length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        res.statusCode = error.statusCode;
        res.body = {
          error: error.message,
          errors: error.errors,
        };
        return;
      }
      throw error;
    }
  };
}

/**
 * Validate object against schema
 * @private
 */
function validateObject(obj, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = obj[field];
    const fieldErrors = validateField(field, value, rules);
    errors.push(...fieldErrors);
  }

  return errors;
}

/**
 * Validate a single field
 * @private
 */
function validateField(field, value, rules) {
  const errors = [];

  // Required check
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push({
      field,
      message: `${field} is required`,
      code: 'REQUIRED',
    });
    return errors; // Don't check other rules if required fails
  }

  // Skip other validations if value is optional and not provided
  if (!rules.required && (value === undefined || value === null)) {
    return errors;
  }

  // Type check
  if (rules.type) {
    const typeError = checkType(field, value, rules.type);
    if (typeError) {
      errors.push(typeError);
      return errors; // Don't check other rules if type fails
    }
  }

  // String validations
  if (rules.type === 'string') {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      errors.push({
        field,
        message: `${field} must be at least ${rules.minLength} characters`,
        code: 'MIN_LENGTH',
      });
    }
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      errors.push({
        field,
        message: `${field} must be at most ${rules.maxLength} characters`,
        code: 'MAX_LENGTH',
      });
    }
    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      errors.push({
        field,
        message: `${field} does not match required pattern`,
        code: 'PATTERN',
      });
    }
    if (rules.format === 'email' && !isValidEmail(value)) {
      errors.push({
        field,
        message: `${field} must be a valid email address`,
        code: 'EMAIL_FORMAT',
      });
    }
    if (rules.format === 'uuid' && !isValidUUID(value)) {
      errors.push({
        field,
        message: `${field} must be a valid UUID`,
        code: 'UUID_FORMAT',
      });
    }
  }

  // Number validations
  if (rules.type === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push({
        field,
        message: `${field} must be at least ${rules.min}`,
        code: 'MIN',
      });
    }
    if (rules.max !== undefined && value > rules.max) {
      errors.push({
        field,
        message: `${field} must be at most ${rules.max}`,
        code: 'MAX',
      });
    }
  }

  // Array validations
  if (rules.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push({
        field,
        message: `${field} must be an array`,
        code: 'TYPE',
      });
    } else {
      if (rules.minItems !== undefined && value.length < rules.minItems) {
        errors.push({
          field,
          message: `${field} must have at least ${rules.minItems} items`,
          code: 'MIN_ITEMS',
        });
      }
      if (rules.maxItems !== undefined && value.length > rules.maxItems) {
        errors.push({
          field,
          message: `${field} must have at most ${rules.maxItems} items`,
          code: 'MAX_ITEMS',
        });
      }
    }
  }

  // Custom validator
  if (rules.validator && typeof rules.validator === 'function') {
    try {
      const result = rules.validator(value);
      if (result !== true && typeof result === 'string') {
        errors.push({
          field,
          message: result,
          code: 'CUSTOM',
        });
      }
    } catch (error) {
      errors.push({
        field,
        message: error.message || 'Custom validation failed',
        code: 'CUSTOM',
      });
    }
  }

  return errors;
}

/**
 * Check if value matches expected type
 * @private
 */
function checkType(field, value, expectedType) {
  const actualType = typeof value;

  if (expectedType === 'string' && actualType !== 'string') {
    return {
      field,
      message: `${field} must be a string`,
      code: 'TYPE',
    };
  }

  if (expectedType === 'number' && actualType !== 'number') {
    return {
      field,
      message: `${field} must be a number`,
      code: 'TYPE',
    };
  }

  if (expectedType === 'boolean' && actualType !== 'boolean') {
    return {
      field,
      message: `${field} must be a boolean`,
      code: 'TYPE',
    };
  }

  if (expectedType === 'array' && !Array.isArray(value)) {
    return {
      field,
      message: `${field} must be an array`,
      code: 'TYPE',
    };
  }

  if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(value) || value === null)) {
    return {
      field,
      message: `${field} must be an object`,
      code: 'TYPE',
    };
  }

  return null;
}

/**
 * Validate email format
 * @private
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 * @private
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

module.exports = {
  validate,
  ValidationError,
};

