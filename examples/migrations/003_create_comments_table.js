/**
 * Migration: Create comments table
 */

module.exports = {
  async up(dbPool) {
    const dbType = dbPool.type.toLowerCase();

    if (dbType === 'mongodb') {
      const collection = dbPool.db.collection('comments');
      await collection.createIndex({ post_id: 1 });
      await collection.createIndex({ user_id: 1 });
    } else {
      const sql = `
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL,
          post_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (post_id) REFERENCES posts(id),
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
      const collection = dbPool.db.collection('comments');
      await collection.drop();
    } else {
      await dbPool.query('DROP TABLE IF EXISTS comments');
    }
  },
};

