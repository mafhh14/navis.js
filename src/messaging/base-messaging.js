/**
 * Base Messaging Interface
 * v3: Abstract base class for async messaging adapters
 */

class BaseMessaging {
  constructor(options = {}) {
    this.options = options;
    this.subscribers = new Map(); // topic -> [handlers]
    this.isConnected = false;
  }

  /**
   * Connect to messaging broker
   * @abstract
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Disconnect from messaging broker
   * @abstract
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  /**
   * Publish a message to a topic/queue
   * @abstract
   * @param {string} topic - Topic/queue name
   * @param {Object} message - Message payload
   * @param {Object} options - Publishing options
   */
  async publish(topic, message, options = {}) {
    throw new Error('publish() must be implemented by subclass');
  }

  /**
   * Subscribe to a topic/queue
   * @abstract
   * @param {string} topic - Topic/queue name
   * @param {Function} handler - Message handler function
   * @param {Object} options - Subscription options
   */
  async subscribe(topic, handler, options = {}) {
    throw new Error('subscribe() must be implemented by subclass');
  }

  /**
   * Unsubscribe from a topic/queue
   * @abstract
   * @param {string} topic - Topic/queue name
   * @param {Function} handler - Optional specific handler to unsubscribe
   */
  async unsubscribe(topic, handler = null) {
    throw new Error('unsubscribe() must be implemented by subclass');
  }

  /**
   * Register a handler for a topic
   * @protected
   */
  _registerHandler(topic, handler) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic).push(handler);
  }

  /**
   * Get all handlers for a topic
   * @protected
   */
  _getHandlers(topic) {
    return this.subscribers.get(topic) || [];
  }
}

module.exports = BaseMessaging;

