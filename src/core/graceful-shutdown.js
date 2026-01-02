/**
 * Graceful Shutdown Handler
 * v5: Clean shutdown handling for Node.js servers
 */

/**
 * Graceful shutdown handler
 * @param {Object} server - HTTP server instance
 * @param {Object} options - Shutdown options
 */
function gracefulShutdown(server, options = {}) {
  const {
    timeout = 10000, // 10 seconds default
    onShutdown = async () => {}, // Cleanup function
    signals = ['SIGTERM', 'SIGINT'],
    log = console.log,
  } = options;

  let isShuttingDown = false;

  const shutdown = async (signal) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    log(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      log('HTTP server closed');
    });

    // Set timeout for forced shutdown
    const shutdownTimer = setTimeout(() => {
      log('Forced shutdown after timeout');
      process.exit(1);
    }, timeout);

    try {
      // Run cleanup
      await onShutdown();
      clearTimeout(shutdownTimer);
      log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      log('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Register signal handlers
  for (const signal of signals) {
    process.on(signal, () => shutdown(signal));
  }

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    log('Uncaught exception:', error);
    await shutdown('uncaughtException');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    log('Unhandled rejection:', reason);
    await shutdown('unhandledRejection');
  });

  return {
    shutdown: () => shutdown('manual'),
    isShuttingDown: () => isShuttingDown,
  };
}

module.exports = gracefulShutdown;

