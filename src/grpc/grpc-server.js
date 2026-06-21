/**
 * gRPC Server
 * v6.0: Lightweight gRPC integration for microservices
 */

class GrpcServer {
  constructor(options = {}) {
    this.host = options.host || '0.0.0.0';
    this.port = options.port || 50051;
    this.services = [];
    this.server = null;
    this.grpc = null;
    this.started = false;
  }

  /**
   * Load grpc module
   * @private
   */
  _loadGrpc() {
    if (!this.grpc) {
      try {
        this.grpc = require('@grpc/grpc-js');
      } catch (error) {
        throw new Error('@grpc/grpc-js not installed. Install with: npm install @grpc/grpc-js');
      }
    }
    return this.grpc;
  }

  /**
   * Register a gRPC service
   * @param {Object} serviceDefinition - grpc service definition
   * @param {Object} implementation - method implementations
   */
  addService(serviceDefinition, implementation) {
    this.services.push({ serviceDefinition, implementation });
  }

  /**
   * Create unary handler wrapper
   * @param {Function} handler - async (call) => result
   * @returns {Function}
   */
  static unaryHandler(handler) {
    return async (call, callback) => {
      try {
        const result = await handler(call);
        callback(null, result);
      } catch (error) {
        callback({
          code: 13,
          message: error.message || 'Internal server error',
        });
      }
    };
  }

  /**
   * Start gRPC server
   * @returns {Promise<void>}
   */
  async start() {
    const grpc = this._loadGrpc();
    this.server = new grpc.Server();

    for (const service of this.services) {
      this.server.addService(service.serviceDefinition, service.implementation);
    }

    const address = `${this.host}:${this.port}`;
    await new Promise((resolve, reject) => {
      this.server.bindAsync(
        address,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
          if (error) {
            reject(error);
            return;
          }
          this.port = port;
          this.server.start();
          this.started = true;
          resolve();
        }
      );
    });
  }

  /**
   * Stop gRPC server
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.server) {
      return;
    }

    await new Promise((resolve) => {
      this.server.tryShutdown(() => {
        this.started = false;
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Get server address
   * @returns {string}
   */
  getAddress() {
    return `${this.host}:${this.port}`;
  }
}

/**
 * Create gRPC client
 * @param {string} address - host:port
 * @param {Object} serviceDefinition - grpc service definition
 * @param {Object} options
 * @returns {Object}
 */
function createGrpcClient(address, serviceDefinition, options = {}) {
  let grpc;
  try {
    grpc = require('@grpc/grpc-js');
  } catch (error) {
    throw new Error('@grpc/grpc-js not installed. Install with: npm install @grpc/grpc-js');
  }

  const credentials = options.secure
    ? grpc.credentials.createSsl()
    : grpc.credentials.createInsecure();

  return new serviceDefinition(address, credentials, options.clientOptions || {});
}

/**
 * Create gRPC server
 * @param {Object} options
 * @returns {GrpcServer}
 */
function createGrpcServer(options = {}) {
  return new GrpcServer(options);
}

module.exports = {
  GrpcServer,
  createGrpcServer,
  createGrpcClient,
};
