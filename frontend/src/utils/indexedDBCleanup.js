/**
 * IndexedDB Cleanup Utility
 * Clears old/unnecessary IndexedDB data to improve performance
 * Addresses Lighthouse warning about stored data affecting loading performance
 */

/**
 * Clear all IndexedDB databases
 */
export const clearAllIndexedDB = async () => {
  try {
    if (!('indexedDB' in window)) {
      console.log('IndexedDB not available');
      return;
    }

    const databases = await window.indexedDB.databases();
    
    for (const db of databases) {
      const request = window.indexedDB.deleteDatabase(db.name);
      
      request.onerror = () => {
        console.error(`Failed to delete IndexedDB: ${db.name}`);
      };
      
      request.onsuccess = () => {
        console.log(`Cleared IndexedDB: ${db.name}`);
      };
    }
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
};

/**
 * Clear specific IndexedDB database
 */
export const clearIndexedDBDatabase = async (dbName) => {
  try {
    if (!('indexedDB' in window)) {
      console.log('IndexedDB not available');
      return;
    }

    const request = window.indexedDB.deleteDatabase(dbName);
    
    return new Promise((resolve, reject) => {
      request.onerror = () => {
        reject(new Error(`Failed to delete IndexedDB: ${dbName}`));
      };
      
      request.onsuccess = () => {
        console.log(`Cleared IndexedDB: ${dbName}`);
        resolve();
      };
    });
  } catch (error) {
    console.error('Error clearing IndexedDB database:', error);
  }
};

/**
 * Clear IndexedDB storage on app initialization
 * Runs once per session to clean up old data
 */
export const initializeIndexedDBCleanup = () => {
  // Check if cleanup has already run this session
  const cleanupFlag = sessionStorage.getItem('indexeddb_cleanup_done');
  
  if (!cleanupFlag) {
    // Clear Firebase IndexedDB cache (if it exists)
    clearIndexedDBDatabase('firebase-app')
      .catch(err => console.log('Firebase IndexedDB not found or already cleared'));
    
    // Mark cleanup as done for this session
    sessionStorage.setItem('indexeddb_cleanup_done', 'true');
  }
};

/**
 * Get IndexedDB storage size estimate
 */
export const getIndexedDBStorageSize = async () => {
  try {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      console.log('Storage API not available');
      return null;
    }

    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentage: (estimate.usage / estimate.quota) * 100
    };
  } catch (error) {
    console.error('Error getting storage estimate:', error);
    return null;
  }
};

/**
 * Monitor and log IndexedDB storage usage
 */
export const monitorIndexedDBStorage = async () => {
  const size = await getIndexedDBStorageSize();
  if (size) {
    console.log(`IndexedDB Storage: ${(size.usage / 1024 / 1024).toFixed(2)}MB / ${(size.quota / 1024 / 1024).toFixed(2)}MB (${size.percentage.toFixed(1)}%)`);
    
    // If usage is above 80%, clear old data
    if (size.percentage > 80) {
      console.warn('IndexedDB storage usage is high, clearing old data...');
      await clearAllIndexedDB();
    }
  }
};
