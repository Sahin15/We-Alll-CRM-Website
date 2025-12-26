import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Analytics Caching Hook
 * Provides intelligent caching for analytics data with automatic invalidation
 * 
 * Features:
 * - Time-based cache expiration
 * - Filter-based cache keys
 * - Automatic cache invalidation
 * - Memory management
 * - Cache hit/miss tracking
 * - Background refresh
 */
export const useAnalyticsCache = ({
  cacheKey,
  fetchFunction,
  dependencies = [],
  ttl = 5 * 60 * 1000, // 5 minutes default
  maxCacheSize = 50,
  enableBackgroundRefresh = true,
  refreshInterval = 60000 // 1 minute
}) => {
  // Cache state
  const [cache, setCache] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [cacheStats, setCacheStats] = useState({
    hits: 0,
    misses: 0,
    size: 0
  });

  // Generate cache key based on dependencies
  const computedCacheKey = useMemo(() => {
    const keyData = {
      base: cacheKey,
      deps: dependencies,
      timestamp: Math.floor(Date.now() / ttl) // Bucket by TTL periods
    };
    return JSON.stringify(keyData);
  }, [cacheKey, dependencies, ttl]);

  // Check if cache entry is valid
  const isCacheValid = useCallback((entry) => {
    if (!entry) return false;
    return Date.now() - entry.timestamp < ttl;
  }, [ttl]);

  // Get data from cache or fetch new data
  const getData = useCallback(async (forceRefresh = false) => {
    const cachedEntry = cache.get(computedCacheKey);
    
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cachedEntry && isCacheValid(cachedEntry)) {
      setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
      return cachedEntry.data;
    }

    // Cache miss - fetch new data
    setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await fetchFunction();
      
      // Store in cache
      const newEntry = {
        data,
        timestamp: Date.now(),
        key: computedCacheKey
      };
      
      setCache(prevCache => {
        const newCache = new Map(prevCache);
        
        // Add new entry
        newCache.set(computedCacheKey, newEntry);
        
        // Manage cache size
        if (newCache.size > maxCacheSize) {
          // Remove oldest entries
          const entries = Array.from(newCache.entries());
          entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
          
          const entriesToRemove = entries.slice(0, newCache.size - maxCacheSize);
          entriesToRemove.forEach(([key]) => newCache.delete(key));
        }
        
        return newCache;
      });
      
      setCacheStats(prev => ({ ...prev, size: cache.size + 1 }));
      setLastFetch(Date.now());
      
      return data;
      
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err);
      
      // Return stale data if available
      if (cachedEntry) {
        console.warn('Returning stale cached data due to fetch error');
        return cachedEntry.data;
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [computedCacheKey, cache, isCacheValid, fetchFunction, maxCacheSize]);

  // Invalidate cache entries
  const invalidateCache = useCallback((pattern) => {
    setCache(prevCache => {
      const newCache = new Map();
      
      for (const [key, entry] of prevCache.entries()) {
        if (pattern) {
          // Pattern-based invalidation
          if (typeof pattern === 'string' && !key.includes(pattern)) {
            newCache.set(key, entry);
          } else if (pattern instanceof RegExp && !pattern.test(key)) {
            newCache.set(key, entry);
          } else if (typeof pattern === 'function' && !pattern(key, entry)) {
            newCache.set(key, entry);
          }
        }
        // If no pattern, clear all (handled by not adding to newCache)
      }
      
      return newCache;
    });
    
    setCacheStats(prev => ({ ...prev, size: 0 }));
  }, []);

  // Clear all cache
  const clearCache = useCallback(() => {
    setCache(new Map());
    setCacheStats({ hits: 0, misses: 0, size: 0 });
  }, []);

  // Preload data into cache
  const preloadData = useCallback(async (preloadKey, preloadDeps) => {
    const preloadCacheKey = JSON.stringify({
      base: preloadKey,
      deps: preloadDeps,
      timestamp: Math.floor(Date.now() / ttl)
    });
    
    if (!cache.has(preloadCacheKey)) {
      try {
        const data = await fetchFunction();
        const entry = {
          data,
          timestamp: Date.now(),
          key: preloadCacheKey
        };
        
        setCache(prev => new Map(prev).set(preloadCacheKey, entry));
      } catch (error) {
        console.warn('Failed to preload analytics data:', error);
      }
    }
  }, [cache, fetchFunction, ttl]);

  // Background refresh for current data
  useEffect(() => {
    if (!enableBackgroundRefresh) return;

    const interval = setInterval(async () => {
      const cachedEntry = cache.get(computedCacheKey);
      if (cachedEntry && !isCacheValid(cachedEntry)) {
        try {
          await getData(true); // Force refresh
        } catch (error) {
          console.warn('Background refresh failed:', error);
        }
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [enableBackgroundRefresh, refreshInterval, cache, computedCacheKey, isCacheValid, getData]);

  // Cleanup expired entries periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setCache(prevCache => {
        const newCache = new Map();
        let removedCount = 0;
        
        for (const [key, entry] of prevCache.entries()) {
          if (isCacheValid(entry)) {
            newCache.set(key, entry);
          } else {
            removedCount++;
          }
        }
        
        if (removedCount > 0) {
          console.log(`Cleaned up ${removedCount} expired cache entries`);
          setCacheStats(prev => ({ ...prev, size: prev.size - removedCount }));
        }
        
        return newCache;
      });
    }, ttl); // Cleanup at TTL intervals

    return () => clearInterval(cleanupInterval);
  }, [ttl, isCacheValid]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const hitRate = cacheStats.hits + cacheStats.misses > 0 
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...cacheStats,
      hitRate: `${hitRate}%`,
      lastFetch: lastFetch ? new Date(lastFetch).toLocaleTimeString('en-GB', { hour12: false }) : 'Never',
      cacheAge: lastFetch ? Date.now() - lastFetch : 0
    };
  }, [cacheStats, lastFetch]);

  // Get cached data without fetching
  const getCachedData = useCallback(() => {
    const cachedEntry = cache.get(computedCacheKey);
    return cachedEntry && isCacheValid(cachedEntry) ? cachedEntry.data : null;
  }, [cache, computedCacheKey, isCacheValid]);

  return {
    // Data access
    getData,
    getCachedData,
    
    // Cache management
    invalidateCache,
    clearCache,
    preloadData,
    
    // State
    loading,
    error,
    lastFetch,
    
    // Statistics
    cacheStats: getCacheStats(),
    
    // Utilities
    isDataStale: () => {
      const cachedEntry = cache.get(computedCacheKey);
      return !cachedEntry || !isCacheValid(cachedEntry);
    },
    
    hasCachedData: () => {
      return cache.has(computedCacheKey);
    }
  };
};

export default useAnalyticsCache;