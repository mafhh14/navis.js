/**
 * GraphQL Schema Utilities
 * Lightweight schema definition helpers
 */

/**
 * GraphQL Schema Builder
 */
class GraphQLSchema {
  constructor() {
    this.types = {};
    this.queries = {};
    this.mutations = {};
    this.subscriptions = {};
  }

  /**
   * Define a type
   */
  type(name, definition) {
    this.types[name] = definition;
    return this;
  }

  /**
   * Define a query
   */
  query(name, definition) {
    this.queries[name] = definition;
    return this;
  }

  /**
   * Define a mutation
   */
  mutation(name, definition) {
    this.mutations[name] = definition;
    return this;
  }

  /**
   * Build schema string (GraphQL SDL format)
   */
  build() {
    let schema = '';

    // Build type definitions
    Object.keys(this.types).forEach(name => {
      schema += this._buildType(name, this.types[name]);
    });

    // Build Query type
    if (Object.keys(this.queries).length > 0) {
      schema += '\ntype Query {\n';
      Object.keys(this.queries).forEach(name => {
        schema += `  ${name}${this._buildFieldDefinition(this.queries[name])}\n`;
      });
      schema += '}\n';
    }

    // Build Mutation type
    if (Object.keys(this.mutations).length > 0) {
      schema += '\ntype Mutation {\n';
      Object.keys(this.mutations).forEach(name => {
        schema += `  ${name}${this._buildFieldDefinition(this.mutations[name])}\n`;
      });
      schema += '}\n';
    }

    return schema;
  }

  /**
   * Build type definition
   * @private
   */
  _buildType(name, definition) {
    if (typeof definition === 'string') {
      return `type ${name} ${definition}\n`;
    }

    let typeDef = `type ${name} {\n`;
    if (typeof definition === 'object') {
      Object.keys(definition).forEach(field => {
        typeDef += `  ${field}: ${definition[field]}\n`;
      });
    }
    typeDef += '}\n';
    return typeDef;
  }

  /**
   * Build field definition
   * @private
   */
  _buildFieldDefinition(definition) {
    if (typeof definition === 'string') {
      return `: ${definition}`;
    }

    if (typeof definition === 'object' && definition.type) {
      let def = '(';
      if (definition.args && Object.keys(definition.args).length > 0) {
        const args = Object.keys(definition.args).map(arg => {
          return `${arg}: ${definition.args[arg]}`;
        }).join(', ');
        def += args;
      }
      def += `): ${definition.type}`;
      return def;
    }

    return ': String';
  }
}

/**
 * Create schema builder
 */
function createSchema() {
  return new GraphQLSchema();
}

/**
 * Define GraphQL type
 */
function type(name, definition) {
  const schema = new GraphQLSchema();
  return schema.type(name, definition);
}

/**
 * Common GraphQL scalar types
 */
const scalars = {
  String: 'String',
  Int: 'Int',
  Float: 'Float',
  Boolean: 'Boolean',
  ID: 'ID',
};

/**
 * Common GraphQL type helpers
 */
const types = {
  /**
   * Create input type definition
   */
  input(name, fields) {
    let input = `input ${name} {\n`;
    Object.keys(fields).forEach(field => {
      input += `  ${field}: ${fields[field]}\n`;
    });
    input += '}';
    return input;
  },

  /**
   * Create list type
   */
  list(type) {
    return `[${type}]`;
  },

  /**
   * Create non-null type
   */
  required(type) {
    return `${type}!`;
  },

  /**
   * Create list of non-null items
   */
  requiredList(type) {
    return `[${type}!]`;
  },
};

module.exports = {
  GraphQLSchema,
  createSchema,
  type,
  scalars,
  types,
};

