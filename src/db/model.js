/**
 * ORM-like Model Base Class
 * v5.7: Model definitions with relationships, hooks, and validation
 */

const { queryBuilder, mongoQueryBuilder } = require('./db-pool');

class Model {
  constructor(data = {}) {
    this._data = {};
    this._original = {};
    this._changed = {};
    this._isNew = true;
    this._dbPool = null;

    // Set initial data
    if (data) {
      Object.assign(this._data, data);
      Object.assign(this._original, data);
    }

    // Set properties
    Object.keys(this._data).forEach(key => {
      if (!key.startsWith('_')) {
        Object.defineProperty(this, key, {
          get: () => this._data[key],
          set: (value) => {
            this._data[key] = value;
            this._changed[key] = value;
          },
          enumerable: true,
          configurable: true,
        });
      }
    });
  }

  /**
   * Get table/collection name
   * @returns {string}
   */
  static get tableName() {
    return this.name.toLowerCase() + 's';
  }

  /**
   * Get primary key field
   * @returns {string}
   */
  static get primaryKey() {
    return 'id';
  }

  /**
   * Set database pool
   * @param {DatabasePool} dbPool
   */
  static setDatabase(dbPool) {
    this._dbPool = dbPool;
  }

  /**
   * Get database pool
   * @returns {DatabasePool}
   */
  static getDatabase() {
    return this._dbPool;
  }

  /**
   * Find records
   * @param {Object|Function} conditions - Where conditions
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  static async find(conditions = {}, options = {}) {
    const db = this.getDatabase();
    if (!db) {
      throw new Error('Database not set. Use Model.setDatabase(dbPool)');
    }

    const tableName = this.tableName;
    const dbType = db.type.toLowerCase();

    if (dbType === 'mongodb') {
      const qb = mongoQueryBuilder(db, tableName);
      
      if (typeof conditions === 'function') {
        conditions(qb);
      } else if (typeof conditions === 'object' && Object.keys(conditions).length > 0) {
        Object.keys(conditions).forEach(key => {
          qb.where(key, conditions[key]);
        });
      }

      if (options.select) {
        qb.select(options.select);
      }

      if (options.sort) {
        if (typeof options.sort === 'string') {
          qb.sortAsc(options.sort);
        } else if (typeof options.sort === 'object') {
          Object.keys(options.sort).forEach(key => {
            if (options.sort[key] === 1 || options.sort[key] === 'asc') {
              qb.sortAsc(key);
            } else {
              qb.sortDesc(key);
            }
          });
        }
      }

      if (options.limit) {
        qb.limit(options.limit);
      }

      if (options.skip) {
        qb.skip(options.skip);
      }

      const results = await qb.find();
      return results.map(row => new this(row));
    } else {
      const qb = queryBuilder(db, tableName);

      if (typeof conditions === 'function') {
        conditions(qb);
      } else if (typeof conditions === 'object' && Object.keys(conditions).length > 0) {
        Object.keys(conditions).forEach(key => {
          if (Array.isArray(conditions[key])) {
            qb.whereIn(key, conditions[key]);
          } else {
            qb.where(key, '=', conditions[key]);
          }
        });
      }

      if (options.select) {
        qb.select(Array.isArray(options.select) ? options.select : [options.select]);
      }

      if (options.orderBy) {
        if (typeof options.orderBy === 'string') {
          qb.orderBy(options.orderBy, options.orderDirection || 'ASC');
        } else if (typeof options.orderBy === 'object') {
          Object.keys(options.orderBy).forEach(key => {
            qb.orderBy(key, options.orderBy[key]);
          });
        }
      }

      if (options.limit) {
        qb.limit(options.limit);
      }

      if (options.offset) {
        qb.offset(options.offset);
      }

      const results = await qb.execute();
      return results.map(row => new this(row));
    }
  }

  /**
   * Find one record
   * @param {Object|Function} conditions - Where conditions
   * @param {Object} options - Query options
   * @returns {Promise<Model|null>}
   */
  static async findOne(conditions = {}, options = {}) {
    const results = await this.find(conditions, { ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find by primary key
   * @param {*} id - Primary key value
   * @returns {Promise<Model|null>}
   */
  static async findById(id) {
    return await this.findOne({ [this.primaryKey]: id });
  }

  /**
   * Count records
   * @param {Object|Function} conditions - Where conditions
   * @returns {Promise<number>}
   */
  static async count(conditions = {}) {
    const db = this.getDatabase();
    if (!db) {
      throw new Error('Database not set. Use Model.setDatabase(dbPool)');
    }

    const tableName = this.tableName;
    const dbType = db.type.toLowerCase();

    if (dbType === 'mongodb') {
      const qb = mongoQueryBuilder(db, tableName);
      
      if (typeof conditions === 'function') {
        conditions(qb);
      } else if (typeof conditions === 'object' && Object.keys(conditions).length > 0) {
        Object.keys(conditions).forEach(key => {
          qb.where(key, conditions[key]);
        });
      }

      return await qb.count();
    } else {
      // For SQL, we need to use a subquery or COUNT
      const qb = queryBuilder(db, tableName);

      if (typeof conditions === 'function') {
        conditions(qb);
      } else if (typeof conditions === 'object' && Object.keys(conditions).length > 0) {
        Object.keys(conditions).forEach(key => {
          if (Array.isArray(conditions[key])) {
            qb.whereIn(key, conditions[key]);
          } else {
            qb.where(key, '=', conditions[key]);
          }
        });
      }

      const { sql, params } = qb.toSQL();
      const countSql = `SELECT COUNT(*) as count FROM (${sql}) as subquery`;
      const result = await db.query(countSql, params);
      return dbType === 'postgres' || dbType === 'postgresql' 
        ? parseInt(result.rows[0].count) 
        : parseInt(result[0].count);
    }
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Model>}
   */
  static async create(data) {
    const instance = new this(data);
    await instance.save();
    return instance;
  }

  /**
   * Save the model (insert or update)
   * @returns {Promise<boolean>}
   */
  async save() {
    const db = this.constructor.getDatabase();
    if (!db) {
      throw new Error('Database not set. Use Model.setDatabase(dbPool)');
    }

    // Run beforeSave hook
    if (this.beforeSave) {
      await this.beforeSave();
    }

    const tableName = this.constructor.tableName;
    const primaryKey = this.constructor.primaryKey;
    const dbType = db.type.toLowerCase();

    // Validate
    if (this.validate && !(await this.validate())) {
      throw new Error('Validation failed');
    }

    if (this._isNew || !this._data[primaryKey]) {
      // INSERT
      if (this.beforeCreate) {
        await this.beforeCreate();
      }

      if (dbType === 'mongodb') {
        const result = await mongoQueryBuilder(db, tableName)
          .insert(this._data)
          .execute();
        
        if (result.insertedId) {
          this._data[primaryKey] = result.insertedId.toString();
        }
      } else {
        const result = await queryBuilder(db)
          .insert(tableName, this._data)
          .execute();
        
        if (result.insertId || result.id) {
          this._data[primaryKey] = result.insertId || result.id;
        } else if (result.rows && result.rows[0]) {
          this._data[primaryKey] = result.rows[0][primaryKey];
        }
      }

      this._isNew = false;
      Object.assign(this._original, this._data);

      if (this.afterCreate) {
        await this.afterCreate();
      }
    } else {
      // UPDATE
      if (this.beforeUpdate) {
        await this.beforeUpdate();
      }

      const updateData = { ...this._changed };
      if (Object.keys(updateData).length === 0) {
        return true; // No changes
      }

      if (dbType === 'mongodb') {
        await mongoQueryBuilder(db, tableName)
          .update(updateData)
          .where(primaryKey, this._data[primaryKey])
          .execute();
      } else {
        await queryBuilder(db)
          .update(tableName, updateData)
          .where(primaryKey, '=', this._data[primaryKey])
          .execute();
      }

      Object.assign(this._original, this._data);
      this._changed = {};

      if (this.afterUpdate) {
        await this.afterUpdate();
      }
    }

    if (this.afterSave) {
      await this.afterSave();
    }

    return true;
  }

  /**
   * Delete the model
   * @returns {Promise<boolean>}
   */
  async delete() {
    const db = this.constructor.getDatabase();
    if (!db) {
      throw new Error('Database not set. Use Model.setDatabase(dbPool)');
    }

    const primaryKey = this.constructor.primaryKey;
    const id = this._data[primaryKey];

    if (!id) {
      throw new Error('Cannot delete model without primary key');
    }

    if (this.beforeDelete) {
      await this.beforeDelete();
    }

    const tableName = this.constructor.tableName;
    const dbType = db.type.toLowerCase();

    if (dbType === 'mongodb') {
      await mongoQueryBuilder(db, tableName)
        .delete()
        .where(primaryKey, id)
        .execute();
    } else {
      await queryBuilder(db)
        .delete(tableName)
        .where(primaryKey, '=', id)
        .execute();
    }

    if (this.afterDelete) {
      await this.afterDelete();
    }

    return true;
  }

  /**
   * Reload model from database
   * @returns {Promise<Model>}
   */
  async reload() {
    const primaryKey = this.constructor.primaryKey;
    const id = this._data[primaryKey];

    if (!id) {
      throw new Error('Cannot reload model without primary key');
    }

    const fresh = await this.constructor.findById(id);
    if (!fresh) {
      throw new Error('Model not found');
    }

    Object.assign(this._data, fresh._data);
    Object.assign(this._original, fresh._data);
    this._changed = {};
    this._isNew = false;

    return this;
  }

  /**
   * Convert model to plain object
   * @returns {Object}
   */
  toJSON() {
    return { ...this._data };
  }

  /**
   * Check if model has been modified
   * @returns {boolean}
   */
  isDirty() {
    return Object.keys(this._changed).length > 0;
  }

  /**
   * Get changed fields
   * @returns {Object}
   */
  getChanged() {
    return { ...this._changed };
  }

  /**
   * Define a relationship
   * @param {string} name - Relationship name
   * @param {Function} ModelClass - Related model class
   * @param {string} foreignKey - Foreign key field
   * @param {string} localKey - Local key field (default: primaryKey)
   */
  static hasMany(name, ModelClass, foreignKey, localKey = null) {
    const primaryKey = this.primaryKey;
    const local = localKey || primaryKey;

    Object.defineProperty(this.prototype, name, {
      async get() {
        const id = this._data[local];
        if (!id) {
          return [];
        }
        return await ModelClass.find({ [foreignKey]: id });
      },
      enumerable: true,
      configurable: true,
    });
  }

  /**
   * Define a belongsTo relationship
   * @param {string} name - Relationship name
   * @param {Function} ModelClass - Related model class
   * @param {string} foreignKey - Foreign key field
   */
  static belongsTo(name, ModelClass, foreignKey) {
    Object.defineProperty(this.prototype, name, {
      async get() {
        const id = this._data[foreignKey];
        if (!id) {
          return null;
        }
        return await ModelClass.findById(id);
      },
      enumerable: true,
      configurable: true,
    });
  }

  /**
   * Define a hasOne relationship
   * @param {string} name - Relationship name
   * @param {Function} ModelClass - Related model class
   * @param {string} foreignKey - Foreign key field
   * @param {string} localKey - Local key field (default: primaryKey)
   */
  static hasOne(name, ModelClass, foreignKey, localKey = null) {
    const primaryKey = this.primaryKey;
    const local = localKey || primaryKey;

    Object.defineProperty(this.prototype, name, {
      async get() {
        const id = this._data[local];
        if (!id) {
          return null;
        }
        return await ModelClass.findOne({ [foreignKey]: id });
      },
      enumerable: true,
      configurable: true,
    });
  }
}

module.exports = { Model };

