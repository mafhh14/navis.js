/**
 * GraphQL Resolver Utilities
 * Helper functions for building GraphQL resolvers
 */

/**
 * Create a resolver function
 */
function createResolver(resolverFn, options = {}) {
  const {
    validate = null,
    authorize = null,
    cache = null,
    errorHandler = null,
  } = options;

  return async (variables, context, fields) => {
    try {
      // Authorization check
      if (authorize) {
        const authorized = await authorize(context);
        if (!authorized) {
          throw new Error('Unauthorized');
        }
      }

      // Validation
      if (validate) {
        const validationResult = await validate(variables);
        if (!validationResult.valid) {
          throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
        }
      }

      // Cache check
      if (cache && cache.get) {
        const cacheKey = cache.key ? cache.key(variables, context) : null;
        if (cacheKey) {
          const cached = await cache.get(cacheKey);
          if (cached !== null && cached !== undefined) {
            return cached;
          }
        }
      }

      // Execute resolver
      const result = await resolverFn(variables, context, fields);

      // Cache result
      if (cache && cache.set && cache.key) {
        const cacheKey = cache.key(variables, context);
        await cache.set(cacheKey, result, cache.ttl || 3600);
      }

      return result;
    } catch (error) {
      if (errorHandler) {
        return await errorHandler(error, variables, context);
      }
      throw error;
    }
  };
}

/**
 * Create a field resolver
 */
function fieldResolver(fieldName, resolverFn) {
  return {
    [fieldName]: resolverFn,
  };
}

/**
 * Combine multiple resolvers
 */
function combineResolvers(...resolvers) {
  const combined = {
    Query: {},
    Mutation: {},
  };

  resolvers.forEach(resolver => {
    if (resolver.Query) {
      Object.assign(combined.Query, resolver.Query);
    }
    if (resolver.Mutation) {
      Object.assign(combined.Mutation, resolver.Mutation);
    }
    // Also support flat resolver structure
    Object.keys(resolver).forEach(key => {
      if (key !== 'Query' && key !== 'Mutation') {
        combined.Query[key] = resolver[key];
      }
    });
  });

  return combined;
}

/**
 * Create async resolver with retry logic
 */
function createAsyncResolver(resolverFn, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryCondition = null,
  } = options;

  return async (variables, context, fields) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await resolverFn(variables, context, fields);
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt < maxRetries) {
          if (retryCondition && !retryCondition(error)) {
            throw error;
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }
    
    throw lastError;
  };
}

/**
 * Create batch resolver (for N+1 query problem)
 */
function createBatchResolver(resolverFn, options = {}) {
  const {
    batchKey = (variables) => JSON.stringify(variables),
    batchSize = 100,
    waitTime = 10,
  } = options;

  let batch = [];
  let batchTimer = null;

  const processBatch = async () => {
    if (batch.length === 0) return;

    const currentBatch = batch.splice(0, batchSize);
    batchTimer = null;

    // Group by batch key
    const groups = {};
    currentBatch.forEach(({ variables, context, fields, resolve, reject }) => {
      const key = batchKey(variables);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push({ variables, context, fields, resolve, reject });
    });

    // Execute each group
    Object.keys(groups).forEach(async key => {
      const group = groups[key];
      try {
        const result = await resolverFn(group[0].variables, group[0].context, group[0].fields);
        group.forEach(({ resolve }) => resolve(result));
      } catch (error) {
        group.forEach(({ reject }) => reject(error));
      }
    });
  };

  return async (variables, context, fields) => {
    return new Promise((resolve, reject) => {
      batch.push({ variables, context, fields, resolve, reject });

      if (!batchTimer) {
        batchTimer = setTimeout(processBatch, waitTime);
      }

      if (batch.length >= batchSize) {
        clearTimeout(batchTimer);
        processBatch();
      }
    });
  };
}

module.exports = {
  createResolver,
  fieldResolver,
  combineResolvers,
  createAsyncResolver,
  createBatchResolver,
};

