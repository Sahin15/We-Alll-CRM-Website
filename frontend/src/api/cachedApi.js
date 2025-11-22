import apiCache from '../utils/apiCache';
import apiOptimizer from '../utils/apiOptimizer';

/**
 * Cached API Wrapper
 * Wraps API calls with caching and deduplication
 */

/**
 * Make cached API call
 * @param {string} cacheKey - Unique cache key
 * @param {Function} apiFunction - API function to call
 * @param {Object} options - Options
 * @param {number} options.ttl - Cache TTL in milliseconds
 * @param {boolean} options.deduplicate - Enable deduplication
 * @param {boolean} options.forceRefresh - Skip cache and fetch fresh data
 */
export const cachedApiCall = async (
  cacheKey,
  apiFunction,
  options = {}
) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    deduplicate = true,
    forceRefresh = false,
  } = options;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return { data: cachedData, fromCache: true };
    }
  }

  // Make API call with optional deduplication
  let response;
  if (deduplicate) {
    response = await apiOptimizer.deduplicate(cacheKey, apiFunction);
  } else {
    response = await apiFunction();
  }

  // Cache the response
  apiCache.set(cacheKey, response.data, ttl);

  return { ...response, fromCache: false };
};

/**
 * Create cached version of API module
 * @param {Object} apiModule - API module with methods
 * @param {Object} config - Configuration for each method
 */
export const createCachedApi = (apiModule, config = {}) => {
  const cachedApi = {};

  Object.keys(apiModule).forEach((methodName) => {
    const originalMethod = apiModule[methodName];
    const methodConfig = config[methodName] || {};

    cachedApi[methodName] = async (...args) => {
      // Generate cache key from method name and arguments
      const cacheKey = `${methodName}_${JSON.stringify(args)}`;

      return cachedApiCall(
        cacheKey,
        () => originalMethod(...args),
        methodConfig
      );
    };
  });

  return cachedApi;
};

/**
 * Invalidate cache for specific patterns
 */
export const invalidateCache = (pattern) => {
  if (pattern === '*') {
    apiCache.clearAll();
  } else {
    apiCache.clearPattern(pattern);
  }
};

/**
 * Invalidate cache for specific resource
 */
export const invalidateResource = (resource) => {
  // Clear all cache entries related to this resource
  apiCache.clearPattern(`^${resource}`);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return apiCache.getStats();
};

export default {
  cachedApiCall,
  createCachedApi,
  invalidateCache,
  invalidateResource,
  getCacheStats,
};
