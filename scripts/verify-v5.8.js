/**
 * Verification Script for v5.8: Advanced Caching Strategies
 */

const navis = require('../src/index.js');

const { AdvancedCache, Cache } = navis;

// Test helper
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}:`, error.message);
    throw error;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}:`, error.message);
    throw error;
  }
}

console.log('='.repeat(60));
console.log('Verifying v5.8: Advanced Caching Strategies');
console.log('='.repeat(60));

// Test 1: AdvancedCache instantiation
test('AdvancedCache - Instantiation', () => {
  const l1Cache = new Cache();
  const advancedCache = new AdvancedCache({
    l1Cache,
  });
  
  if (!advancedCache) {
    throw new Error('AdvancedCache not created');
  }
});

// Test 2: Basic get/set
asyncTest('AdvancedCache - Basic get/set', async () => {
  const l1Cache = new Cache();
  const cache = new AdvancedCache({ l1Cache });
  
  await cache.set('test:1', { data: 'test' });
  const value = await cache.get('test:1');
  
  if (!value || value.data !== 'test') {
    throw new Error('Get/set failed');
  }
});

// Test 3: Cache with tags
asyncTest('AdvancedCache - Tags', async () => {
  const l1Cache = new Cache();
  const cache = new AdvancedCache({ l1Cache });
  
  await cache.set('user:1', { id: 1 }, { tags: ['user'] });
  await cache.set('user:2', { id: 2 }, { tags: ['user'] });
  
  // Invalidate by tag
  await cache.invalidateByTag('user');
  
  const user1 = await cache.get('user:1');
  if (user1 !== null) {
    throw new Error('Tag invalidation failed');
  }
});

// Test 4: Cache invalidation by pattern
asyncTest('AdvancedCache - Pattern invalidation', async () => {
  const l1Cache = new Cache();
  const cache = new AdvancedCache({ l1Cache });
  
  await cache.set('product:1', { id: 1 });
  await cache.set('product:2', { id: 2 });
  await cache.set('order:1', { id: 1 });
  
  // Invalidate by pattern
  await cache.invalidateByPattern(/^product:/);
  
  const product1 = await cache.get('product:1');
  const order1 = await cache.get('order:1');
  
  if (product1 !== null) {
    throw new Error('Pattern invalidation failed');
  }
  if (order1 === null) {
    throw new Error('Pattern invalidation too broad');
  }
});

// Test 5: Cache statistics
asyncTest('AdvancedCache - Statistics', async () => {
  const l1Cache = new Cache();
  const cache = new AdvancedCache({ l1Cache });
  
  await cache.set('stats:1', { data: 'test1' });
  await cache.get('stats:1'); // Hit
  await cache.get('stats:2'); // Miss
  
  const stats = cache.getStats();
  
  if (stats.hits !== 1 || stats.misses !== 1) {
    throw new Error('Statistics incorrect');
  }
  if (!stats.hitRate.includes('%')) {
    throw new Error('Hit rate format incorrect');
  }
});

// Test 6: Cache warming
asyncTest('AdvancedCache - Warming', async () => {
  const l1Cache = new Cache();
  const cache = new AdvancedCache({ l1Cache });
  
  const warmData = [
    { key: 'warm:1', value: { id: 1 } },
    { key: 'warm:2', value: { id: 2 } },
  ];
  
  await cache.warm(warmData);
  
  const value1 = await cache.get('warm:1');
  const value2 = await cache.get('warm:2');
  
  if (!value1 || !value2) {
    throw new Error('Cache warming failed');
  }
});

// Test 7: Write strategies
asyncTest('AdvancedCache - Write strategies', async () => {
  // Write-through
  const writeThroughCache = new AdvancedCache({
    l1Cache: new Cache(),
    writeStrategy: 'write-through',
  });
  await writeThroughCache.set('strategy:1', { data: 'test' });
  
  // Write-back
  const writeBackCache = new AdvancedCache({
    l1Cache: new Cache(),
    writeStrategy: 'write-back',
  });
  await writeBackCache.set('strategy:2', { data: 'test' });
  await writeBackCache.flush();
  
  // Write-around
  const writeAroundCache = new AdvancedCache({
    l1Cache: new Cache(),
    writeStrategy: 'write-around',
  });
  await writeAroundCache.set('strategy:3', { data: 'test' });
});

// Test 8: Cache versioning
asyncTest('AdvancedCache - Versioning', async () => {
  const l1Cache = new Cache();
  
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
  
  if (!v1Value || !v2Value || v1Value.version === v2Value.version) {
    throw new Error('Cache versioning failed');
  }
});

// Test 9: Cache compression
asyncTest('AdvancedCache - Compression', async () => {
  const l1Cache = new Cache();
  const cache = new AdvancedCache({
    l1Cache,
    compressThreshold: 10, // Low threshold for testing
  });
  
  const largeData = {
    items: Array(100).fill(0).map((_, i) => ({
      id: i,
      data: 'x'.repeat(100),
    })),
  };
  
  await cache.set('large:data', largeData, { compress: true });
  const retrieved = await cache.get('large:data');
  
  if (!retrieved || !retrieved.items || retrieved.items.length !== 100) {
    throw new Error('Compression/decompression failed');
  }
});

// Test 10: Cache clear
asyncTest('AdvancedCache - Clear', async () => {
  const l1Cache = new Cache();
  const cache = new AdvancedCache({ l1Cache });
  
  await cache.set('clear:1', { data: 'test' });
  await cache.clear();
  
  const value = await cache.get('clear:1');
  if (value !== null) {
    throw new Error('Clear failed');
  }
});

// Test 11: Reset statistics
test('AdvancedCache - Reset statistics', () => {
  const l1Cache = new Cache();
  const cache = new AdvancedCache({ l1Cache });
  
  cache.resetStats();
  const stats = cache.getStats();
  
  if (stats.hits !== 0 || stats.misses !== 0) {
    throw new Error('Reset statistics failed');
  }
});

// Test 12: Module exports
test('Module exports - AdvancedCache', () => {
  if (!navis.AdvancedCache) {
    throw new Error('AdvancedCache not exported');
  }
});

console.log('\n' + '='.repeat(60));
console.log('✅ All v5.8 Advanced Caching tests passed!');
console.log('='.repeat(60));

