/**
 * Database Adapters Demo - Navis.js
 * Demonstrates extended database adapter support (SQLite, SQL Server)
 */

const { NavisApp, createPool, response } = require('../src/index');

const app = new NavisApp();

// Example: SQLite Database
app.get('/sqlite/users', async (req, res) => {
  try {
    const db = createPool({
      type: 'sqlite',
      connectionString: ':memory:', // In-memory database for demo
    });

    await db.connect();

    // Create table (if not exists)
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL
      )
    `);

    // Insert sample data
    await db.query('INSERT INTO users (name, email) VALUES (?, ?)', ['Alice', 'alice@example.com']);
    await db.query('INSERT INTO users (name, email) VALUES (?, ?)', ['Bob', 'bob@example.com']);

    // Query users
    const users = await db.query('SELECT * FROM users');

    await db.close();

    response.success(res, {
      database: 'SQLite',
      users,
    });
  } catch (error) {
    response.error(res, `SQLite error: ${error.message}`, 500);
  }
});

// Example: SQL Server Database
app.get('/sqlserver/users', async (req, res) => {
  try {
    const db = createPool({
      type: 'mssql',
      connectionString: process.env.SQL_SERVER_CONNECTION_STRING || 'Server=localhost;Database=testdb;User Id=sa;Password=YourPassword123',
    });

    await db.connect();

    // Query users (assuming table exists)
    const users = await db.query('SELECT TOP 10 * FROM users');

    await db.close();

    response.success(res, {
      database: 'SQL Server',
      users,
    });
  } catch (error) {
    response.error(res, `SQL Server error: ${error.message}`, 500);
  }
});

// Example: PostgreSQL (existing)
app.get('/postgres/users', async (req, res) => {
  try {
    const db = createPool({
      type: 'postgres',
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/mydb',
    });

    await db.connect();
    const users = await db.query('SELECT * FROM users LIMIT 10');
    await db.close();

    response.success(res, {
      database: 'PostgreSQL',
      users,
    });
  } catch (error) {
    response.error(res, `PostgreSQL error: ${error.message}`, 500);
  }
});

// Example: MySQL (existing)
app.get('/mysql/users', async (req, res) => {
  try {
    const db = createPool({
      type: 'mysql',
      connectionString: process.env.MYSQL_URL || 'mysql://user:password@localhost:3306/mydb',
    });

    await db.connect();
    const users = await db.query('SELECT * FROM users LIMIT 10');
    await db.close();

    response.success(res, {
      database: 'MySQL',
      users,
    });
  } catch (error) {
    response.error(res, `MySQL error: ${error.message}`, 500);
  }
});

// Health check
app.get('/health', (req, res) => {
  response.success(res, {
    status: 'ok',
    databases: ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite', 'SQL Server'],
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Navis.js Database Adapters Demo running on http://localhost:${PORT}`);
  console.log('\n📊 Available endpoints:');
  console.log(`  GET http://localhost:${PORT}/sqlite/users - SQLite example`);
  console.log(`  GET http://localhost:${PORT}/sqlserver/users - SQL Server example`);
  console.log(`  GET http://localhost:${PORT}/postgres/users - PostgreSQL example`);
  console.log(`  GET http://localhost:${PORT}/mysql/users - MySQL example`);
  console.log(`  GET http://localhost:${PORT}/health - Health check`);
  console.log('\n💡 Note: Make sure to install the required database drivers:');
  console.log('  - SQLite: npm install better-sqlite3 (or sqlite3 sqlite)');
  console.log('  - SQL Server: npm install mssql');
  console.log('  - PostgreSQL: npm install pg');
  console.log('  - MySQL: npm install mysql2');
  console.log('  - MongoDB: npm install mongodb');
});

