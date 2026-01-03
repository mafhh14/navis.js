/**
 * GraphQL Server for Navis.js
 * Lightweight GraphQL implementation for serverless and microservice architectures
 */

class GraphQLError extends Error {
  constructor(message, code = 'INTERNAL_ERROR', extensions = {}) {
    super(message);
    this.name = 'GraphQLError';
    this.code = code;
    this.extensions = extensions;
  }
}

/**
 * GraphQL Server
 */
class GraphQLServer {
  constructor(options = {}) {
    this.schema = options.schema || null;
    this.resolvers = options.resolvers || {};
    this.context = options.context || (() => ({}));
    this.formatError = options.formatError || this._defaultFormatError;
    this.introspection = options.introspection !== false; // Enable by default
  }

  /**
   * Create GraphQL handler middleware
   * @param {Object} options - Handler options
   * @returns {Function} - Middleware function
   */
  handler(options = {}) {
    const path = options.path || '/graphql';
    const method = options.method || 'POST';
    const enableGET = options.enableGET !== false; // Enable GET by default

    return async (req, res, next) => {
      // Check if this is a GraphQL request
      const isGraphQLPath = req.path === path || req.url?.startsWith(path);
      if (!isGraphQLPath) {
        return next();
      }

      // Check method
      if (req.method === method || (enableGET && req.method === 'GET')) {
        try {
          // Parse GraphQL request
          const graphqlRequest = await this._parseRequest(req, enableGET);
          
          // Execute GraphQL query
          const result = await this._execute(graphqlRequest, req);
          
          // Send response
          this._sendResponse(res, result);
        } catch (error) {
          this._sendError(res, error);
        }
      } else {
        next();
      }
    };
  }

  /**
   * Parse GraphQL request from HTTP request
   * @private
   */
  async _parseRequest(req, enableGET) {
    let query = null;
    let variables = {};
    let operationName = null;

    if (req.method === 'GET') {
      // Parse from query string
      query = req.query.query || req.query.q;
      variables = req.query.variables ? JSON.parse(req.query.variables) : {};
      operationName = req.query.operationName || null;
    } else {
      // Parse from body
      let body = req.body;
      
      // If body is string, parse it
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          throw new GraphQLError('Invalid JSON in request body', 'BAD_REQUEST');
        }
      }

      query = body.query;
      variables = body.variables || {};
      operationName = body.operationName || null;
    }

    if (!query) {
      throw new GraphQLError('GraphQL query is required', 'BAD_REQUEST');
    }

    return { query, variables, operationName };
  }

  /**
   * Execute GraphQL query
   * @private
   */
  async _execute(request, httpReq) {
    const { query, variables, operationName } = request;

    // Build context
    const context = await this._buildContext(httpReq);

    try {
      // Simple query execution (without full GraphQL parser)
      // This is a lightweight implementation
      const result = await this._executeQuery(query, variables, operationName, context);
      return { data: result, errors: null };
    } catch (error) {
      return {
        data: null,
        errors: [this.formatError(error)],
      };
    }
  }

  /**
   * Execute GraphQL query (simplified implementation)
   * @private
   */
  async _executeQuery(query, variables, operationName, context) {
    // Parse operation type and name
    const operation = this._parseOperation(query, operationName);
    
    if (!operation) {
      throw new GraphQLError('Invalid GraphQL query', 'BAD_REQUEST');
    }

    // Execute based on operation type
    if (operation.type === 'query') {
      return await this._executeQueryOperation(operation, variables, context);
    } else if (operation.type === 'mutation') {
      return await this._executeMutationOperation(operation, variables, context);
    } else {
      throw new GraphQLError(`Unsupported operation type: ${operation.type}`, 'BAD_REQUEST');
    }
  }

  /**
   * Parse GraphQL operation (simplified)
   * @private
   */
  _parseOperation(query, operationName) {
    // Simple regex-based parsing (for lightweight implementation)
    // In production, use a proper GraphQL parser like graphql-js
    
    const queryMatch = query.match(/^\s*(query|mutation|subscription)\s+(\w+)?/i);
    if (!queryMatch) {
      // Try to find operation by name
      if (operationName) {
        const namedMatch = query.match(new RegExp(`(query|mutation|subscription)\\s+${operationName}`, 'i'));
        if (namedMatch) {
          return {
            type: namedMatch[1].toLowerCase(),
            name: operationName,
            query,
          };
        }
      }
      return null;
    }

    return {
      type: queryMatch[1].toLowerCase(),
      name: queryMatch[2] || operationName || 'default',
      query,
    };
  }

  /**
   * Execute query operation
   * @private
   */
  async _executeQueryOperation(operation, variables, context) {
    const { name, query } = operation;
    
    // Get resolver for this query
    const resolver = this.resolvers.Query?.[name] || this.resolvers[name];
    
    if (!resolver) {
      throw new GraphQLError(`Resolver not found for query: ${name}`, 'RESOLVER_NOT_FOUND');
    }

    // Extract field selections (simplified)
    const fields = this._extractFields(query);
    
    // Execute resolver
    const result = await this._executeResolver(resolver, variables, context, fields);
    
    return { [name]: result };
  }

  /**
   * Execute mutation operation
   * @private
   */
  async _executeMutationOperation(operation, variables, context) {
    const { name, query } = operation;
    
    // Get resolver for this mutation
    const resolver = this.resolvers.Mutation?.[name] || this.resolvers[name];
    
    if (!resolver) {
      throw new GraphQLError(`Resolver not found for mutation: ${name}`, 'RESOLVER_NOT_FOUND');
    }

    // Extract field selections (simplified)
    const fields = this._extractFields(query);
    
    // Execute resolver
    const result = await this._executeResolver(resolver, variables, context, fields);
    
    return { [name]: result };
  }

  /**
   * Execute resolver function
   * @private
   */
  async _executeResolver(resolver, variables, context, fields) {
    if (typeof resolver === 'function') {
      return await resolver(variables, context, fields);
    } else if (typeof resolver === 'object' && resolver.resolve) {
      return await resolver.resolve(variables, context, fields);
    } else {
      throw new GraphQLError('Invalid resolver', 'INVALID_RESOLVER');
    }
  }

  /**
   * Extract fields from GraphQL query (simplified)
   * @private
   */
  _extractFields(query) {
    // Simple field extraction (for lightweight implementation)
    // In production, use proper GraphQL AST parser
    const fieldMatch = query.match(/\{\s*([^}]+)\s*\}/);
    if (fieldMatch) {
      return fieldMatch[1]
        .split(/\s+/)
        .filter(f => f && !f.startsWith('('))
        .map(f => f.replace(/[,\n\r]/g, '').trim())
        .filter(f => f);
    }
    return [];
  }

  /**
   * Build context for GraphQL execution
   * @private
   */
  async _buildContext(httpReq) {
    const baseContext = {
      req: httpReq,
      headers: httpReq.headers || {},
      query: httpReq.query || {},
      params: httpReq.params || {},
    };

    if (typeof this.context === 'function') {
      const customContext = await this.context(httpReq);
      return { ...baseContext, ...customContext };
    }

    return baseContext;
  }

  /**
   * Send GraphQL response
   * @private
   */
  _sendResponse(res, result) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    
    if (res.end) {
      res.end(JSON.stringify(result));
    } else {
      res.body = result;
    }
  }

  /**
   * Send GraphQL error response
   * @private
   */
  _sendError(res, error) {
    const formatted = this.formatError(error);
    
    res.statusCode = error.code === 'BAD_REQUEST' ? 400 : 
                     error.code === 'UNAUTHORIZED' ? 401 :
                     error.code === 'FORBIDDEN' ? 403 :
                     error.code === 'NOT_FOUND' ? 404 : 500;
    res.setHeader('Content-Type', 'application/json');
    
    const response = {
      data: null,
      errors: [formatted],
    };

    if (res.end) {
      res.end(JSON.stringify(response));
    } else {
      res.body = response;
    }
  }

  /**
   * Default error formatter
   * @private
   */
  _defaultFormatError(error) {
    if (error instanceof GraphQLError) {
      return {
        message: error.message,
        code: error.code,
        extensions: error.extensions,
      };
    }

    return {
      message: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Create GraphQL server instance
 * @param {Object} options - Server options
 * @returns {GraphQLServer} - GraphQL server instance
 */
function createGraphQLServer(options = {}) {
  return new GraphQLServer(options);
}

/**
 * GraphQL handler middleware factory
 * @param {Object} options - Handler options
 * @returns {Function} - Middleware function
 */
function graphql(options = {}) {
  const server = new GraphQLServer(options);
  return server.handler();
}

module.exports = {
  GraphQLServer,
  GraphQLError,
  createGraphQLServer,
  graphql,
};

