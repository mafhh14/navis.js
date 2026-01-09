/**
 * Migration: Create posts table
 */

module.exports = {
  async up(dbPool) {
    const dbType = dbPool.type.toLowerCase();

    if (dbType === 'mongodb') {
      const collection = dbPool.db.collection('posts');
      await collection.createIndex({ user_id: 1 });
      await collection.createIndex({ created_at: -1 });
    } else {
      const sql = `
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT,
          user_id INTEGER NOT NULL,
          created_at DATETIME,
          updated_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id)
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
      const collection = dbPool.db.collection('posts');
      await collection.drop();
    } else {
      await dbPool.query('DROP TABLE IF EXISTS posts');
    }
  },
};

