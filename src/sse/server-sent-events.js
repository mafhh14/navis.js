/**
 * Server-Sent Events (SSE) Support
 * v5.2: Real-time event streaming to clients
 */

class SSEServer {
  constructor() {
    this.clients = new Map();
  }

  /**
   * SSE middleware
   * @returns {Function} - Middleware function
   */
  middleware() {
    return async (req, res, next) => {
      // Check if this is an SSE request
      const accept = req.headers.accept || req.headers.Accept || '';
      
      if (accept.includes('text/event-stream')) {
        // Set SSE headers
        res.headers = res.headers || {};
        res.headers['Content-Type'] = 'text/event-stream';
        res.headers['Cache-Control'] = 'no-cache';
        res.headers['Connection'] = 'keep-alive';
        res.headers['X-Accel-Buffering'] = 'no'; // Disable nginx buffering

        // Create SSE client
        const clientId = this._generateId();
        const client = {
          id: clientId,
          req,
          res,
          send: (data, event = null, id = null) => this._send(client, data, event, id),
          close: () => this._close(client),
        };

        this.clients.set(clientId, client);

        // Send initial connection message
        this._send(client, { type: 'connected', clientId }, 'connection', clientId);

        // Handle client disconnect
        req.on('close', () => {
          this._close(client);
        });

        // Attach SSE methods to response
        res.sse = {
          send: (data, event, id) => client.send(data, event, id),
          close: () => client.close(),
        };

        // Don't call next() - SSE keeps connection open
        return;
      }

      next();
    };
  }

  /**
   * Send SSE message
   * @private
   */
  _send(client, data, event = null, id = null) {
    if (!client.res || client.res.destroyed) {
      return false;
    }

    let message = '';

    // Event ID
    if (id !== null) {
      message += `id: ${id}\n`;
    }

    // Event type
    if (event) {
      message += `event: ${event}\n`;
    }

    // Data
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    message += `data: ${dataStr}\n\n`;

    try {
      // For Node.js HTTP response
      if (client.res.write) {
        client.res.write(message);
      } else {
        // For Lambda, accumulate messages
        if (!client.res.sseMessages) {
          client.res.sseMessages = [];
        }
        client.res.sseMessages.push(message);
      }
      return true;
    } catch (error) {
      console.error('SSE send error:', error);
      return false;
    }
  }

  /**
   * Close SSE connection
   * @private
   */
  _close(client) {
    this.clients.delete(client.id);
    
    if (client.res && client.res.end) {
      try {
        client.res.end();
      } catch (error) {
        // Ignore
      }
    }
  }

  /**
   * Broadcast to all clients
   * @param {*} data - Message data
   * @param {string} event - Event type
   */
  broadcast(data, event = null) {
    for (const client of this.clients.values()) {
      this._send(client, data, event);
    }
  }

  /**
   * Get all connected clients
   * @returns {Array} - Array of client objects
   */
  getClients() {
    return Array.from(this.clients.values());
  }

  /**
   * Generate unique client ID
   * @private
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Create SSE server
 * @returns {SSEServer} - SSE server instance
 */
function createSSEServer() {
  return new SSEServer();
}

/**
 * SSE middleware helper
 * @returns {Function} - Middleware function
 */
function sse() {
  const sseServer = createSSEServer();
  return sseServer.middleware();
}

module.exports = {
  SSEServer,
  createSSEServer,
  sse,
};

