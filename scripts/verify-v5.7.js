/**
 * Verification Script for v5.7 Features
 * Tests ORM-like features and database migrations
 */

const { createPool, Model, createMigration } = require('../src/index');
const path = require('path');
const fs = require('fs');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack.split('\n')[1]}`);
    }
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack.split('\n')[1]}`);
    }
  }
}

// Test Model class
test('Model - Class exists', () => {
  if (typeof Model !== 'function') {
    throw new Error('Model is not a function');
  }
});

test('Model - Static methods exist', () => {
  if (typeof Model.setDatabase !== 'function') {
    throw new Error('Model.setDatabase is not a function');
  }
  if (typeof Model.getDatabase !== 'function') {
    throw new Error('Model.getDatabase is not a function');
  }
  if (typeof Model.find !== 'function') {
    throw new Error('Model.find is not a function');
  }
  if (typeof Model.findOne !== 'function') {
    throw new Error('Model.findOne is not a function');
  }
  if (typeof Model.findById !== 'function') {
    throw new Error('Model.findById is not a function');
  }
  if (typeof Model.create !== 'function') {
    throw new Error('Model.create is not a function');
  }
  if (typeof Model.hasMany !== 'function') {
    throw new Error('Model.hasMany is not a function');
  }
  if (typeof Model.belongsTo !== 'function') {
    throw new Error('Model.belongsTo is not a function');
  }
  if (typeof Model.hasOne !== 'function') {
    throw new Error('Model.hasOne is not a function');
  }
});

// Test User Model
class User extends Model {
  static get tableName() {
    return 'users';
  }

  static get primaryKey() {
    return 'id';
  }
}

asyncTest('Model - Create instance', async () => {
  const user = new User({ name: 'Test', email: 'test@example.com' });
  if (!user) {
    throw new Error('Failed to create User instance');
  }
  if (typeof user.save !== 'function') {
    throw new Error('Instance save method not found');
  }
  if (typeof user.delete !== 'function') {
    throw new Error('Instance delete method not found');
  }
  if (typeof user.toJSON !== 'function') {
    throw new Error('Instance toJSON method not found');
  }
});

asyncTest('Model - Database operations', async () => {
  const db = createPool({
    type: 'sqlite',
    connectionString: ':memory:',
  });

  await db.connect();

  // Create table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    )
  `);

  User.setDatabase(db);

  // Test create
  const user = await User.create({
    name: 'Test User',
    email: 'test@example.com',
  });

  if (!user) {
    throw new Error('Failed to create user');
  }

  // Test findById
  const found = await User.findById(user.id || user._data.id);
  if (!found) {
    throw new Error('Failed to find user by ID');
  }

  // Test find
  const users = await User.find({});
  if (users.length === 0) {
    throw new Error('Failed to find users');
  }

  // Test update
  found.name = 'Updated User';
  await found.save();

  // Test reload
  await found.reload();
  if (found.name !== 'Updated User') {
    throw new Error('Reload failed');
  }

  // Test delete
  await found.delete();

  // Test count
  const count = await User.count({});
  if (count !== 0) {
    throw new Error('Count failed after delete');
  }

  await db.close();
});

// Test Migration class
test('Migration - Class exists', () => {
  if (typeof createMigration !== 'function') {
    throw new Error('createMigration is not a function');
  }
});

asyncTest('Migration - Initialize and run', async () => {
  const db = createPool({
    type: 'sqlite',
    connectionString: ':memory:',
  });

  await db.connect();

  // Create migrations directory if it doesn't exist
  const migrationsPath = path.join(__dirname, 'test-migrations');
  if (!fs.existsSync(migrationsPath)) {
    fs.mkdirSync(migrationsPath, { recursive: true });
  }

  // Create a test migration
  const migrationFile = path.join(migrationsPath, '001_test_migration.js');
  if (!fs.existsSync(migrationFile)) {
    fs.writeFileSync(migrationFile, `
      module.exports = {
        async up(dbPool) {
          await dbPool.query('CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT)');
        },
        async down(dbPool) {
          await dbPool.query('DROP TABLE IF EXISTS test_table');
        },
      };
    `);
  }

  const migration = createMigration(db, migrationsPath);

  // Test init
  await migration.init();

  // Test up
  const result = await migration.up();
  if (!result || !result.message) {
    throw new Error('Migration up failed');
  }

  // Test status
  const status = await migration.status();
  if (status.executed === 0) {
    throw new Error('Migration status failed');
  }

  // Test down
  const rollback = await migration.down(1);
  if (!rollback || !rollback.message) {
    throw new Error('Migration down failed');
  }

  // Cleanup
  if (fs.existsSync(migrationFile)) {
    fs.unlinkSync(migrationFile);
  }
  if (fs.existsSync(migrationsPath)) {
    fs.rmdirSync(migrationsPath);
  }

  await db.close();
});

asyncTest('Model - Relationships', async () => {
  const db = createPool({
    type: 'sqlite',
    connectionString: ':memory:',
  });

  await db.connect();

  // Create tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  class UserModel extends Model {
    static get tableName() { return 'users'; }
  }

  class PostModel extends Model {
    static get tableName() { return 'posts'; }
  }

  UserModel.setDatabase(db);
  PostModel.setDatabase(db);

  // Define relationship
  UserModel.hasMany('posts', PostModel, 'user_id');

  // Create user
  const user = await UserModel.create({ name: 'Test User' });
  const userId = user.id || user._data.id;

  // Create post
  const post = await PostModel.create({
    title: 'Test Post',
    user_id: userId,
  });

  // Test relationship
  const userPosts = await user.posts;
  if (!Array.isArray(userPosts)) {
    throw new Error('Relationship failed - posts is not an array');
  }
  if (userPosts.length === 0) {
    throw new Error('Relationship failed - no posts found');
  }

  await db.close();
});

// Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✅ All v5.7 tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed');
  process.exit(1);
}

