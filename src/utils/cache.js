/**
 * Cache utility module
 * In-memory cache with TTL and bounded size (LRU eviction).
 */

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

// Export singleton instance
export const cache = new Cache();

/**
 * Permanent in-memory cache for FACEIT match stats.
 * Match stats are immutable once a match is finished, so entries never expire.
 * Uses a Map keyed by matchId.
 */
class MatchStatsCache {
  constructor() {
    this.store = new Map();
  }

  get(matchId) {
    return this.store.get(matchId) ?? null;
  }

  set(matchId, data) {
    this.store.set(matchId, data);
  }
}

export const matchStatsCache = new MatchStatsCache();

/**
 * Session ELO Cache
 * Stores the initial ELO for each player's session to calculate accurate ELO diff
 */
class SessionEloCache {
  constructor() {
    // Map of playerId -> { sessionStartTime, initialElo }
    this.sessions = new Map();
  }

  /**
   * Get session data for a player
   * @param {string} playerId - Player ID
   * @param {number} sessionStartTime - Timestamp of first match in session
   * @returns {Object|null} Session data or null if not found/different session
   */
  getSession(playerId, sessionStartTime) {
    const session = this.sessions.get(playerId);
    if (!session) return null;

    // Check if it's the same session (same start time)
    if (session.sessionStartTime === sessionStartTime) {
      return session;
    }

    // Different session, clear old data
    this.sessions.delete(playerId);
    return null;
  }

  /**
   * Store session data for a player
   * @param {string} playerId - Player ID
   * @param {number} sessionStartTime - Timestamp of first match in session
   * @param {number} initialElo - ELO at the start of the session
   */
  setSession(playerId, sessionStartTime, initialElo) {
    this.sessions.set(playerId, {
      sessionStartTime,
      initialElo,
      createdAt: Date.now()
    });
  }

  /**
   * Clear session data for a player
   * @param {string} playerId - Player ID
   */
  clearSession(playerId) {
    this.sessions.delete(playerId);
  }
}

// Export singleton instance
export const sessionEloCache = new SessionEloCache();
