/**
 * Database Connection Pool
 * v5.2: Database integration helpers with connection pooling
 */

class DatabasePool {
  constructor(options = {}) {
    this.type = options.type || 'postgres';
    this.connectionString = options.connectionString || process.env.DATABASE_URL;
    this.pool = null;
    this.maxConnections = options.maxConnections || 10;
    this.minConnections = options.minConnections || 2;
    this.idleTimeout = options.idleTimeout || 30000;
  }

  /**
   * Initialize connection pool
   */
  async connect() {
    if (this.pool) {
      return;
    }

    switch (this.type.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        await this._connectPostgres();
        break;
      case 'mysql':
      case 'mariadb':
        await this._connectMySQL();
        break;
      case 'mongodb':
        await this._connectMongoDB();
        break;
      default:
        throw new Error(`Unsupported database type: ${this.type}`);
    }
  }

  /**
   * Connect to PostgreSQL
   * @private
   */
  async _connectPostgres() {
    try {
      const { Pool } = require('pg');
      this.pool = new Pool({
        connectionString: this.connectionString,
        max: this.maxConnections,
        min: this.minConnections,
        idleTimeoutMillis: this.idleTimeout,
      });
    } catch (error) {
      throw new Error('pg package not installed. Install with: npm install pg');
    }
  }

  /**
   * Connect to MySQL
   * @private
   */
  async _connectMySQL() {
    try {
      const mysql = require('mysql2/promise');
      this.pool = mysql.createPool({
        uri: this.connectionString,
        connectionLimit: this.maxConnections,
        waitForConnections: true,
        idleTimeout: this.idleTimeout,
      });
    } catch (error) {
      throw new Error('mysql2 package not installed. Install with: npm install mysql2');
    }
  }

  /**
   * Connect to MongoDB
   * @private
   */
  async _connectMongoDB() {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(this.connectionString);
      await client.connect();
      this.pool = client;
      this.db = client.db();
    } catch (error) {
      throw new Error('mongodb package not installed. Install with: npm install mongodb');
    }
  }

  /**
   * Execute a query
   * @param {string} query - SQL query or MongoDB operation
   * @param {Array} params - Query parameters
   * @returns {Promise<*>} - Query result
   */
  async query(query, params = []) {
    if (!this.pool) {
      await this.connect();
    }

    switch (this.type.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        return await this.pool.query(query, params);
      case 'mysql':
      case 'mariadb':
        const [rows] = await this.pool.execute(query, params);
        return rows;
      case 'mongodb':
        // MongoDB uses different query syntax
        // This is a placeholder - implement based on your needs
        return await this.db.collection(query).find(params[0] || {}).toArray();
      default:
        throw new Error(`Unsupported database type: ${this.type}`);
    }
  }

  /**
   * Get a connection from pool
   * @returns {Promise<Object>} - Database connection
   */
  async getConnection() {
    if (!this.pool) {
      await this.connect();
    }

    if (this.type === 'mongodb') {
      return this.pool;
    }

    return await this.pool.getConnection();
  }

  /**
   * Close connection pool
   */
  async close() {
    if (this.pool) {
      if (this.pool.end) {
        await this.pool.end();
      } else if (this.pool.close) {
        await this.pool.close();
      }
      this.pool = null;
    }
  }

  /**
   * Ping database connection
   * @returns {Promise<boolean>} - True if connection is alive
   */
  async ping() {
    try {
      if (!this.pool) {
        return false;
      }

      switch (this.type.toLowerCase()) {
        case 'postgres':
        case 'postgresql':
          await this.pool.query('SELECT 1');
          return true;
        case 'mysql':
        case 'mariadb':
          await this.pool.execute('SELECT 1');
          return true;
        case 'mongodb':
          await this.db.admin().ping();
          return true;
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create database pool
 * @param {Object} options - Database options
 * @returns {DatabasePool} - Database pool instance
 */
function createPool(options = {}) {
  return new DatabasePool(options);
}

module.exports = {
  DatabasePool,
  createPool,
};

