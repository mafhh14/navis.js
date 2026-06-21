/**
 * DynamoDB Adapter Demo
 * v6.1: Serverless NoSQL database integration
 *
 * Requires: npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
 * AWS credentials configured (env, profile, or IAM role)
 */

const { createPool } = require('../src/index');

async function demo() {
  console.log('=== DynamoDB Adapter Demo ===\n');

  const db = createPool({
    type: 'dynamodb',
    region: process.env.AWS_REGION || 'us-east-1',
  });

  console.log(`Pool type: ${db.type}`);
  console.log(`Region: ${process.env.AWS_REGION || 'us-east-1'}\n`);

  try {
    await db.connect();
    console.log('✅ Connected to DynamoDB\n');

    const table = process.env.DYNAMODB_TABLE || 'NavisUsers';

    console.log(`Put item into ${table}...`);
    await db.query(table, {
      action: 'put',
      Item: {
        id: 'demo-1',
        name: 'Alice',
        email: 'alice@example.com',
        updatedAt: new Date().toISOString(),
      },
    });
    console.log('✅ Put succeeded');

    console.log(`Get item from ${table}...`);
    const result = await db.query(table, {
      action: 'get',
      Key: { id: 'demo-1' },
    });
    console.log('✅ Get result:', result.Item || result);

    console.log('\nQuery pattern examples:');
    console.log('  db.query(table, { action: "put", Item: {...} })');
    console.log('  db.query(table, { action: "get", Key: {...} })');
    console.log('  db.query(table, { action: "delete", Key: {...} })');
    console.log('  db.query(table, { action: "scan", Limit: 10 })');
  } catch (error) {
    if (error.message.includes('not installed')) {
      console.log('⚠️  AWS SDK not installed');
      console.log('   npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb');
    } else if (error.name === 'ResourceNotFoundException') {
      console.log(`⚠️  Table "${process.env.DYNAMODB_TABLE || 'NavisUsers'}" not found`);
      console.log('   Create the table in AWS or set DYNAMODB_TABLE env var');
    } else {
      console.log('⚠️  DynamoDB operation failed:', error.message);
      console.log('   Ensure AWS credentials and table access are configured');
    }
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  demo().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { demo };
