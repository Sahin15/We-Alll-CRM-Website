/**
 * API Optimizer Utility
 * Provides request deduplication and batching capabilities
 */

class ApiOptimizer {
  constructor() {
    this.pendingRequests = new Map();
    this.requestQueue = [];
    this.batchTimeout = null;
  }

  /**
   * Deduplicate identical concurrent requests
   * If same request is already in flight, return the existing promise
   */
  deduplicate(key, requestFn) {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request promise
    const promise = requestFn()
      .then((result) => {
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Check if request is currently pending
   */
  isPending(key) {
    return this.pendingRequests.has(key);
  }

  /**
   * Clear pending request
   */
  clearPending(key) {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAllPending() {
    this.pendingRequests.clear();
  }

  /**
   * Get pending requests count
   */
  getPendingCount() {
    return this.pendingRequests.size;
  }
}

// Create singleton instance
const apiOptimizer = new ApiOptimizer();

export default apiOptimizer;
