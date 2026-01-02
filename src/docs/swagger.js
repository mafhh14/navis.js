/**
 * OpenAPI/Swagger Documentation Generator
 * v5.1: Auto-generate OpenAPI 3.0 specification
 */

class SwaggerGenerator {
  constructor(options = {}) {
    this.info = {
      title: options.title || 'Navis.js API',
      version: options.version || '1.0.0',
      description: options.description || '',
      ...options.info,
    };
    this.servers = options.servers || [{ url: '/', description: 'Default server' }];
    this.paths = {};
    this.components = {
      schemas: {},
      securitySchemes: {},
    };
    this.tags = options.tags || [];
    this.basePath = options.basePath || '/';
  }

  /**
   * Add a route to the specification
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @param {Object} spec - OpenAPI operation spec
   */
  addRoute(method, path, spec = {}) {
    const normalizedPath = this._normalizePath(path);
    
    if (!this.paths[normalizedPath]) {
      this.paths[normalizedPath] = {};
    }

    this.paths[normalizedPath][method.toLowerCase()] = {
      summary: spec.summary || '',
      description: spec.description || '',
      tags: spec.tags || [],
      parameters: spec.parameters || [],
      requestBody: spec.requestBody || null,
      responses: spec.responses || {
        '200': { description: 'Success' },
      },
      security: spec.security || [],
      ...spec,
    };
  }

  /**
   * Add a schema component
   * @param {string} name - Schema name
   * @param {Object} schema - JSON Schema
   */
  addSchema(name, schema) {
    this.components.schemas[name] = schema;
  }

  /**
   * Add a security scheme
   * @param {string} name - Security scheme name
   * @param {Object} scheme - Security scheme
   */
  addSecurityScheme(name, scheme) {
    this.components.securitySchemes[name] = scheme;
  }

  /**
   * Generate OpenAPI specification
   * @returns {Object} - OpenAPI 3.0 specification
   */
  generate() {
    return {
      openapi: '3.0.0',
      info: this.info,
      servers: this.servers,
      paths: this.paths,
      components: this.components,
      tags: this.tags,
    };
  }

  /**
   * Generate JSON string
   * @returns {string} - JSON string
   */
  toJSON() {
    return JSON.stringify(this.generate(), null, 2);
  }

  /**
   * Normalize path for OpenAPI (convert :param to {param})
   * @private
   */
  _normalizePath(path) {
    return path.replace(/:([^/]+)/g, '{$1}');
  }
}

/**
 * Swagger middleware
 * @param {Object} options - Swagger options
 * @returns {Function} - Middleware function
 */
function swagger(options = {}) {
  const {
    title = 'Navis.js API',
    version = '1.0.0',
    description = '',
    path = '/swagger.json',
    uiPath = '/docs',
    servers = [],
    tags = [],
  } = options;

  const generator = new SwaggerGenerator({
    title,
    version,
    description,
    servers,
    tags,
  });

  // Add default security schemes
  generator.addSecurityScheme('bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  return {
    generator,
    middleware: async (req, res, next) => {
      const requestPath = req.path || req.url;

      // Serve OpenAPI JSON
      if (requestPath === path) {
        res.statusCode = 200;
        res.headers = res.headers || {};
        res.headers['Content-Type'] = 'application/json';
        res.body = generator.generate();
        return;
      }

      // Serve Swagger UI (basic HTML)
      if (requestPath === uiPath) {
        const spec = generator.toJSON();
        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${title} - API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '${path}',
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.presets.standalone
      ]
    });
  </script>
</body>
</html>
        `;
        res.statusCode = 200;
        res.headers = res.headers || {};
        res.headers['Content-Type'] = 'text/html';
        res.body = html;
        return;
      }

      next();
    },
  };
}

module.exports = {
  SwaggerGenerator,
  swagger,
};

