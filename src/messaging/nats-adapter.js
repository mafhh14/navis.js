/**
 * NATS Messaging Adapter
 * v3: NATS integration for async messaging
 * 
 * Note: Requires nats to be installed
 * npm install nats
 */

const BaseMessaging = require('./base-messaging');

class NATSMessaging extends BaseMessaging {
  constructor(options = {}) {
    super(options);
    this.servers = options.servers || ['nats://localhost:4222'];
    this.nc = null;
  }

  /**
   * Connect to NATS
   */
  async connect() {
    try {
      const { connect } = require('nats');
      this.connectNATS = connect;
    } catch (err) {
      throw new Error('nats is required. Install it with: npm install nats');
    }

    this.nc = await this.connectNATS({
      servers: this.servers,
      ...this.options.natsConfig,
    });

    this.isConnected = true;
    return this;
  }

  /**
   * Disconnect from NATS
   */
  async disconnect() {
    this.isConnected = false;
    if (this.nc) {
      await this.nc.close();
      this.nc = null;
    }
  }

  /**
   * Publish message to NATS subject
   * @param {string} subject - NATS subject
   * @param {Object} message - Message payload
   * @param {Object} options - Publishing options
   */
  async publish(subject, message, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const data = Buffer.from(JSON.stringify(message));
    this.nc.publish(subject, data);
    
    return { subject, published: true };
  }

  /**
   * Subscribe to NATS subject
   * @param {string} subject - NATS subject
   * @param {Function} handler - Message handler function
   * @param {Object} options - Subscription options
   */
  async subscribe(subject, handler, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    this._registerHandler(subject, handler);

    const subscription = this.nc.subscribe(subject, {
      queue: options.queue || undefined,
    });

    (async () => {
      for await (const msg of subscription) {
        try {
          const body = JSON.parse(msg.data.toString());
          const handlers = this._getHandlers(subject);

          for (const h of handlers) {
            await h(body, {
              subject: msg.subject,
              reply: msg.reply,
              sid: msg.sid,
            });
          }
        } catch (error) {
          console.error('Error processing NATS message:', error);
        }
      }
    })().catch(console.error);

    return { subject, handler, subscription };
  }

  /**
   * Unsubscribe from subject
   */
  async unsubscribe(subject, handler = null) {
    if (handler) {
      const handlers = this._getHandlers(subject);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.subscribers.delete(subject);
    }
  }

  /**
   * Request-reply pattern
   * @param {string} subject - NATS subject
   * @param {Object} message - Request message
   * @param {Object} options - Request options
   */
  async request(subject, message, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const data = Buffer.from(JSON.stringify(message));
    const response = await this.nc.request(subject, data, {
      timeout: options.timeout || 5000,
    });

    return JSON.parse(response.data.toString());
  }
}

module.exports = NATSMessaging;

