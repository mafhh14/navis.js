/**
 * Advanced Caching Strategies Demo
 * v5.8: Demonstrates multi-level caching, cache warming, invalidation, and statistics
 */

const { AdvancedCache, Cache, RedisCache } = require('navis.js');

async function demo() {
  console.log('=== Advanced Caching Strategies Demo ===\n');

  // ============================================
  // 1. Multi-Level Caching (L1 + L2)
  // ============================================
  console.log('1. Multi-Level Caching (L1: In-Memory, L2: Redis)');
  
  // Create L1 cache (in-memory)
  const l1Cache = new Cache({
    maxSize: 100,
    defaultTTL: 300000, // 5 minutes
  });

  // Create L2 cache (Redis - optional, can be null)
  // Note: Redis requires redis package: npm install redis
  let l2Cache = null;
  try {
    l2Cache = new RedisCache({
      defaultTTL: 3600, // 1 hour
      prefix: 'navis:',
    });
    await l2Cache.connect();
    console.log('✅ L2 Cache (Redis) connected');
  } catch (error) {
    console.log('⚠️  L2 Cache (Redis) not available, using L1 only');
  }

  // Create advanced cache with multi-level support
  const advancedCache = new AdvancedCache({
    l1Cache,
    l2Cache,
    l1MaxSize: 100,
    l1TTL: 300000, // 5 minutes
    writeStrategy: 'write-through', // or 'write-back', 'write-around'
  });

  // Set a value
  await advancedCache.set('user:1', {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  }, {
    ttl: 600000, // 10 minutes
    tags: ['user', 'user:1'],
  });

  console.log('✅ Set value in cache');

  // Get value (checks L1 first, then L2)
  const user = await advancedCache.get('user:1');
  console.log('✅ Retrieved from cache:', user);

  // ============================================
  // 2. Cache Warming
  // ============================================
  console.log('\n2. Cache Warming (Pre-populate cache)');
  
  const warmData = [
    { key: 'product:1', value: { id: 1, name: 'Product 1', price: 99.99 }, options: { tags: ['product'] } },
    { key: 'product:2', value: { id: 2, name: 'Product 2', price: 149.99 }, options: { tags: ['product'] } },
    { key: 'product:3', value: { id: 3, name: 'Product 3', price: 199.99 }, options: { tags: ['product'] } },
  ];

  await advancedCache.warm(warmData);
  console.log('✅ Cache warmed with', warmData.length, 'items');

  // ============================================
  // 3. Cache Invalidation by Tags
  // ============================================
  console.log('\n3. Cache Invalidation by Tags');
  
  // Set multiple items with tags
  await advancedCache.set('user:2', { id: 2, name: 'Jane Doe' }, { tags: ['user'] });
  await advancedCache.set('user:3', { id: 3, name: 'Bob Smith' }, { tags: ['user'] });
  
  console.log('✅ Set 2 users with "user" tag');
  
  // Invalidate all items with 'user' tag
  await advancedCache.invalidateByTag('user');
  console.log('✅ Invalidated all items with "user" tag');
  
  // Verify they're gone
  const user2 = await advancedCache.get('user:2');
  console.log('User 2 after invalidation:', user2); // Should be null

  // ============================================
  // 4. Cache Invalidation by Pattern
  // ============================================
  console.log('\n4. Cache Invalidation by Pattern');
  
  // Set multiple product items
  await advancedCache.set('product:10', { id: 10, name: 'Product 10' });
  await advancedCache.set('product:11', { id: 11, name: 'Product 11' });
  await advancedCache.set('order:1', { id: 1, total: 100 });
  
  console.log('✅ Set items with different prefixes');
  
  // Invalidate all product:* keys
  await advancedCache.invalidateByPattern(/^product:/);
  console.log('✅ Invalidated all keys matching pattern "product:*"');
  
  // Verify
  const product10 = await advancedCache.get('product:10');
  const order1 = await advancedCache.get('order:1');
  console.log('Product 10 after invalidation:', product10); // Should be null
  console.log('Order 1 (not matching pattern):', order1); // Should still exist

  // ============================================
  // 5. Cache Statistics
  // ============================================
  console.log('\n5. Cache Statistics');
  
  // Perform some operations
  await advancedCache.set('stats:1', { data: 'test1' });
  await advancedCache.set('stats:2', { data: 'test2' });
  await advancedCache.get('stats:1');
  await advancedCache.get('stats:2');
  await advancedCache.get('stats:3'); // Miss
  
  const stats = advancedCache.getStats();
  console.log('Cache Statistics:');
  console.log('  Hits:', stats.hits);
  console.log('  Misses:', stats.misses);
  console.log('  Hit Rate:', stats.hitRate);
  console.log('  L1 Hits:', stats.l1Hits);
  console.log('  L2 Hits:', stats.l2Hits);
  console.log('  L1 Size:', stats.l1Size);
  console.log('  Sets:', stats.sets);
  console.log('  Deletes:', stats.deletes);

  // ============================================
  // 6. Write Strategies
  // ============================================
  console.log('\n6. Write Strategies');
  
  // Write-through: Write to both L1 and L2 immediately
  const writeThroughCache = new AdvancedCache({
    l1Cache: new Cache(),
    l2Cache: l2Cache,
    writeStrategy: 'write-through',
  });
  console.log('✅ Write-through: Writes to both L1 and L2 immediately');
  
  // Write-back: Write to L1, queue for L2
  const writeBackCache = new AdvancedCache({
    l1Cache: new Cache(),
    l2Cache: l2Cache,
    writeStrategy: 'write-back',
  });
  await writeBackCache.set('writeback:1', { data: 'test' });
  console.log('✅ Write-back: Written to L1, queued for L2');
  await writeBackCache.flush(); // Flush queue
  console.log('✅ Write-back queue flushed');
  
  // Write-around: Write to L2 only, L1 populated on read
  const writeAroundCache = new AdvancedCache({
    l1Cache: new Cache(),
    l2Cache: l2Cache,
    writeStrategy: 'write-around',
  });
  await writeAroundCache.set('writearound:1', { data: 'test' });
  console.log('✅ Write-around: Written to L2 only, L1 populated on read');

  // ============================================
  // 7. Cache Compression
  // ============================================
  console.log('\n7. Cache Compression (for large values)');
  
  const largeData = {
    items: Array(1000).fill(0).map((_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: 'This is a long description that repeats many times. '.repeat(10),
    })),
  };
  
  await advancedCache.set('large:data', largeData, {
    compress: true, // Enable compression
  });
  console.log('✅ Large data cached with compression');
  
  const retrieved = await advancedCache.get('large:data');
  console.log('✅ Retrieved and decompressed:', retrieved.items.length, 'items');

  // ============================================
  // 8. Cache Versioning
  // ============================================
  console.log('\n8. Cache Versioning');
  
  const v1Cache = new AdvancedCache({
    l1Cache: new Cache(),
    version: '1.0',
  });
  
  const v2Cache = new AdvancedCache({
    l1Cache: new Cache(),
    version: '2.0',
  });
  
  await v1Cache.set('versioned:key', { version: '1.0' });
  await v2Cache.set('versioned:key', { version: '2.0' });
  
  const v1Value = await v1Cache.get('versioned:key');
  const v2Value = await v2Cache.get('versioned:key');
  
  console.log('✅ Version 1.0 value:', v1Value);
  console.log('✅ Version 2.0 value:', v2Value);
  console.log('✅ Different versions maintain separate caches');

  // Cleanup
  if (l2Cache) {
    await l2Cache.disconnect();
  }
  
  console.log('\n=== Demo Complete ===');
}

// Run demo
demo().catch(console.error);

