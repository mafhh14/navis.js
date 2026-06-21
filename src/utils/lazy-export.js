/**
 * Lazy export helper for Lambda cold-start optimization
 * v7.1: Defer loading optional/heavy modules until first access
 */

const path = require('path');

/**
 * Define a lazy getter on exports that caches after first load
 * @param {Object} target - module.exports object
 * @param {string} name - Export name
 * @param {string} modulePath - Path relative to src/
 * @param {string} [exportName] - Named export (default: module itself or same name)
 */
function defineLazy(target, name, modulePath, exportName) {
  Object.defineProperty(target, name, {
    enumerable: true,
    configurable: true,
    get() {
      const resolvedPath = path.join(__dirname, '..', modulePath);
      const mod = require(resolvedPath);
      const resolved = exportName
        ? mod[exportName]
        : (mod[name] !== undefined ? mod[name] : mod);
      Object.defineProperty(target, name, {
        value: resolved,
        enumerable: true,
        configurable: true,
      });
      return resolved;
    },
  });
}

/**
 * Apply lazy exports for optional/heavy modules
 * @param {Object} target
 */
function applyLazyExports(target) {
  const lazy = [
    ['SQSMessaging', 'messaging/sqs-adapter'],
    ['KafkaMessaging', 'messaging/kafka-adapter'],
    ['NATSMessaging', 'messaging/nats-adapter'],
    ['RedisCache', 'cache/redis-cache'],
    ['WebSocketServer', 'websocket/websocket-server'],
    ['GraphQLServer', 'graphql/graphql-server', 'GraphQLServer'],
    ['GraphQLError', 'graphql/graphql-server', 'GraphQLError'],
    ['createGraphQLServer', 'graphql/graphql-server', 'createGraphQLServer'],
    ['graphql', 'graphql/graphql-server', 'graphql'],
    ['GraphQLSchema', 'graphql/schema', 'GraphQLSchema'],
    ['createSchema', 'graphql/schema', 'createSchema'],
    ['type', 'graphql/schema', 'type'],
    ['scalars', 'graphql/schema', 'scalars'],
    ['types', 'graphql/schema', 'types'],
    ['createResolver', 'graphql/resolver', 'createResolver'],
    ['fieldResolver', 'graphql/resolver', 'fieldResolver'],
    ['combineResolvers', 'graphql/resolver', 'combineResolvers'],
    ['createAsyncResolver', 'graphql/resolver', 'createAsyncResolver'],
    ['createBatchResolver', 'graphql/resolver', 'createBatchResolver'],
    ['GrpcServer', 'grpc/grpc-server', 'GrpcServer'],
    ['createGrpcServer', 'grpc/grpc-server', 'createGrpcServer'],
    ['createGrpcClient', 'grpc/grpc-server', 'createGrpcClient'],
    ['loadProto', 'grpc/proto-loader', 'loadProto'],
    ['loadProtoService', 'grpc/proto-loader', 'loadProtoService'],
    ['SwaggerGenerator', 'docs/swagger', 'SwaggerGenerator'],
    ['swagger', 'docs/swagger', 'swagger'],
  ];

  for (const [name, modulePath, exportName] of lazy) {
    defineLazy(target, name, modulePath, exportName);
  }
}

module.exports = {
  defineLazy,
  applyLazyExports,
};
