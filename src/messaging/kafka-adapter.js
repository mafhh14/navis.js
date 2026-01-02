/**
 * Kafka Messaging Adapter
 * v3: Kafka integration for async messaging
 * 
 * Note: Requires kafkajs to be installed
 * npm install kafkajs
 */

const BaseMessaging = require('./base-messaging');

class KafkaMessaging extends BaseMessaging {
  constructor(options = {}) {
    super(options);
    this.brokers = options.brokers || ['localhost:9092'];
    this.clientId = options.clientId || 'navis-client';
    this.consumerGroupId = options.consumerGroupId || 'navis-group';
    this.kafka = null;
    this.producer = null;
    this.consumer = null;
  }

  /**
   * Connect to Kafka
   */
  async connect() {
    try {
      const { Kafka } = require('kafkajs');
      this.Kafka = Kafka;
    } catch (err) {
      throw new Error('kafkajs is required. Install it with: npm install kafkajs');
    }

    this.kafka = new this.Kafka({
      clientId: this.clientId,
      brokers: this.brokers,
      ...this.options.kafkaConfig,
    });

    this.producer = this.kafka.producer();
    await this.producer.connect();

    this.consumer = this.kafka.consumer({ groupId: this.consumerGroupId });
    await this.consumer.connect();

    this.isConnected = true;
    return this;
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect() {
    this.isConnected = false;
    
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }
    
    if (this.consumer) {
      await this.consumer.disconnect();
      this.consumer = null;
    }
  }

  /**
   * Publish message to Kafka topic
   * @param {string} topic - Kafka topic name
   * @param {Object} message - Message payload
   * @param {Object} options - Publishing options
   */
  async publish(topic, message, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const result = await this.producer.send({
      topic,
      messages: [{
        key: options.key || null,
        value: JSON.stringify(message),
        headers: options.headers || {},
      }],
    });

    return {
      topic,
      partition: result[0].partition,
      offset: result[0].offset,
    };
  }

  /**
   * Subscribe to Kafka topic
   * @param {string} topic - Kafka topic name
   * @param {Function} handler - Message handler function
   * @param {Object} options - Subscription options
   */
  async subscribe(topic, handler, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    this._registerHandler(topic, handler);

    await this.consumer.subscribe({ 
      topic,
      fromBeginning: options.fromBeginning || false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const body = JSON.parse(message.value.toString());
          const handlers = this._getHandlers(topic);

          for (const h of handlers) {
            await h(body, {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString(),
              headers: message.headers,
            });
          }
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });

    return { topic, handler };
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribe(topic, handler = null) {
    if (handler) {
      const handlers = this._getHandlers(topic);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.subscribers.delete(topic);
    }
  }
}

module.exports = KafkaMessaging;

