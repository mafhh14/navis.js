/**
 * MongoDB Query Builder
 * v5.6: Fluent MongoDB query builder
 */

class MongoDBQueryBuilder {
  constructor(dbPool, collection = null) {
    this.dbPool = dbPool;
    this.collection = collection;
    this.queryType = null;
    this.filter = {};
    this.projection = {};
    this.sortFields = {};
    this.limitValue = null;
    this.skipValue = null;
    this.updateData = {};
    this.insertData = null;
    this.aggregatePipeline = [];
  }

  /**
   * Set collection name
   * @param {string} collection - Collection name
   * @returns {MongoDBQueryBuilder}
   */
  collection(collection) {
    this.collection = collection;
    return this;
  }

  /**
   * Add WHERE condition (filter)
   * @param {string|Object} field - Field name or filter object
   * @param {*} value - Value to compare
   * @returns {MongoDBQueryBuilder}
   */
  where(field, value = null) {
    if (typeof field === 'object') {
      Object.assign(this.filter, field);
    } else {
      this.filter[field] = value;
    }
    return this;
  }

  /**
   * Add WHERE equals condition
   */
  equals(field, value) {
    this.filter[field] = value;
    return this;
  }

  /**
   * Add WHERE not equals condition
   */
  notEquals(field, value) {
    this.filter[field] = { $ne: value };
    return this;
  }

  /**
   * Add WHERE greater than condition
   */
  gt(field, value) {
    this.filter[field] = { $gt: value };
    return this;
  }

  /**
   * Add WHERE greater than or equal condition
   */
  gte(field, value) {
    this.filter[field] = { $gte: value };
    return this;
  }

  /**
   * Add WHERE less than condition
   */
  lt(field, value) {
    this.filter[field] = { $lt: value };
    return this;
  }

  /**
   * Add WHERE less than or equal condition
   */
  lte(field, value) {
    this.filter[field] = { $lte: value };
    return this;
  }

  /**
   * Add WHERE IN condition
   */
  in(field, values) {
    this.filter[field] = { $in: values };
    return this;
  }

  /**
   * Add WHERE NOT IN condition
   */
  notIn(field, values) {
    this.filter[field] = { $nin: values };
    return this;
  }

  /**
   * Add WHERE contains condition (regex)
   */
  contains(field, value, caseSensitive = false) {
    this.filter[field] = {
      $regex: value,
      $options: caseSensitive ? '' : 'i',
    };
    return this;
  }

  /**
   * Add WHERE exists condition
   */
  exists(field, exists = true) {
    this.filter[field] = { $exists: exists };
    return this;
  }

  /**
   * Add WHERE null condition
   */
  whereNull(field) {
    this.filter[field] = null;
    return this;
  }

  /**
   * Add WHERE not null condition
   */
  whereNotNull(field) {
    this.filter[field] = { $ne: null };
    return this;
  }

  /**
   * Add AND condition
   */
  and(conditions) {
    if (!this.filter.$and) {
      this.filter.$and = [];
    }
    this.filter.$and.push(conditions);
    return this;
  }

  /**
   * Add OR condition
   */
  or(conditions) {
    if (!this.filter.$or) {
      this.filter.$or = [];
    }
    this.filter.$or.push(conditions);
    return this;
  }

  /**
   * Select fields to return (projection)
   * @param {Object|Array|string} fields - Fields to select
   * @returns {MongoDBQueryBuilder}
   */
  select(fields) {
    if (Array.isArray(fields)) {
      fields.forEach(field => {
        this.projection[field] = 1;
      });
    } else if (typeof fields === 'string') {
      this.projection[fields] = 1;
    } else if (typeof fields === 'object') {
      Object.assign(this.projection, fields);
    }
    return this;
  }

  /**
   * Exclude fields from result
   */
  exclude(fields) {
    if (Array.isArray(fields)) {
      fields.forEach(field => {
        this.projection[field] = 0;
      });
    } else if (typeof fields === 'string') {
      this.projection[fields] = 0;
    }
    return this;
  }

  /**
   * Add SORT clause
   * @param {string|Object} field - Field name or sort object
   * @param {number} direction - 1 for ascending, -1 for descending
   * @returns {MongoDBQueryBuilder}
   */
  sort(field, direction = 1) {
    if (typeof field === 'object') {
      Object.assign(this.sortFields, field);
    } else {
      this.sortFields[field] = direction;
    }
    return this;
  }

  /**
   * Sort ascending
   */
  sortAsc(field) {
    return this.sort(field, 1);
  }

  /**
   * Sort descending
   */
  sortDesc(field) {
    return this.sort(field, -1);
  }

  /**
   * Add LIMIT clause
   */
  limit(limit) {
    this.limitValue = limit;
    return this;
  }

  /**
   * Add SKIP clause
   */
  skip(skip) {
    this.skipValue = skip;
    return this;
  }

  /**
   * Execute FIND query
   * @returns {Promise<Array>}
   */
  async find() {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }

    const collection = this.dbPool.db.collection(this.collection);
    let query = collection.find(this.filter);

    if (Object.keys(this.projection).length > 0) {
      query = query.project(this.projection);
    }

    if (Object.keys(this.sortFields).length > 0) {
      query = query.sort(this.sortFields);
    }

    if (this.skipValue !== null) {
      query = query.skip(this.skipValue);
    }

    if (this.limitValue !== null) {
      query = query.limit(this.limitValue);
    }

    return await query.toArray();
  }

  /**
   * Execute FIND ONE query
   * @returns {Promise<Object|null>}
   */
  async findOne() {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }

    const collection = this.dbPool.db.collection(this.collection);
    let query = collection.findOne(this.filter);

    if (Object.keys(this.projection).length > 0) {
      query = query.project(this.projection);
    }

    if (Object.keys(this.sortFields).length > 0) {
      query = query.sort(this.sortFields);
    }

    return await query;
  }

  /**
   * Execute COUNT query
   * @returns {Promise<number>}
   */
  async count() {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }

    const collection = this.dbPool.db.collection(this.collection);
    return await collection.countDocuments(this.filter);
  }

  /**
   * Start an INSERT query
   * @param {Object|Array} data - Data to insert
   * @returns {MongoDBQueryBuilder}
   */
  insert(data) {
    this.queryType = 'INSERT';
    this.insertData = data;
    return this;
  }

  /**
   * Execute INSERT query
   * @returns {Promise<Object>}
   */
  async execute() {
    if (this.queryType === 'INSERT') {
      return await this._executeInsert();
    } else if (this.queryType === 'UPDATE') {
      return await this._executeUpdate();
    } else if (this.queryType === 'DELETE') {
      return await this._executeDelete();
    } else {
      return await this.find();
    }
  }

  /**
   * Execute INSERT
   * @private
   */
  async _executeInsert() {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }

    const collection = this.dbPool.db.collection(this.collection);
    
    if (Array.isArray(this.insertData)) {
      const result = await collection.insertMany(this.insertData);
      return { insertedCount: result.insertedCount, insertedIds: result.insertedIds };
    } else {
      const result = await collection.insertOne(this.insertData);
      return { insertedCount: 1, insertedId: result.insertedId };
    }
  }

  /**
   * Start an UPDATE query
   * @param {Object} data - Update data
   * @param {Object} options - Update options (upsert, multi, etc.)
   * @returns {MongoDBQueryBuilder}
   */
  update(data, options = {}) {
    this.queryType = 'UPDATE';
    this.updateData = data;
    this.updateOptions = options;
    return this;
  }

  /**
   * Execute UPDATE query
   * @private
   */
  async _executeUpdate() {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }

    const collection = this.dbPool.db.collection(this.collection);
    const updateOptions = {
      upsert: this.updateOptions.upsert || false,
      ...this.updateOptions,
    };

    if (this.updateOptions.multi !== false) {
      const result = await collection.updateMany(this.filter, { $set: this.updateData }, updateOptions);
      return { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount };
    } else {
      const result = await collection.updateOne(this.filter, { $set: this.updateData }, updateOptions);
      return { modifiedCount: result.modifiedCount, matchedCount: result.matchedCount };
    }
  }

  /**
   * Start a DELETE query
   * @param {Object} options - Delete options
   * @returns {MongoDBQueryBuilder}
   */
  delete(options = {}) {
    this.queryType = 'DELETE';
    this.deleteOptions = options;
    return this;
  }

  /**
   * Execute DELETE query
   * @private
   */
  async _executeDelete() {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }

    const collection = this.dbPool.db.collection(this.collection);
    
    if (this.deleteOptions.multi !== false) {
      const result = await collection.deleteMany(this.filter);
      return { deletedCount: result.deletedCount };
    } else {
      const result = await collection.deleteOne(this.filter);
      return { deletedCount: result.deletedCount };
    }
  }

  /**
   * Start aggregation pipeline
   * @returns {MongoDBQueryBuilder}
   */
  aggregate() {
    this.queryType = 'AGGREGATE';
    this.aggregatePipeline = [];
    return this;
  }

  /**
   * Add $match stage
   */
  match(filter) {
    this.aggregatePipeline.push({ $match: filter });
    return this;
  }

  /**
   * Add $group stage
   */
  group(group) {
    this.aggregatePipeline.push({ $group: group });
    return this;
  }

  /**
   * Add $project stage
   */
  project(projection) {
    this.aggregatePipeline.push({ $project: projection });
    return this;
  }

  /**
   * Add $sort stage
   */
  sortStage(sort) {
    this.aggregatePipeline.push({ $sort: sort });
    return this;
  }

  /**
   * Add $limit stage
   */
  limitStage(limit) {
    this.aggregatePipeline.push({ $limit: limit });
    return this;
  }

  /**
   * Add $skip stage
   */
  skipStage(skip) {
    this.aggregatePipeline.push({ $skip: skip });
    return this;
  }

  /**
   * Execute aggregation
   * @returns {Promise<Array>}
   */
  async aggregateExecute() {
    if (!this.collection) {
      throw new Error('Collection name is required');
    }

    const collection = this.dbPool.db.collection(this.collection);
    return await collection.aggregate(this.aggregatePipeline).toArray();
  }
}

/**
 * Create a MongoDB query builder instance
 * @param {DatabasePool} dbPool - Database pool instance
 * @param {string} collection - Optional collection name
 * @returns {MongoDBQueryBuilder}
 */
function createMongoDBQueryBuilder(dbPool, collection = null) {
  return new MongoDBQueryBuilder(dbPool, collection);
}

module.exports = {
  MongoDBQueryBuilder,
  createMongoDBQueryBuilder,
};

