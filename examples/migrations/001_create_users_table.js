/**
 * Migration: Create users table
 */

module.exports = {
  async up(dbPool) {
    const dbType = dbPool.type.toLowerCase();

    if (dbType === 'mongodb') {
      // MongoDB: Create collection (collections are created automatically)
      const collection = dbPool.db.collection('users');
      await collection.createIndex({ email: 1 }, { unique: true });
    } else {
      // SQL: Create table
      const sql = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          age INTEGER,
          status TEXT DEFAULT 'active',
          created_at DATETIME,
          updated_at DATETIME
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

      await dbPool.query(sql);
    }
  },

  async down(dbPool) {
    const dbType = dbPool.type.toLowerCase();

    if (dbType === 'mongodb') {
      const collection = dbPool.db.collection('users');
      await collection.drop();
    } else {
      await dbPool.query('DROP TABLE IF EXISTS users');
    }
  },
};

