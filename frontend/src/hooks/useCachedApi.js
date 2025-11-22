import { useState, useEffect, useCallback } from 'react';
import apiCache from '../utils/apiCache';
import apiOptimizer from '../utils/apiOptimizer';

/**
 * Custom hook for cached API calls
 * Automatically handles caching, deduplication, and loading states
 * 
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Configuration options
 * @param {number} options.ttl - Cache TTL in milliseconds (default: 5 minutes)
 * @param {boolean} options.enabled - Whether to fetch immediately (default: true)
 * @param {Array} options.dependencies - Dependencies to trigger refetch
 * @param {string} options.cacheKey - Custom cache key (auto-generated if not provided)
 * @param {boolean} options.deduplicate - Enable request deduplication (default: true)
 */
export const useCachedApi = (
  apiFunction,
  options = {}
) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    enabled = true,
    dependencies = [],
    cacheKey: customCacheKey,
    deduplicate = true,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate cache key
  const cacheKey = customCacheKey || `${apiFunction.name || 'api'}_${JSON.stringify(dependencies)}`;

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = apiCache.get(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return cachedData;
        }
      }

      // Make API call with optional deduplication
      let response;
      if (deduplicate) {
        response = await apiOptimizer.deduplicate(cacheKey, apiFunction);
      } else {
        response = await apiFunction();
      }

      const responseData = response.data;

      // Cache the response
      apiCache.set(cacheKey, responseData, ttl);

      setData(responseData);
      setLoading(false);
      return responseData;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, [apiFunction, cacheKey, ttl, deduplicate]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, ...dependencies]);

  // Refetch function for manual refresh
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Clear cache for this key
  const clearCache = useCallback(() => {
    apiCache.clear(cacheKey);
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
  };
};

export default useCachedApi;
