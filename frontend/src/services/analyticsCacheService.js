/**
 * Analytics Cache Service
 * Provides intelligent caching for analytics data with automatic invalidation
 * Features:
 * - Memory-based caching with TTL
 * - Intelligent cache invalidation
 * - Background refresh capabilities
 * - Cache warming strategies
 * - Performance monitoring
 */

class AnalyticsCacheService {
  constructor() {
    this.cache = new Map();
    this.cacheMetadata = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 100; // Maximum number of cached items
    this.hitCount = 0;
    this.missCount = 0;
    this.backgroundRefreshEnabled = true;
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Generate cache key from filters and parameters
   */
  generateCacheKey(filters, params = {}) {
    const keyObject = {
      ...filters,
      ...params,
      // Normalize date strings for consistent caching
      startDate: filters.startDate ? new Date(filters.startDate).toISOString().split('T')[0] : null,
      endDate: filters.endDate ? new Date(filters.endDate).toISOString().split('T')[0] : null
    };
    
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(keyObject).sort();
    const keyString = sortedKeys.map(key => `${key}:${keyObject[key]}`).join('|');
    
    return btoa(keyString).replace(/[^a-zA-Z0-9]/g, ''); // Base64 encode and clean
  }

  /**
   * Get analytics data from cache or fetch if not available
   */
  async getAnalytics(filters, params = {}, fetchFunction) {
    const cacheKey = this.generateCacheKey(filters, params);
    const cached = this.get(cacheKey);
    
    if (cached) {
      this.hitCount++;
      
      // Background refresh if data is getting stale
      if (this.shouldBackgroundRefresh(cacheKey)) {
        this.backgroundRefresh(cacheKey, filters, params, fetchFunction);
      }
      
      return cached;
    }
    
    this.missCount++;
    
    // Fetch fresh data
    try {
      const freshData = await fetchFunction(filters, params);
      this.set(cacheKey, freshData, this.calculateTTL(filters, params));
      return freshData;
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      throw error;
    }
  }

  /**
   * Store data in cache with metadata
   */
  set(key, data, ttl = this.defaultTTL) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }
    
    const now = Date.now();
    const expiresAt = now + ttl;
    
    this.cache.set(key, data);
    this.cacheMetadata.set(key, {
      createdAt: now,
      expiresAt,
      accessCount: 1,
      lastAccessed: now,
      size: this.estimateSize(data),
      ttl
    });
  }

  /**
   * Get data from cache
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    const metadata = this.cacheMetadata.get(key);
    const now = Date.now();
    
    // Check if expired
    if (metadata.expiresAt < now) {
      this.delete(key);
      return null;
    }
    
    // Update access metadata
    metadata.accessCount++;
    metadata.lastAccessed = now;
    
    return this.cache.get(key);
  }

  /**
   * Delete item from cache
   */
  delete(key) {
    this.cache.delete(key);
    this.cacheMetadata.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.cacheMetadata.clear();
  }

  /**
   * Invalidate cache based on filters or patterns
   */
  invalidate(pattern) {
    const keysToDelete = [];
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (this.matchesPattern(key, pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    
    return keysToDelete.length;
  }

  /**
   * Invalidate cache when work data changes
   */
  invalidateWorkData(workEntry) {
    const patterns = [];
    
    // Invalidate all analytics if no specific work entry
    if (!workEntry) {
      patterns.push('*');
    } else {
      // Invalidate based on affected dimensions
      if (workEntry.client) {
        patterns.push(`*client:${workEntry.client}*`);
      }
      if (workEntry.project) {
        patterns.push(`*project:${workEntry.project}*`);
      }
      if (workEntry.assignedTo) {
        patterns.push(`*employee:${workEntry.assignedTo}*`);
      }
      if (workEntry.department) {
        patterns.push(`*department:${workEntry.department}*`);
      }
      
      // Invalidate date-based caches
      const workDate = new Date(workEntry.startDate || workEntry.dueDate);
      if (workDate) {
        const dateStr = workDate.toISOString().split('T')[0];
        patterns.push(`*startDate:${dateStr}*`);
        patterns.push(`*endDate:${dateStr}*`);
      }
    }
    
    let totalInvalidated = 0;
    patterns.forEach(pattern => {
      totalInvalidated += this.invalidate(pattern);
    });
    
    return totalInvalidated;
  }

  /**
   * Warm cache with commonly used analytics
   */
  async warmCache(commonFilters, fetchFunction) {
    const warmupPromises = commonFilters.map(async (filters) => {
      try {
        await this.getAnalytics(filters, {}, fetchFunction);
      } catch (error) {
        console.warn('Cache warmup failed for filters:', filters, error);
      }
    });
    
    await Promise.allSettled(warmupPromises);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;
    
    for (const metadata of this.cacheMetadata.values()) {
      totalSize += metadata.size;
      oldestEntry = Math.min(oldestEntry, metadata.createdAt);
      newestEntry = Math.max(newestEntry, metadata.createdAt);
    }
    
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: hitRate.toFixed(2) + '%',
      totalSize: this.formatBytes(totalSize),
      oldestEntry: oldestEntry < Date.now() ? new Date(oldestEntry) : null,
      newestEntry: newestEntry > 0 ? new Date(newestEntry) : null
    };
  }

  /**
   * Calculate appropriate TTL based on data characteristics
   */
  calculateTTL(filters, params) {
    // Shorter TTL for real-time data
    if (params.realTime) {
      return 30 * 1000; // 30 seconds
    }
    
    // Longer TTL for historical data
    const now = new Date();
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    
    // If date range is in the past, cache longer
    if (endDate < now) {
      const daysAgo = (now - endDate) / (1000 * 60 * 60 * 24);
      if (daysAgo > 30) {
        return 60 * 60 * 1000; // 1 hour for old data
      }
    }
    
    // Current/recent data - shorter TTL
    return this.defaultTTL;
  }

  /**
   * Check if cache entry should be refreshed in background
   */
  shouldBackgroundRefresh(key) {
    if (!this.backgroundRefreshEnabled) return false;
    
    const metadata = this.cacheMetadata.get(key);
    if (!metadata) return false;
    
    const now = Date.now();
    const age = now - metadata.createdAt;
    const refreshThreshold = metadata.ttl * 0.8; // Refresh when 80% of TTL elapsed
    
    return age > refreshThreshold;
  }

  /**
   * Refresh cache entry in background
   */
  async backgroundRefresh(key, filters, params, fetchFunction) {
    try {
      const freshData = await fetchFunction(filters, params);
      this.set(key, freshData, this.calculateTTL(filters, params));
    } catch (error) {
      console.warn('Background refresh failed for key:', key, error);
    }
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    let lruKey = null;
    let lruTime = Date.now();
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (metadata.lastAccessed < lruTime) {
        lruTime = metadata.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.delete(lruKey);
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Cleanup every minute
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (metadata.expiresAt < now) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.delete(key));
    
    return expiredKeys.length;
  }

  /**
   * Check if key matches pattern (simple wildcard support)
   */
  matchesPattern(key, pattern) {
    if (pattern === '*') return true;
    
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(key);
  }

  /**
   * Estimate memory size of data
   */
  estimateSize(data) {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Default estimate
    }
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Export cache for debugging
   */
  exportCache() {
    const exported = {};
    
    for (const [key, data] of this.cache.entries()) {
      const metadata = this.cacheMetadata.get(key);
      exported[key] = {
        data,
        metadata
      };
    }
    
    return exported;
  }

  /**
   * Import cache from exported data
   */
  importCache(exported) {
    this.clear();
    
    for (const [key, { data, metadata }] of Object.entries(exported)) {
      // Only import non-expired entries
      if (metadata.expiresAt > Date.now()) {
        this.cache.set(key, data);
        this.cacheMetadata.set(key, metadata);
      }
    }
  }
}

// Create singleton instance
const analyticsCacheService = new AnalyticsCacheService();

export default analyticsCacheService;