/**
 * Database Migration System
 * v5.7: Database migration runner with up/down support
 */

const fs = require('fs');
const path = require('path');

class Migration {
  constructor(dbPool, migrationsPath = './migrations') {
    this.dbPool = dbPool;
    this.migrationsPath = migrationsPath;
    this.tableName = 'migrations';
  }

  /**
   * Initialize migrations table
   * @returns {Promise<void>}
   */
  async init() {
    const dbType = this.dbPool.type.toLowerCase();

    if (dbType === 'mongodb') {
      // MongoDB: Create collection if not exists
      const collection = this.dbPool.db.collection(this.tableName);
      // Collection is created automatically on first insert
    } else {
      // SQL: Create migrations table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ${this._escapeIdentifier(this.tableName)} (
          ${this._escapeIdentifier('id')} INTEGER PRIMARY KEY AUTOINCREMENT,
          ${this._escapeIdentifier('name')} TEXT NOT NULL UNIQUE,
          ${this._escapeIdentifier('batch')} INTEGER NOT NULL,
          ${this._escapeIdentifier('executed_at')} DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `.replace(/AUTOINCREMENT/g, dbType === 'postgres' || dbType === 'postgresql' 
        ? 'SERIAL' 
        : dbType === 'mysql' || dbType === 'mariadb' 
        ? 'AUTO_INCREMENT' 
        : dbType === 'mssql' || dbType === 'sqlserver'
        ? 'IDENTITY(1,1)'
        : 'AUTOINCREMENT'
      ).replace(/DATETIME/g, dbType === 'postgres' || dbType === 'postgresql'
        ? 'TIMESTAMP'
        : dbType === 'mysql' || dbType === 'mariadb'
        ? 'DATETIME'
        : dbType === 'mssql' || dbType === 'sqlserver'
        ? 'DATETIME2'
        : 'DATETIME'
      );

      await this.dbPool.query(createTableSQL);
    }
  }

  /**
   * Get all migration files
   * @returns {Array<Object>}
   */
  getMigrationFiles() {
    if (!fs.existsSync(this.migrationsPath)) {
      return [];
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.js'))
      .map(file => {
        const filePath = path.join(this.migrationsPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file.replace('.js', ''),
          file,
          path: filePath,
          timestamp: stats.mtimeMs,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    return files;
  }

  /**
   * Get executed migrations
   * @returns {Promise<Array>}
   */
  async getExecutedMigrations() {
    await this.init();
    const dbType = this.dbPool.type.toLowerCase();

    if (dbType === 'mongodb') {
      const collection = this.dbPool.db.collection(this.tableName);
      const migrations = await collection.find({}).sort({ batch: -1, executed_at: -1 }).toArray();
      return migrations.map(m => m.name);
    } else {
      const result = await this.dbPool.query(
        `SELECT ${this._escapeIdentifier('name')} FROM ${this._escapeIdentifier(this.tableName)} ORDER BY ${this._escapeIdentifier('batch')} DESC, ${this._escapeIdentifier('executed_at')} DESC`
      );
      
      if (this.dbPool.type.toLowerCase() === 'postgres' || this.dbPool.type.toLowerCase() === 'postgresql') {
        return result.rows.map(row => row.name);
      } else {
        return result.map(row => row.name);
      }
    }
  }

  /**
   * Get current batch number
   * @returns {Promise<number>}
   */
  async getCurrentBatch() {
    await this.init();
    const dbType = this.dbPool.type.toLowerCase();

    if (dbType === 'mongodb') {
      const collection = this.dbPool.db.collection(this.tableName);
      const result = await collection.find({}).sort({ batch: -1 }).limit(1).toArray();
      return result.length > 0 ? result[0].batch : 0;
    } else {
      const result = await this.dbPool.query(
        `SELECT MAX(${this._escapeIdentifier('batch')}) as max_batch FROM ${this._escapeIdentifier(this.tableName)}`
      );
      
      if (this.dbPool.type.toLowerCase() === 'postgres' || this.dbPool.type.toLowerCase() === 'postgresql') {
        return result.rows[0]?.max_batch || 0;
      } else {
        return result[0]?.max_batch || 0;
      }
    }
  }

  /**
   * Run migrations
   * @param {number} limit - Maximum number of migrations to run
   * @returns {Promise<Array>}
   */
  async up(limit = null) {
    await this.init();

    const files = this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const pending = files.filter(file => !executed.includes(file.name));

    if (pending.length === 0) {
      return { message: 'No pending migrations', executed: [] };
    }

    const toRun = limit ? pending.slice(0, limit) : pending;
    const batch = (await this.getCurrentBatch()) + 1;
    const executedMigrations = [];

    for (const file of toRun) {
      try {
        // Load migration
        delete require.cache[require.resolve(file.path)];
        const migration = require(file.path);

        if (!migration.up || typeof migration.up !== 'function') {
          throw new Error(`Migration ${file.name} must export an 'up' function`);
        }

        // Run migration
        await migration.up(this.dbPool);

        // Record migration
        await this.recordMigration(file.name, batch);

        executedMigrations.push(file.name);
        console.log(`✓ Migrated: ${file.name}`);
      } catch (error) {
        console.error(`✗ Migration failed: ${file.name}`, error);
        throw error;
      }
    }

    return { message: `Ran ${executedMigrations.length} migration(s)`, executed: executedMigrations };
  }

  /**
   * Rollback migrations
   * @param {number} steps - Number of batches to rollback
   * @returns {Promise<Array>}
   */
  async down(steps = 1) {
    await this.init();

    const executed = await this.getExecutedMigrations();
    const currentBatch = await this.getCurrentBatch();
    const targetBatch = Math.max(0, currentBatch - steps);

    // Get migrations in current batch(es) to rollback
    const dbType = this.dbPool.type.toLowerCase();
    let migrationsToRollback = [];

    if (dbType === 'mongodb') {
      const collection = this.dbPool.db.collection(this.tableName);
      migrationsToRollback = await collection
        .find({ batch: { $gt: targetBatch } })
        .sort({ batch: -1, executed_at: -1 })
        .toArray();
    } else {
      const result = await this.dbPool.query(
        `SELECT ${this._escapeIdentifier('name')}, ${this._escapeIdentifier('batch')} FROM ${this._escapeIdentifier(this.tableName)} WHERE ${this._escapeIdentifier('batch')} > ? ORDER BY ${this._escapeIdentifier('batch')} DESC, ${this._escapeIdentifier('executed_at')} DESC`,
        [targetBatch]
      );
      
      if (this.dbPool.type.toLowerCase() === 'postgres' || this.dbPool.type.toLowerCase() === 'postgresql') {
        migrationsToRollback = result.rows;
      } else {
        migrationsToRollback = result;
      }
    }

    const rolledBack = [];

    for (const migrationRecord of migrationsToRollback) {
      const migrationName = migrationRecord.name;
      const file = this.getMigrationFiles().find(f => f.name === migrationName);

      if (!file) {
        console.warn(`Warning: Migration file not found: ${migrationName}`);
        continue;
      }

      try {
        // Load migration
        delete require.cache[require.resolve(file.path)];
        const migration = require(file.path);

        if (!migration.down || typeof migration.down !== 'function') {
          console.warn(`Warning: Migration ${migrationName} has no 'down' function, skipping`);
          continue;
        }

        // Run rollback
        await migration.down(this.dbPool);

        // Remove migration record
        await this.removeMigration(migrationName);

        rolledBack.push(migrationName);
        console.log(`✓ Rolled back: ${migrationName}`);
      } catch (error) {
        console.error(`✗ Rollback failed: ${migrationName}`, error);
        throw error;
      }
    }

    return { message: `Rolled back ${rolledBack.length} migration(s)`, rolledBack };
  }

  /**
   * Record migration execution
   * @private
   */
  async recordMigration(name, batch) {
    const dbType = this.dbPool.type.toLowerCase();

    if (dbType === 'mongodb') {
      const collection = this.dbPool.db.collection(this.tableName);
      await collection.insertOne({
        name,
        batch,
        executed_at: new Date(),
      });
    } else {
      await this.dbPool.query(
        `INSERT INTO ${this._escapeIdentifier(this.tableName)} (${this._escapeIdentifier('name')}, ${this._escapeIdentifier('batch')}, ${this._escapeIdentifier('executed_at')}) VALUES (?, ?, ?)`,
        [name, batch, new Date()]
      );
    }
  }

  /**
   * Remove migration record
   * @private
   */
  async removeMigration(name) {
    const dbType = this.dbPool.type.toLowerCase();

    if (dbType === 'mongodb') {
      const collection = this.dbPool.db.collection(this.tableName);
      await collection.deleteOne({ name });
    } else {
      await this.dbPool.query(
        `DELETE FROM ${this._escapeIdentifier(this.tableName)} WHERE ${this._escapeIdentifier('name')} = ?`,
        [name]
      );
    }
  }

  /**
   * Get migration status
   * @returns {Promise<Object>}
   */
  async status() {
    await this.init();

    const files = this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const pending = files.filter(file => !executed.includes(file.name));

    return {
      executed: executed.length,
      pending: pending.length,
      files: files.map(file => ({
        name: file.name,
        executed: executed.includes(file.name),
      })),
    };
  }

  /**
   * Escape identifier for SQL
   * @private
   */
  _escapeIdentifier(identifier) {
    const dbType = this.dbPool.type.toLowerCase();

    if (dbType === 'postgres' || dbType === 'postgresql') {
      return `"${identifier}"`;
    } else if (dbType === 'mysql' || dbType === 'mariadb') {
      return `\`${identifier}\``;
    } else if (dbType === 'sqlite' || dbType === 'sqlite3') {
      return `"${identifier}"`;
    } else if (dbType === 'mssql' || dbType === 'sqlserver') {
      return `[${identifier}]`;
    } else {
      return `"${identifier}"`;
    }
  }
}

/**
 * Create migration instance
 * @param {DatabasePool} dbPool - Database pool
 * @param {string} migrationsPath - Path to migrations directory
 * @returns {Migration}
 */
function createMigration(dbPool, migrationsPath = './migrations') {
  return new Migration(dbPool, migrationsPath);
}

module.exports = {
  Migration,
  createMigration,
};

