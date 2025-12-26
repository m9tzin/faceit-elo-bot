/**
 * Cache middleware
 * Provides caching functionality for routes
 */

import { cache } from '../utils/cache.js';
import { config } from '../config/index.js';

/**
 * Cache middleware factory
 * @param {string} cacheKey - Key to use for caching
 * @param {Function} [shouldCache] - Optional function to determine if response should be cached
 * @returns {Function} Express middleware
 */
export function cacheMiddleware(cacheKey, shouldCache = () => true) {
  return (req, res, next) => {
    // Check if we should use cache for this request
    if (!shouldCache(req)) {
      return next();
    }

    // Try to get cached data
    const cachedData = cache.get(cacheKey, config.cache.ttl);
    
    if (cachedData) {
      return res.send(cachedData);
    }

    // Store original res.send
    const originalSend = res.send.bind(res);

    // Override res.send to cache the response
    res.send = function(data) {
      if (res.statusCode === 200 && shouldCache(req)) {
        cache.set(cacheKey, data);
      }
      return originalSend(data);
    };

    next();
  };
}

