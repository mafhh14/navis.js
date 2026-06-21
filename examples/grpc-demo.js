/**
 * gRPC Demo with Proto Loading
 * v6.1: Load .proto files and run a gRPC server
 *
 * Requires: npm install @grpc/grpc-js @grpc/proto-loader
 */

const path = require('path');
const {
  createGrpcServer,
  createGrpcClient,
  GrpcServer,
  loadProtoService,
} = require('../src/index');

const PROTO_PATH = path.join(__dirname, 'proto', 'hello.proto');
const PORT = Number(process.env.GRPC_PORT) || 50051;

async function demo() {
  console.log('=== gRPC Proto Loading Demo ===\n');

  let HelloService;
  try {
    HelloService = loadProtoService(PROTO_PATH, 'hello.HelloService', {
      includeDirs: [path.join(__dirname, 'proto')],
    });
    console.log('✅ Loaded hello.HelloService from proto\n');
  } catch (error) {
    console.log('⚠️  Proto loading failed:', error.message);
    console.log('   npm install @grpc/grpc-js @grpc/proto-loader');
    return;
  }

  const server = createGrpcServer({ host: '127.0.0.1', port: PORT });

  server.addService(HelloService.service, {
    SayHello: GrpcServer.unaryHandler(async (call) => ({
      message: `Hello, ${call.request.name || 'world'}!`,
    })),
  });

  await server.start();
  console.log(`✅ gRPC server listening on ${server.getAddress()}`);

  const client = createGrpcClient(
    `127.0.0.1:${PORT}`,
    HelloService,
    { secure: false }
  );

  const reply = await new Promise((resolve, reject) => {
    client.SayHello({ name: 'Navis' }, (error, response) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(response);
    });
  });

  console.log('✅ Client response:', reply);
  await server.stop();
  console.log('\n✅ gRPC demo complete');
}

if (require.main === module) {
  demo().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { demo };
