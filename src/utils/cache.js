/**
 * Cache utility module
 * In-memory cache with TTL and bounded size (LRU eviction).
 */

const MAX_MATCH_CACHE_SIZE = 500;

class Cache {
  constructor() {
    /** @type {Map<string, { data: any, lastUpdate: number, lastUsed: number }>} */
    this.store = new Map();
  }

  /**
   * @param {number} maxEntries
   */
  evictLruIfNeeded(maxEntries) {
    if (this.store.size < maxEntries) return;
    let oldestKey = null;
    let oldest = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.lastUsed < oldest) {
        oldest = entry.lastUsed;
        oldestKey = key;
      }
    }
    if (oldestKey != null) this.store.delete(oldestKey);
  }

  /**
   * Get cached data if not expired
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in milliseconds
   * @returns {any|null} Cached data or null if expired/missing
   */
  get(key, ttl) {
    const cached = this.store.get(key);
    if (!cached || cached.data == null) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - cached.lastUpdate > ttl;
    if (isExpired) {
      this.store.delete(key);
      return null;
    }

    cached.lastUsed = now;
    return cached.data;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} maxEntries - Max distinct keys before LRU eviction
   */
  set(key, data, maxEntries) {
    const now = Date.now();
    if (!this.store.has(key)) {
      this.evictLruIfNeeded(maxEntries);
    }
    this.store.set(key, {
      data,
      lastUpdate: now,
      lastUsed: now
    });
  }

  /**
   * Clear specific cache key or all cache
   * @param {string} [key] - Optional cache key to clear
   */
  clear(key) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

export const cache = new Cache();

/**
 * In-memory cache for FACEIT match stats.
 * Match stats are immutable once a match is finished.
 * Evicts oldest entries when the cache exceeds MAX_MATCH_CACHE_SIZE.
 */
class MatchStatsCache {
  constructor(maxSize = MAX_MATCH_CACHE_SIZE) {
    this.maxSize = maxSize;
    this.store = new Map();
  }

  get(matchId) {
    return this.store.get(matchId) ?? null;
  }

  set(matchId, data) {
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
    this.store.set(matchId, data);
  }
}

export const matchStatsCache = new MatchStatsCache();
