import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cache } from '../src/utils/cache.js';

describe('cache', () => {
  beforeEach(() => {
    cache.clear();
  });

  it('returns stored value within TTL', () => {
    cache.set('a', 'hello', 100);
    assert.equal(cache.get('a', 60_000), 'hello');
  });

  it('drops expired entry on get', async () => {
    cache.set('b', 1, 100);
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(cache.get('b', 1), null);
  });

  it('evicts LRU when exceeding maxEntries', () => {
    const max = 5;
    for (let i = 0; i < max; i++) {
      cache.set(`k${i}`, i, max);
    }
    cache.set('k_new', 99, max);
    assert.equal(cache.get('k0', 60_000), null);
    assert.equal(cache.get('k_new', 60_000), 99);
  });
});
