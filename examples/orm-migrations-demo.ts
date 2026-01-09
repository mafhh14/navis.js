/**
 * ORM-like Features and Migrations Demo - Navis.js (TypeScript)
 * Demonstrates Model definitions and database migrations (v5.7)
 */

import {
  NavisApp,
  createPool,
  Model,
  createMigration,
  response,
  DatabasePool,
} from '../src/index';
import * as path from 'path';

const app = new NavisApp();

// ============================================
// Define Models
// ============================================

interface UserData {
  id?: number;
  name: string;
  email: string;
  age?: number;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
}

class User extends Model {
  static get tableName(): string {
    return 'users';
  }

  static get primaryKey(): string {
    return 'id';
  }

  async validate(): Promise<boolean> {
    const email = (this as any).email;
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }
    return true;
  }

  async beforeSave(): Promise<void> {
    if ((this as any)._isNew) {
      (this as any).created_at = new Date();
    }
    (this as any).updated_at = new Date();
  }
}

interface PostData {
  id?: number;
  title: string;
  content?: string;
  user_id: number;
  created_at?: Date;
  updated_at?: Date;
}

class Post extends Model {
  static get tableName(): string {
    return 'posts';
  }

  static get primaryKey(): string {
    return 'id';
  }

  async beforeSave(): Promise<void> {
    if ((this as any)._isNew) {
      (this as any).created_at = new Date();
    }
    (this as any).updated_at = new Date();
  }
}

// Define relationships
Post.belongsTo('author', User, 'user_id');
User.hasMany('posts', Post, 'user_id');

// ============================================
// API Routes
// ============================================

let db: DatabasePool | null = null;

app.get('/init', async (req, res) => {
  try {
    db = createPool({
      type: 'sqlite',
      connectionString: ':memory:',
    });

    await db.connect();

    // Set database for models
    User.setDatabase(db);
    Post.setDatabase(db);

    // Run migrations
    const migration = createMigration(db, path.join(__dirname, 'migrations'));
    await migration.init();
    const result = await migration.up();

    response.success(res, {
      message: 'Database initialized',
      migrations: result,
    });
  } catch (error: any) {
    response.error(res, `Init error: ${error.message}`, 500);
  }
});

// Create user
app.post('/users', async (req, res) => {
  try {
    const user = await User.create({
      name: req.body.name || 'John Doe',
      email: req.body.email || 'john@example.com',
      age: req.body.age || 30,
    } as UserData);

    response.success(res, {
      message: 'User created',
      user: user.toJSON(),
    }, 201);
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 400);
  }
});

// Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, {
      orderBy: 'name',
      orderDirection: 'ASC',
    });

    response.success(res, {
      users: users.map(u => u.toJSON()),
    });
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 500);
  }
});

// Get user by ID
app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(parseInt(req.params.id));

    if (!user) {
      return response.error(res, 'User not found', 404);
    }

    response.success(res, {
      user: user.toJSON(),
    });
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 500);
  }
});

// Update user
app.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(parseInt(req.params.id)) as User;

    if (!user) {
      return response.error(res, 'User not found', 404);
    }

    // Update fields
    if (req.body.name) (user as any).name = req.body.name;
    if (req.body.email) (user as any).email = req.body.email;
    if (req.body.age) (user as any).age = req.body.age;

    await user.save();

    response.success(res, {
      message: 'User updated',
      user: user.toJSON(),
    });
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 400);
  }
});

// Delete user
app.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(parseInt(req.params.id));

    if (!user) {
      return response.error(res, 'User not found', 404);
    }

    await user.delete();

    response.success(res, {
      message: 'User deleted',
    });
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 500);
  }
});

// Create post
app.post('/posts', async (req, res) => {
  try {
    const post = await Post.create({
      title: req.body.title || 'My First Post',
      content: req.body.content || 'This is the content',
      user_id: req.body.user_id || 1,
    } as PostData);

    response.success(res, {
      message: 'Post created',
      post: post.toJSON(),
    }, 201);
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 400);
  }
});

// Get posts with author
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find({}, {
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });

    // Load relationships
    const postsWithAuthor = await Promise.all(
      posts.map(async (post) => {
        const postData = post.toJSON();
        const author = await (post as any).author;
        return {
          ...postData,
          author: author ? author.toJSON() : null,
        };
      })
    );

    response.success(res, {
      posts: postsWithAuthor,
    });
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 500);
  }
});

// Migration status
app.get('/migrations/status', async (req, res) => {
  try {
    if (!db) {
      return response.error(res, 'Database not initialized', 400);
    }

    const migration = createMigration(db, path.join(__dirname, 'migrations'));
    const status = await migration.status();

    response.success(res, status);
  } catch (error: any) {
    response.error(res, `Error: ${error.message}`, 500);
  }
});

// Health check
app.get('/health', (req, res) => {
  response.success(res, {
    status: 'ok',
    features: [
      'ORM-like Model definitions',
      'Model relationships (hasMany, belongsTo, hasOne)',
      'Model hooks (beforeSave, afterSave, etc.)',
      'Model validation',
      'Database migrations',
      'Migration up/down',
      'Migration tracking',
    ],
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Navis.js ORM & Migrations Demo (TypeScript) running on http://localhost:${PORT}`);
  console.log('\n📊 Available endpoints:');
  console.log(`  GET  http://localhost:${PORT}/init - Initialize database and run migrations`);
  console.log(`  POST http://localhost:${PORT}/users - Create user`);
  console.log(`  GET  http://localhost:${PORT}/users - Get all users`);
  console.log(`  GET  http://localhost:${PORT}/users/:id - Get user by ID`);
  console.log(`  PUT  http://localhost:${PORT}/users/:id - Update user`);
  console.log(`  DELETE http://localhost:${PORT}/users/:id - Delete user`);
  console.log(`  POST http://localhost:${PORT}/posts - Create post`);
  console.log(`  GET  http://localhost:${PORT}/posts - Get all posts with authors`);
  console.log(`  GET  http://localhost:${PORT}/migrations/status - Get migration status`);
  console.log(`  GET  http://localhost:${PORT}/health - Health check`);
});

