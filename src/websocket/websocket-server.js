/**
 * WebSocket Server
 * v5.2: WebSocket support for real-time communication
 */

const http = require('http');

class WebSocketServer {
  constructor(options = {}) {
    this.server = options.server || null;
    this.path = options.path || '/';
    this.clients = new Map();
    this.messageHandlers = new Map();
    this.connectionHandlers = [];
    this.disconnectionHandlers = [];
  }

  /**
   * Attach to HTTP server
   * @param {Object} server - HTTP server instance
   */
  attach(server) {
    this.server = server;
    
    server.on('upgrade', (request, socket, head) => {
      this._handleUpgrade(request, socket, head);
    });
  }

  /**
   * Handle HTTP upgrade request
   * @private
   */
  _handleUpgrade(request, socket, head) {
    // Simple WebSocket handshake (RFC 6455)
    const key = request.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    // Generate accept key
    const crypto = require('crypto');
    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    // Send handshake response
    const response = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      '',
    ].join('\r\n');

    socket.write(response);

    // Create WebSocket client
    const client = {
      id: this._generateId(),
      socket,
      request,
      send: (data) => this._send(client, data),
      close: () => this._close(client),
    };

    this.clients.set(client.id, client);

    // Call connection handlers
    this.connectionHandlers.forEach(handler => {
      try {
        handler(client);
      } catch (error) {
        console.error('Connection handler error:', error);
      }
    });

    // Handle incoming messages
    socket.on('data', (data) => {
      this._handleMessage(client, data);
    });

    socket.on('close', () => {
      this._handleDisconnect(client);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this._handleDisconnect(client);
    });
  }

  /**
   * Handle incoming message
   * @private
   */
  _handleMessage(client, data) {
    // Simple WebSocket frame parsing (basic implementation)
    // In production, use ws library
    try {
      const message = this._parseFrame(data);
      
      if (message) {
        // Call message handlers
        this.messageHandlers.forEach((handler, path) => {
          if (path === '*' || message.path === path) {
            try {
              handler(message.data, client);
            } catch (error) {
              console.error('Message handler error:', error);
            }
          }
        });
      }
    } catch (error) {
      console.error('Message parse error:', error);
    }
  }

  /**
   * Parse WebSocket frame (simplified)
   * @private
   */
  _parseFrame(data) {
    // Basic frame parsing
    // In production, use proper WebSocket frame parser
    if (data.length < 2) return null;

    const fin = (data[0] & 0x80) !== 0;
    const opcode = data[0] & 0x0F;
    const masked = (data[1] & 0x80) !== 0;
    let payloadLength = data[1] & 0x7F;

    let offset = 2;

    if (payloadLength === 126) {
      payloadLength = data.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      payloadLength = data.readUIntBigEndian(offset);
      offset += 8;
    }

    if (masked) {
      const maskingKey = data.slice(offset, offset + 4);
      offset += 4;
      const payload = data.slice(offset, offset + payloadLength);
      
      // Unmask payload
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskingKey[i % 4];
      }

      return {
        opcode,
        data: payload.toString('utf8'),
        path: '*',
      };
    }

    return null;
  }

  /**
   * Send message to client
   * @private
   */
  _send(client, data) {
    if (!client.socket || client.socket.destroyed) {
      return false;
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    const frame = this._createFrame(message);
    
    try {
      client.socket.write(frame);
      return true;
    } catch (error) {
      console.error('Send error:', error);
      return false;
    }
  }

  /**
   * Create WebSocket frame
   * @private
   */
  _createFrame(data) {
    const message = Buffer.from(data, 'utf8');
    const length = message.length;

    let frame;

    if (length < 126) {
      frame = Buffer.allocUnsafe(2 + length);
      frame[0] = 0x81; // FIN + text frame
      frame[1] = length;
      message.copy(frame, 2);
    } else if (length < 65536) {
      frame = Buffer.allocUnsafe(4 + length);
      frame[0] = 0x81;
      frame[1] = 126;
      frame.writeUInt16BE(length, 2);
      message.copy(frame, 4);
    } else {
      frame = Buffer.allocUnsafe(10 + length);
      frame[0] = 0x81;
      frame[1] = 127;
      frame.writeUInt32BE(0, 2);
      frame.writeUInt32BE(length, 6);
      message.copy(frame, 10);
    }

    return frame;
  }

  /**
   * Close client connection
   * @private
   */
  _close(client) {
    if (client.socket && !client.socket.destroyed) {
      client.socket.end();
    }
    this.clients.delete(client.id);
  }

  /**
   * Handle client disconnect
   * @private
   */
  _handleDisconnect(client) {
    this.clients.delete(client.id);
    
    this.disconnectionHandlers.forEach(handler => {
      try {
        handler(client);
      } catch (error) {
        console.error('Disconnection handler error:', error);
      }
    });
  }

  /**
   * Register message handler
   * @param {string} path - Message path (or '*' for all)
   * @param {Function} handler - Message handler
   */
  on(path, handler) {
    this.messageHandlers.set(path, handler);
  }

  /**
   * Register connection handler
   * @param {Function} handler - Connection handler
   */
  onConnection(handler) {
    this.connectionHandlers.push(handler);
  }

  /**
   * Register disconnection handler
   * @param {Function} handler - Disconnection handler
   */
  onDisconnection(handler) {
    this.disconnectionHandlers.push(handler);
  }

  /**
   * Broadcast message to all clients
   * @param {*} data - Message data
   */
  broadcast(data) {
    for (const client of this.clients.values()) {
      this._send(client, data);
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

module.exports = WebSocketServer;

