/**
 * GraphQL Demo - Navis.js (TypeScript)
 * Demonstrates GraphQL query and mutation support with TypeScript
 */

import {
  NavisApp,
  graphql,
  createResolver,
  GraphQLResolver,
  GraphQLContext,
  response,
} from '../src/index';

interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
}

// Sample data store
const users: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', age: 30 },
  { id: '2', name: 'Bob', email: 'bob@example.com', age: 25 },
  { id: '3', name: 'Charlie', email: 'charlie@example.com', age: 35 },
];

const posts: Post[] = [
  { id: '1', title: 'First Post', content: 'Content 1', authorId: '1' },
  { id: '2', title: 'Second Post', content: 'Content 2', authorId: '2' },
  { id: '3', title: 'Third Post', content: 'Content 3', authorId: '1' },
];

// Define resolvers with TypeScript types
const resolvers = {
  Query: {
    // Get all users
    users: createResolver(async (variables, context: GraphQLContext): Promise<User[]> => {
      return users;
    }),

    // Get user by ID
    user: createResolver(async (variables, context: GraphQLContext): Promise<User | null> => {
      const { id } = variables as { id: string };
      const user = users.find(u => u.id === id);
      if (!user) {
        throw new Error(`User with id ${id} not found`);
      }
      return user;
    }),

    // Get all posts
    posts: createResolver(async (variables, context: GraphQLContext): Promise<Post[]> => {
      return posts;
    }),

    // Get posts by author
    postsByAuthor: createResolver(async (variables, context: GraphQLContext): Promise<Post[]> => {
      const { authorId } = variables as { authorId: string };
      return posts.filter(p => p.authorId === authorId);
    }),
  },

  Mutation: {
    // Create user
    createUser: createResolver(async (variables, context: GraphQLContext): Promise<User> => {
      const { name, email, age } = variables as { name: string; email: string; age?: number };
      const newUser: User = {
        id: String(users.length + 1),
        name,
        email,
        age: age || 0,
      };
      users.push(newUser);
      return newUser;
    }),

    // Update user
    updateUser: createResolver(async (variables, context: GraphQLContext): Promise<User> => {
      const { id, name, email, age } = variables as {
        id: string;
        name?: string;
        email?: string;
        age?: number;
      };
      const user = users.find(u => u.id === id);
      if (!user) {
        throw new Error(`User with id ${id} not found`);
      }
      if (name) user.name = name;
      if (email) user.email = email;
      if (age !== undefined) user.age = age;
      return user;
    }),

    // Delete user
    deleteUser: createResolver(async (variables, context: GraphQLContext): Promise<User> => {
      const { id } = variables as { id: string };
      const index = users.findIndex(u => u.id === id);
      if (index === -1) {
        throw new Error(`User with id ${id} not found`);
      }
      const deleted = users.splice(index, 1)[0];
      return deleted;
    }),
  },
};

const app = new NavisApp();

// Add GraphQL middleware with TypeScript types
app.use(
  graphql({
    path: '/graphql',
    resolvers,
    context: (req) => {
      // Add custom context with TypeScript types
      return {
        userId: (req.headers['x-user-id'] as string) || null,
        timestamp: new Date().toISOString(),
      };
    },
  })
);

// Health check endpoint
app.get('/health', (req, res) => {
  response.success(res, { status: 'ok', graphql: true, typescript: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Navis.js GraphQL server (TypeScript) running on http://localhost:${PORT}`);
  console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
  console.log('\n📝 Example queries:');
  console.log('\n1. Get all users:');
  console.log(`curl -X POST http://localhost:${PORT}/graphql \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"query": "query { users { id name email age } }"}'`);
  console.log('\n2. Get user by ID:');
  console.log(`curl -X POST http://localhost:${PORT}/graphql \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"query": "query { user(id: \\"1\\") { id name email } }"}'`);
  console.log('\n3. Create user:');
  console.log(`curl -X POST http://localhost:${PORT}/graphql \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"query": "mutation { createUser(name: \\"Dave\\", email: \\"dave@example.com\\", age: 28) { id name email } }"}'`);
});

