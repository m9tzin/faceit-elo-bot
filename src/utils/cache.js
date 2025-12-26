/**
 * Cache utility module
 * Provides a simple in-memory cache with TTL support
 */

class Cache {
  constructor() {
    this.store = {
      elo: { data: null, lastUpdate: 0 },
      stats: { data: null, lastUpdate: 0 },
      streak: { data: null, lastUpdate: 0 }
    };
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
      this.store[key] = { data: null, lastUpdate: 0 };
    } else {
      Object.keys(this.store).forEach(k => {
        this.store[k] = { data: null, lastUpdate: 0 };
      });
    }
  }
}

// Export singleton instance
export const cache = new Cache();

