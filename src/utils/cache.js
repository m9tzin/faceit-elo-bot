/**
 * Cache utility module
 * Provides a simple in-memory cache with TTL support
 */

const MAX_MATCH_CACHE_SIZE = 500;

class Cache {
  constructor() {
    this.store = {};
  }

  /**
   * Get cached data if not expired
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in milliseconds
   * @returns {any|null} Cached data or null if expired/missing
   */
  get(key, ttl) {
    const cached = this.store[key];
    if (!cached || !cached.data) {
      return null;
    }

    const now = Date.now();
    const isExpired = now - cached.lastUpdate > ttl;
    
    return isExpired ? null : cached.data;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  set(key, data) {
    this.store[key] = {
      data,
      lastUpdate: Date.now()
    };
  }

  /**
   * Clear specific cache key or all cache
   * @param {string} [key] - Optional cache key to clear
   */
  clear(key) {
    if (key) {
      delete this.store[key];
    } else {
      this.store = {};
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
