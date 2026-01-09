/**
 * Advanced Query Builder
 * v5.6: Fluent SQL query builder with multi-database support
 */

class QueryBuilder {
  constructor(dbPool, table = null) {
    this.dbPool = dbPool;
    this.table = table;
    this.queryType = null;
    this.selectFields = [];
    this.insertData = {};
    this.updateData = {};
    this.whereConditions = [];
    this.joinClauses = [];
    this.groupByFields = [];
    this.havingConditions = [];
    this.orderByFields = [];
    this.limitValue = null;
    this.offsetValue = null;
    this.params = [];
    this.paramIndex = 0;
  }

  /**
   * Start a SELECT query
   * @param {string|Array} fields - Fields to select
   * @returns {QueryBuilder}
   */
  select(fields = '*') {
    this.queryType = 'SELECT';
    this.selectFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * Set table name
   * @param {string} table - Table name
   * @returns {QueryBuilder}
   */
  from(table) {
    this.table = table;
    return this;
  }

  /**
   * Add WHERE condition
   * @param {string|Object|Function} field - Field name, object with conditions, or callback for nested conditions
   * @param {string} operator - Operator (=, !=, >, <, >=, <=, LIKE, IN, NOT IN, etc.)
   * @param {*} value - Value to compare
   * @returns {QueryBuilder}
   */
  where(field, operator = null, value = null) {
    if (typeof field === 'function') {
      // Nested conditions: where(() => qb.where(...).orWhere(...))
      const subBuilder = new QueryBuilder(this.dbPool);
      field(subBuilder);
      this.whereConditions.push({
        type: 'nested',
        conditions: subBuilder.whereConditions,
        logic: 'AND',
      });
      this.params.push(...subBuilder.params);
    } else if (typeof field === 'object') {
      // Object syntax: where({ name: 'John', age: 25 })
      Object.keys(field).forEach(key => {
        this.where(key, '=', field[key]);
      });
    } else {
      // Standard syntax: where('name', '=', 'John')
      if (operator === null && value === null) {
        // where('name') - assumes = true
        operator = '=';
        value = true;
      } else if (value === null) {
        // where('name', 'John') - assumes =
        value = operator;
        operator = '=';
      }

      const param = this._addParam(value);
      this.whereConditions.push({
        field,
        operator: operator.toUpperCase(),
        value: param,
        logic: 'AND',
      });
    }
    return this;
  }

  /**
   * Add OR WHERE condition
   * @param {string|Object|Function} field - Field name, object, or callback
   * @param {string} operator - Operator
   * @param {*} value - Value
   * @returns {QueryBuilder}
   */
  orWhere(field, operator = null, value = null) {
    if (typeof field === 'function') {
      const subBuilder = new QueryBuilder(this.dbPool);
      field(subBuilder);
      this.whereConditions.push({
        type: 'nested',
        conditions: subBuilder.whereConditions,
        logic: 'OR',
      });
      this.params.push(...subBuilder.params);
    } else if (typeof field === 'object') {
      Object.keys(field).forEach(key => {
        this.orWhere(key, '=', field[key]);
      });
    } else {
      if (operator === null && value === null) {
        operator = '=';
        value = true;
      } else if (value === null) {
        value = operator;
        operator = '=';
      }

      const param = this._addParam(value);
      this.whereConditions.push({
        field,
        operator: operator.toUpperCase(),
        value: param,
        logic: 'OR',
      });
    }
    return this;
  }

  /**
   * Add WHERE IN condition
   * @param {string} field - Field name
   * @param {Array} values - Array of values
   * @returns {QueryBuilder}
   */
  whereIn(field, values) {
    if (!Array.isArray(values) || values.length === 0) {
      return this.where(field, 'IN', []);
    }

    const params = values.map(v => this._addParam(v));
    this.whereConditions.push({
      field,
      operator: 'IN',
      value: `(${params.join(', ')})`,
      logic: 'AND',
    });
    return this;
  }

  /**
   * Add WHERE NOT IN condition
   * @param {string} field - Field name
   * @param {Array} values - Array of values
   * @returns {QueryBuilder}
   */
  whereNotIn(field, values) {
    if (!Array.isArray(values) || values.length === 0) {
      return this.where(field, 'NOT IN', []);
    }

    const params = values.map(v => this._addParam(v));
    this.whereConditions.push({
      field,
      operator: 'NOT IN',
      value: `(${params.join(', ')})`,
      logic: 'AND',
    });
    return this;
  }

  /**
   * Add WHERE NULL condition
   * @param {string} field - Field name
   * @returns {QueryBuilder}
   */
  whereNull(field) {
    this.whereConditions.push({
      field,
      operator: 'IS',
      value: 'NULL',
      logic: 'AND',
    });
    return this;
  }

  /**
   * Add WHERE NOT NULL condition
   * @param {string} field - Field name
   * @returns {QueryBuilder}
   */
  whereNotNull(field) {
    this.whereConditions.push({
      field,
      operator: 'IS NOT',
      value: 'NULL',
      logic: 'AND',
    });
    return this;
  }

  /**
   * Add JOIN clause
   * @param {string} table - Table to join
   * @param {string} first - First field
   * @param {string} operator - Operator
   * @param {string} second - Second field
   * @param {string} type - Join type (INNER, LEFT, RIGHT, FULL)
   * @returns {QueryBuilder}
   */
  join(table, first, operator = '=', second, type = 'INNER') {
    this.joinClauses.push({
      type: type.toUpperCase(),
      table,
      first,
      operator,
      second,
    });
    return this;
  }

  /**
   * Add LEFT JOIN
   */
  leftJoin(table, first, operator = '=', second) {
    return this.join(table, first, operator, second, 'LEFT');
  }

  /**
   * Add RIGHT JOIN
   */
  rightJoin(table, first, operator = '=', second) {
    return this.join(table, first, operator, second, 'RIGHT');
  }

  /**
   * Add FULL JOIN
   */
  fullJoin(table, first, operator = '=', second) {
    return this.join(table, first, operator, second, 'FULL');
  }

  /**
   * Add GROUP BY clause
   * @param {string|Array} fields - Fields to group by
   * @returns {QueryBuilder}
   */
  groupBy(fields) {
    this.groupByFields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  /**
   * Add HAVING condition
   * @param {string} field - Field name
   * @param {string} operator - Operator
   * @param {*} value - Value
   * @returns {QueryBuilder}
   */
  having(field, operator, value) {
    const param = this._addParam(value);
    this.havingConditions.push({
      field,
      operator: operator.toUpperCase(),
      value: param,
    });
    return this;
  }

  /**
   * Add ORDER BY clause
   * @param {string|Array|Object} field - Field name, array of fields, or object with field and direction
   * @param {string} direction - ASC or DESC
   * @returns {QueryBuilder}
   */
  orderBy(field, direction = 'ASC') {
    if (Array.isArray(field)) {
      this.orderByFields = field.map(f => ({ field: f, direction: 'ASC' }));
    } else if (typeof field === 'object') {
      Object.keys(field).forEach(key => {
        this.orderByFields.push({ field: key, direction: field[key].toUpperCase() });
      });
    } else {
      this.orderByFields.push({ field, direction: direction.toUpperCase() });
    }
    return this;
  }

  /**
   * Add ORDER BY DESC
   */
  orderByDesc(field) {
    return this.orderBy(field, 'DESC');
  }

  /**
   * Add LIMIT clause
   * @param {number} limit - Number of rows
   * @returns {QueryBuilder}
   */
  limit(limit) {
    this.limitValue = limit;
    return this;
  }

  /**
   * Add OFFSET clause
   * @param {number} offset - Number of rows to skip
   * @returns {QueryBuilder}
   */
  offset(offset) {
    this.offsetValue = offset;
    return this;
  }

  /**
   * Start an INSERT query
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @returns {QueryBuilder}
   */
  insert(table, data = {}) {
    this.queryType = 'INSERT';
    this.table = table;
    this.insertData = data;
    return this;
  }

  /**
   * Start an UPDATE query
   * @param {string} table - Table name
   * @param {Object} data - Data to update
   * @returns {QueryBuilder}
   */
  update(table, data = {}) {
    this.queryType = 'UPDATE';
    this.table = table;
    this.updateData = data;
    return this;
  }

  /**
   * Start a DELETE query
   * @param {string} table - Table name
   * @returns {QueryBuilder}
   */
  delete(table = null) {
    this.queryType = 'DELETE';
    if (table) {
      this.table = table;
    }
    return this;
  }

  /**
   * Execute the query
   * @returns {Promise<*>} - Query result
   */
  async execute() {
    if (!this.queryType) {
      throw new Error('No query type specified. Use select(), insert(), update(), or delete()');
    }

    if (!this.table && this.queryType !== 'SELECT') {
      throw new Error('Table name is required');
    }

    const sql = this._buildSQL();
    return await this.dbPool.query(sql, this.params);
  }

  /**
   * Get the SQL string (for debugging)
   * @returns {string}
   */
  toSQL() {
    return {
      sql: this._buildSQL(),
      params: this.params,
    };
  }

  /**
   * Build SQL query string
   * @private
   */
  _buildSQL() {
    switch (this.queryType) {
      case 'SELECT':
        return this._buildSelect();
      case 'INSERT':
        return this._buildInsert();
      case 'UPDATE':
        return this._buildUpdate();
      case 'DELETE':
        return this._buildDelete();
      default:
        throw new Error(`Unsupported query type: ${this.queryType}`);
    }
  }

  /**
   * Build SELECT query
   * @private
   */
  _buildSelect() {
    let sql = 'SELECT ';

    // Fields
    sql += this.selectFields.length > 0 ? this.selectFields.join(', ') : '*';

    // FROM
    if (this.table) {
      sql += ` FROM ${this._escapeIdentifier(this.table)}`;
    }

    // JOINs
    this.joinClauses.forEach(join => {
      sql += ` ${join.type} JOIN ${this._escapeIdentifier(join.table)} ON ${this._escapeIdentifier(join.first)} ${join.operator} ${this._escapeIdentifier(join.second)}`;
    });

    // WHERE
    if (this.whereConditions.length > 0) {
      sql += ' WHERE ' + this._buildWhereClause();
    }

    // GROUP BY
    if (this.groupByFields.length > 0) {
      sql += ' GROUP BY ' + this.groupByFields.map(f => this._escapeIdentifier(f)).join(', ');
    }

    // HAVING
    if (this.havingConditions.length > 0) {
      sql += ' HAVING ' + this.havingConditions.map(h => {
        return `${this._escapeIdentifier(h.field)} ${h.operator} ${h.value}`;
      }).join(' AND ');
    }

    // ORDER BY
    if (this.orderByFields.length > 0) {
      sql += ' ORDER BY ' + this.orderByFields.map(o => {
        return `${this._escapeIdentifier(o.field)} ${o.direction}`;
      }).join(', ');
    }

    // LIMIT and OFFSET (database-specific)
    const dbType = this.dbPool.type.toLowerCase();
    if (dbType === 'postgres' || dbType === 'postgresql') {
      if (this.limitValue !== null) {
        sql += ` LIMIT ${this.limitValue}`;
      }
      if (this.offsetValue !== null) {
        sql += ` OFFSET ${this.offsetValue}`;
      }
    } else if (dbType === 'mysql' || dbType === 'mariadb') {
      if (this.limitValue !== null) {
        sql += ` LIMIT ${this.limitValue}`;
        if (this.offsetValue !== null) {
          sql += ` OFFSET ${this.offsetValue}`;
        }
      }
    } else if (dbType === 'sqlite' || dbType === 'sqlite3') {
      if (this.limitValue !== null) {
        sql += ` LIMIT ${this.limitValue}`;
        if (this.offsetValue !== null) {
          sql += ` OFFSET ${this.offsetValue}`;
        }
      }
    } else if (dbType === 'mssql' || dbType === 'sqlserver') {
      // SQL Server uses TOP instead of LIMIT
      if (this.orderByFields.length === 0 && this.limitValue !== null) {
        // If no ORDER BY, we can use TOP
        sql = sql.replace('SELECT ', `SELECT TOP ${this.limitValue} `);
      } else if (this.limitValue !== null) {
        // With ORDER BY, use OFFSET/FETCH
        if (this.offsetValue !== null) {
          sql += ` OFFSET ${this.offsetValue} ROWS`;
        }
        sql += ` FETCH NEXT ${this.limitValue} ROWS ONLY`;
      } else if (this.offsetValue !== null) {
        sql += ` OFFSET ${this.offsetValue} ROWS`;
      }
    }

    return sql;
  }

  /**
   * Build INSERT query
   * @private
   */
  _buildInsert() {
    const keys = Object.keys(this.insertData);
    const values = keys.map(key => this._addParam(this.insertData[key]));

    return `INSERT INTO ${this._escapeIdentifier(this.table)} (${keys.map(k => this._escapeIdentifier(k)).join(', ')}) VALUES (${values.join(', ')})`;
  }

  /**
   * Build UPDATE query
   * @private
   */
  _buildUpdate() {
    const sets = Object.keys(this.updateData).map(key => {
      const param = this._addParam(this.updateData[key]);
      return `${this._escapeIdentifier(key)} = ${param}`;
    });

    let sql = `UPDATE ${this._escapeIdentifier(this.table)} SET ${sets.join(', ')}`;

    if (this.whereConditions.length > 0) {
      sql += ' WHERE ' + this._buildWhereClause();
    }

    return sql;
  }

  /**
   * Build DELETE query
   * @private
   */
  _buildDelete() {
    let sql = `DELETE FROM ${this._escapeIdentifier(this.table)}`;

    if (this.whereConditions.length > 0) {
      sql += ' WHERE ' + this._buildWhereClause();
    }

    return sql;
  }

  /**
   * Build WHERE clause
   * @private
   */
  _buildWhereClause() {
    const conditions = [];
    let currentLogic = 'AND';

    this.whereConditions.forEach((condition, index) => {
      if (condition.type === 'nested') {
        if (index > 0) {
          conditions.push(condition.logic);
        }
        const nestedSql = condition.conditions.map((c, i) => {
          if (i === 0) {
            return `(${this._buildCondition(c)})`;
          }
          return `${c.logic} (${this._buildCondition(c)})`;
        }).join(' ');
        conditions.push(nestedSql);
      } else {
        if (index > 0) {
          conditions.push(condition.logic);
        }
        conditions.push(this._buildCondition(condition));
      }
    });

    return conditions.join(' ');
  }

  /**
   * Build single condition
   * @private
   */
  _buildCondition(condition) {
    const field = this._escapeIdentifier(condition.field);
    const operator = condition.operator;
    const value = condition.value;

    if (operator === 'IN' || operator === 'NOT IN') {
      return `${field} ${operator} ${value}`;
    } else if (operator === 'IS' || operator === 'IS NOT') {
      return `${field} ${operator} ${value}`;
    } else {
      return `${field} ${operator} ${value}`;
    }
  }

  /**
   * Add parameter and return placeholder
   * @private
   */
  _addParam(value) {
    const dbType = this.dbPool.type.toLowerCase();
    const index = this.paramIndex++;

    if (dbType === 'postgres' || dbType === 'postgresql') {
      this.params.push(value);
      return `$${index + 1}`;
    } else if (dbType === 'mysql' || dbType === 'mariadb' || dbType === 'sqlite' || dbType === 'sqlite3') {
      this.params.push(value);
      return '?';
    } else if (dbType === 'mssql' || dbType === 'sqlserver') {
      this.params.push(value);
      return `@p${index}`;
    } else {
      this.params.push(value);
      return '?';
    }
  }

  /**
   * Escape identifier (table/column names)
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
 * Create a query builder instance
 * @param {DatabasePool} dbPool - Database pool instance
 * @param {string} table - Optional table name
 * @returns {QueryBuilder}
 */
function createQueryBuilder(dbPool, table = null) {
  return new QueryBuilder(dbPool, table);
}

module.exports = {
  QueryBuilder,
  createQueryBuilder,
};

