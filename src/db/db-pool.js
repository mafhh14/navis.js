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
      case 'sqlite':
      case 'sqlite3':
        await this._connectSQLite();
        break;
      case 'mssql':
      case 'sqlserver':
        await this._connectSQLServer();
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
   * Connect to SQLite
   * @private
   */
  async _connectSQLite() {
    try {
      const sqlite3 = require('better-sqlite3');
      // SQLite connection string is a file path
      const dbPath = this.connectionString || ':memory:';
      this.pool = sqlite3(dbPath, {
        timeout: this.idleTimeout,
      });
      // SQLite doesn't use connection pooling, but we store the db instance
      this.db = this.pool;
    } catch (error) {
      // Fallback to sqlite3 if better-sqlite3 is not available
      try {
        const sqlite3 = require('sqlite3');
        const { open } = require('sqlite');
        const dbPath = this.connectionString || ':memory:';
        this.pool = await open({
          filename: dbPath,
          driver: sqlite3.Database,
        });
        this.db = this.pool;
      } catch (fallbackError) {
        throw new Error('SQLite package not installed. Install with: npm install better-sqlite3 or npm install sqlite3 sqlite');
      }
    }
  }

  /**
   * Connect to SQL Server
   * @private
   */
  async _connectSQLServer() {
    try {
      const sql = require('mssql');
      const config = this._parseSQLServerConfig(this.connectionString);
      this.pool = await sql.connect(config);
      this.db = this.pool;
    } catch (error) {
      throw new Error('mssql package not installed. Install with: npm install mssql');
    }
  }

  /**
   * Parse SQL Server connection string to config object
   * @private
   */
  _parseSQLServerConfig(connectionString) {
    if (!connectionString) {
      throw new Error('SQL Server connection string is required');
    }

    // If it's already an object, return it
    if (typeof connectionString === 'object') {
      return {
        ...connectionString,
        pool: {
          max: this.maxConnections,
          min: this.minConnections,
          idleTimeoutMillis: this.idleTimeout,
        },
      };
    }

    // Parse connection string format: Server=host;Database=db;User Id=user;Password=pass
    const config = {};
    connectionString.split(';').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        const normalizedKey = key.trim().toLowerCase();
        switch (normalizedKey) {
          case 'server':
            config.server = value.trim();
            break;
          case 'database':
            config.database = value.trim();
            break;
          case 'user id':
          case 'userid':
          case 'uid':
            config.user = value.trim();
            break;
          case 'password':
          case 'pwd':
            config.password = value.trim();
            break;
          case 'port':
            config.port = parseInt(value.trim(), 10);
            break;
        }
      }
    });

    config.pool = {
      max: this.maxConnections,
      min: this.minConnections,
      idleTimeoutMillis: this.idleTimeout,
    };

    return config;
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
      case 'sqlite':
      case 'sqlite3':
        // SQLite with better-sqlite3 (synchronous) or sqlite (async)
        if (this.pool.prepare) {
          // better-sqlite3
          const stmt = this.pool.prepare(query);
          return stmt.all(...params);
        } else {
          // sqlite (async)
          return await this.pool.all(query, params);
        }
      case 'mssql':
      case 'sqlserver':
        const sql = require('mssql');
        const request = this.pool.request();
        // For parameterized queries, use proper SQL Server parameter syntax
        // If params is an array, bind them as @p0, @p1, etc.
        if (Array.isArray(params) && params.length > 0) {
          params.forEach((param, index) => {
            request.input(`p${index}`, param);
          });
          // Replace ? with @p0, @p1, etc. in query
          let paramIndex = 0;
          const modifiedQuery = query.replace(/\?/g, () => `@p${paramIndex++}`);
          const result = await request.query(modifiedQuery);
          return result.recordset;
        } else {
          const result = await request.query(query);
          return result.recordset;
        }
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

    if (this.type === 'mongodb' || this.type === 'sqlite' || this.type === 'sqlite3') {
      return this.pool;
    }

    if (this.type === 'mssql' || this.type === 'sqlserver') {
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
      } else if (typeof this.pool.close === 'function') {
        // SQLite better-sqlite3
        this.pool.close();
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
        case 'sqlite':
        case 'sqlite3':
          // SQLite ping - just check if database is accessible
          if (this.pool.prepare) {
            this.pool.prepare('SELECT 1').get();
          } else {
            await this.pool.get('SELECT 1');
          }
          return true;
        case 'mssql':
        case 'sqlserver':
          await this.pool.request().query('SELECT 1');
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

