/**
 * gRPC Proto Loader
 * v6.1: Load .proto files into gRPC service definitions
 */

const path = require('path');

const DEFAULT_LOADER_OPTIONS = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

/**
 * Load grpc and proto-loader modules
 * @private
 */
function loadGrpcModules() {
  let grpc;
  let protoLoader;

  try {
    grpc = require('@grpc/grpc-js');
    protoLoader = require('@grpc/proto-loader');
  } catch (error) {
    throw new Error(
      'gRPC proto loading requires: npm install @grpc/grpc-js @grpc/proto-loader'
    );
  }

  return { grpc, protoLoader };
}

/**
 * Load a .proto file and return the package definition tree
 * @param {string} protoPath - Path to .proto file
 * @param {Object} options
 * @param {Object} options.loaderOptions - Options passed to proto-loader
 * @param {string[]} options.includeDirs - Additional include directories for imports
 * @returns {Object}
 */
function loadProto(protoPath, options = {}) {
  const { grpc, protoLoader } = loadGrpcModules();
  const resolvedPath = path.resolve(protoPath);
  const loaderOptions = {
    ...DEFAULT_LOADER_OPTIONS,
    ...options.loaderOptions,
  };

  if (options.includeDirs) {
    loaderOptions.includeDirs = options.includeDirs.map((dir) => path.resolve(dir));
  }

  const packageDefinition = protoLoader.loadSync(resolvedPath, loaderOptions);
  return grpc.loadPackageDefinition(packageDefinition);
}

/**
 * Load a specific gRPC service from a .proto file
 * @param {string} protoPath - Path to .proto file
 * @param {string|string[]} packagePath - e.g. 'hello' or ['hello', 'HelloService']
 * @param {Object} options - Passed to loadProto
 * @returns {Object} gRPC service definition for addService / createGrpcClient
 */
function loadProtoService(protoPath, packagePath, options = {}) {
  const definition = loadProto(protoPath, options);
  const parts = Array.isArray(packagePath)
    ? packagePath
    : packagePath.split('.');

  if (parts.length < 2) {
    throw new Error(
      'packagePath must include package and service name, e.g. "hello.HelloService"'
    );
  }

  let current = definition;
  for (let i = 0; i < parts.length - 1; i += 1) {
    current = current[parts[i]];
    if (!current) {
      throw new Error(`Package segment not found in proto: ${parts[i]}`);
    }
  }

  const serviceName = parts[parts.length - 1];
  const service = current[serviceName];
  if (!service) {
    throw new Error(`Service not found in proto: ${serviceName}`);
  }

  return service;
}

module.exports = {
  loadProto,
  loadProtoService,
  DEFAULT_LOADER_OPTIONS,
};
