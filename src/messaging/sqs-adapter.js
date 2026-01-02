/**
 * AWS SQS Messaging Adapter
 * v3: SQS integration for async messaging
 * 
 * Note: Requires @aws-sdk/client-sqs to be installed
 * npm install @aws-sdk/client-sqs
 */

const BaseMessaging = require('./base-messaging');

class SQSMessaging extends BaseMessaging {
  constructor(options = {}) {
    super(options);
    this.region = options.region || process.env.AWS_REGION || 'us-east-1';
    this.queueUrl = options.queueUrl;
    this.sqsClient = null;
    
    // Try to load AWS SDK (optional dependency)
    try {
      const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
      this.SQSClient = SQSClient;
      this.SendMessageCommand = SendMessageCommand;
      this.ReceiveMessageCommand = ReceiveMessageCommand;
      this.DeleteMessageCommand = DeleteMessageCommand;
    } catch (err) {
      // AWS SDK not installed - will throw error on connect
    }
  }

  /**
   * Connect to SQS
   */
  async connect() {
    if (!this.SQSClient) {
      throw new Error('@aws-sdk/client-sqs is required. Install it with: npm install @aws-sdk/client-sqs');
    }

    this.sqsClient = new this.SQSClient({
      region: this.region,
      ...this.options.awsConfig,
    });

    this.isConnected = true;
    return this;
  }

  /**
   * Disconnect from SQS
   */
  async disconnect() {
    this.isConnected = false;
    if (this.sqsClient) {
      // SQS client doesn't need explicit disconnect
      this.sqsClient = null;
    }
  }

  /**
   * Publish message to SQS queue
   * @param {string} queueUrl - SQS queue URL
   * @param {Object} message - Message payload
   * @param {Object} options - Publishing options
   */
  async publish(queueUrl, message, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const command = new this.SendMessageCommand({
      QueueUrl: queueUrl || this.queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: options.attributes || {},
      DelaySeconds: options.delaySeconds || 0,
    });

    const response = await this.sqsClient.send(command);
    return {
      messageId: response.MessageId,
      md5OfBody: response.MD5OfMessageBody,
    };
  }

  /**
   * Subscribe to SQS queue (long polling)
   * @param {string} queueUrl - SQS queue URL
   * @param {Function} handler - Message handler function
   * @param {Object} options - Subscription options
   */
  async subscribe(queueUrl, handler, options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const targetQueueUrl = queueUrl || this.queueUrl;
    this._registerHandler(targetQueueUrl, handler);

    // Start polling
    const poll = async () => {
      if (!this.isConnected) {
        return;
      }

      try {
        const command = new this.ReceiveMessageCommand({
          QueueUrl: targetQueueUrl,
          MaxNumberOfMessages: options.maxMessages || 1,
          WaitTimeSeconds: options.waitTimeSeconds || 20, // Long polling
          VisibilityTimeout: options.visibilityTimeout || 30,
        });

        const response = await this.sqsClient.send(command);

        if (response.Messages && response.Messages.length > 0) {
          for (const message of response.Messages) {
            try {
              const body = JSON.parse(message.Body);
              const handlers = this._getHandlers(targetQueueUrl);

              for (const h of handlers) {
                await h(body, {
                  messageId: message.MessageId,
                  receiptHandle: message.ReceiptHandle,
                  attributes: message.Attributes,
                });
              }

              // Delete message after successful processing
              if (options.autoDelete !== false) {
                await this.sqsClient.send(new this.DeleteMessageCommand({
                  QueueUrl: targetQueueUrl,
                  ReceiptHandle: message.ReceiptHandle,
                }));
              }
            } catch (error) {
              console.error('Error processing SQS message:', error);
              // Message will become visible again after visibility timeout
            }
          }
        }
      } catch (error) {
        console.error('Error receiving SQS messages:', error);
      }

      // Continue polling
      if (this.isConnected) {
        setTimeout(poll, options.pollInterval || 0);
      }
    };

    // Start polling
    poll();

    return { queueUrl: targetQueueUrl, handler };
  }

  /**
   * Unsubscribe from queue
   */
  async unsubscribe(queueUrl, handler = null) {
    const targetQueueUrl = queueUrl || this.queueUrl;
    
    if (handler) {
      const handlers = this._getHandlers(targetQueueUrl);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.subscribers.delete(targetQueueUrl);
    }
  }
}

module.exports = SQSMessaging;

