/**
 * Advanced Query Builder Demo - Navis.js (TypeScript)
 * Demonstrates fluent query builder for SQL and MongoDB (v5.6)
 */

import { NavisApp, createPool, queryBuilder, mongoQueryBuilder, response, DatabasePool, QueryBuilder, MongoDBQueryBuilder } from '../src/index';

const app = new NavisApp();

interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  status?: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  in_stock: number;
}

// ============================================
// SQL Query Builder Examples
// ============================================

// Example 1: SELECT with WHERE
app.get('/sql/select', async (req, res) => {
  try {
    const db: DatabasePool = createPool({
      type: 'sqlite',
      connectionString: ':memory:',
    });

    await db.connect();

    // Create table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        age INTEGER,
        status TEXT DEFAULT 'active'
      )
    `);

    // Insert sample data
    await db.query('INSERT INTO users (name, email, age, status) VALUES (?, ?, ?, ?)', ['Alice', 'alice@example.com', 30, 'active']);
    await db.query('INSERT INTO users (name, email, age, status) VALUES (?, ?, ?, ?)', ['Bob', 'bob@example.com', 25, 'active']);

    // Query using query builder
    const users = await queryBuilder(db, 'users')
      .select(['id', 'name', 'email', 'age'])
      .where('status', '=', 'active')
      .where('age', '>', 20)
      .orderBy('age', 'DESC')
      .limit(10)
      .execute() as User[];

    await db.close();

    response.success(res, {
      method: 'SELECT with WHERE',
      users,
    });
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 500);
  }
});

// Example 2: Complex WHERE conditions
app.get('/sql/where-complex', async (req, res) => {
  try {
    const db: DatabasePool = createPool({
      type: 'sqlite',
      connectionString: ':memory:',
    });

    await db.connect();

    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL,
        category TEXT,
        in_stock INTEGER
      )
    `);

    await db.query('INSERT INTO products (name, price, category, in_stock) VALUES (?, ?, ?, ?)', ['Laptop', 999.99, 'Electronics', 10]);
    await db.query('INSERT INTO products (name, price, category, in_stock) VALUES (?, ?, ?, ?)', ['Book', 19.99, 'Books', 0]);

    // Complex WHERE with nested conditions
    const products = await queryBuilder(db, 'products')
      .select('*')
      .where((qb: QueryBuilder) => {
        qb.where('category', '=', 'Electronics')
          .orWhere('price', '<', 50);
      })
      .where('in_stock', '>', 0)
      .whereIn('category', ['Electronics', 'Books'])
      .orderBy('price', 'ASC')
      .execute() as Product[];

    await db.close();

    response.success(res, {
      method: 'Complex WHERE conditions',
      products,
    });
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 500);
  }
});

// Example 3: INSERT
app.get('/sql/insert', async (req, res) => {
  try {
    const db: DatabasePool = createPool({
      type: 'sqlite',
      connectionString: ':memory:',
    });

    await db.connect();

    await db.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        author_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert using query builder
    const result = await queryBuilder(db)
      .insert('posts', {
        title: 'My First Post',
        content: 'This is the content of my first post',
        author_id: 1,
      })
      .execute();

    const posts = await queryBuilder(db, 'posts').select('*').execute();

    await db.close();

    response.success(res, {
      method: 'INSERT',
      inserted: result,
      posts,
    });
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 500);
  }
});

// Example 4: UPDATE
app.get('/sql/update', async (req, res) => {
  try {
    const db: DatabasePool = createPool({
      type: 'sqlite',
      connectionString: ':memory:',
    });

    await db.connect();

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT DEFAULT 'active'
      )
    `);

    await db.query('INSERT INTO users (name, email) VALUES (?, ?)', ['John', 'john@example.com']);

    // Update using query builder
    await queryBuilder(db)
      .update('users', {
        status: 'inactive',
      })
      .where('email', '=', 'john@example.com')
      .execute();

    const users = await queryBuilder(db, 'users').select('*').execute() as User[];

    await db.close();

    response.success(res, {
      method: 'UPDATE',
      users,
    });
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 500);
  }
});

// Example 5: DELETE
app.get('/sql/delete', async (req, res) => {
  try {
    const db: DatabasePool = createPool({
      type: 'sqlite',
      connectionString: ':memory:',
    });

    await db.connect();

    await db.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        user_id INTEGER
      )
    `);

    await db.query('INSERT INTO comments (text, user_id) VALUES (?, ?)', ['Comment 1', 1]);
    await db.query('INSERT INTO comments (text, user_id) VALUES (?, ?)', ['Comment 2', 2]);

    // Delete using query builder
    await queryBuilder(db)
      .delete('comments')
      .where('user_id', '=', 1)
      .execute();

    const comments = await queryBuilder(db, 'comments').select('*').execute();

    await db.close();

    response.success(res, {
      method: 'DELETE',
      comments,
    });
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 500);
  }
});

// ============================================
// MongoDB Query Builder Examples
// ============================================

// Example 6: MongoDB FIND
app.get('/mongo/find', async (req, res) => {
  try {
    const db: DatabasePool = createPool({
      type: 'mongodb',
      connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017/test',
    });

    await db.connect();

    const collection = (db as any).db.collection('users');

    // Insert sample data
    await collection.insertMany([
      { name: 'Alice', age: 30, status: 'active' },
      { name: 'Bob', age: 25, status: 'active' },
    ]);

    // Query using MongoDB query builder
    const users = await mongoQueryBuilder(db, 'users')
      .where('status', 'active')
      .gt('age', 20)
      .sortDesc('age')
      .limit(10)
      .find() as User[];

    await db.close();

    response.success(res, {
      method: 'MongoDB FIND',
      users,
    });
  } catch (error: any) {
    response.success(res, {
      method: 'MongoDB FIND',
      note: 'MongoDB connection required. Install mongodb package and set MONGODB_URI environment variable.',
      error: error.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  response.success(res, {
    status: 'ok',
    features: [
      'SQL Query Builder (SELECT, INSERT, UPDATE, DELETE)',
      'MongoDB Query Builder (FIND, INSERT, UPDATE, DELETE)',
      'Complex WHERE conditions',
      'JOIN support',
      'Type-safe query building',
    ],
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Navis.js Query Builder Demo (TypeScript) running on http://localhost:${PORT}`);
  console.log('\n📊 Available endpoints:');
  console.log(`  GET http://localhost:${PORT}/sql/select - SELECT with WHERE`);
  console.log(`  GET http://localhost:${PORT}/sql/where-complex - Complex WHERE conditions`);
  console.log(`  GET http://localhost:${PORT}/sql/insert - INSERT example`);
  console.log(`  GET http://localhost:${PORT}/sql/update - UPDATE example`);
  console.log(`  GET http://localhost:${PORT}/sql/delete - DELETE example`);
  console.log(`  GET http://localhost:${PORT}/mongo/find - MongoDB FIND`);
  console.log(`  GET http://localhost:${PORT}/health - Health check`);
});

