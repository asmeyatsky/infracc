/**
 * Clear All Storage Utility
 * 
 * Comprehensive function to clear all application storage:
 * - IndexedDB databases (agent cache, workloads, checkpoints)
 * - localStorage data
 * - All cached agent outputs and pipeline states
 */

import localforage from 'localforage';
import { checkpointService } from './checkpointService.js';

/**
 * Clear all agent cache (localforage IndexedDB)
 */
async function clearAgentCache() {
  try {
    console.log('[CLEAR] Clearing agent cache...');
    await localforage.clear();
    console.log('[CLEAR] Agent cache cleared');
    return true;
  } catch (error) {
    console.error('[CLEAR] Error clearing agent cache:', error);
    return false;
  }
}

/**
 * Clear WorkloadRepository IndexedDB
 */
async function clearWorkloadRepository() {
  try {
    console.log('[CLEAR] Clearing workload repository...');
    const workloadStorage = localforage.createInstance({
      name: 'WorkloadRepository',
      storeName: 'workloads'
    });
    await workloadStorage.clear();
    console.log('[CLEAR] Workload repository cleared');
    return true;
  } catch (error) {
    console.error('[CLEAR] Error clearing workload repository:', error);
    return false;
  }
}

/**
 * Clear checkpoint IndexedDB
 */
async function clearCheckpoints() {
  try {
    console.log('[CLEAR] Clearing checkpoints...');
    // Get all sessions and clear them
    if (window.checkpointService) {
      // Clear all checkpoints by deleting the database
      if (window.indexedDB) {
        return new Promise((resolve) => {
          const deleteRequest = indexedDB.deleteDatabase('infracc-checkpoints');
          deleteRequest.onsuccess = () => {
            console.log('[CLEAR] Checkpoints database deleted');
            resolve(true);
          };
          deleteRequest.onerror = () => {
            console.error('[CLEAR] Error deleting checkpoints database');
            resolve(false);
          };
          deleteRequest.onblocked = () => {
            console.warn('[CLEAR] Checkpoints database deletion blocked');
            resolve(false);
          };
        });
      }
    }
    return true;
  } catch (error) {
    console.error('[CLEAR] Error clearing checkpoints:', error);
    return false;
  }
}

/**
 * Clear all localStorage items related to the app
 */
function clearLocalStorage() {
  try {
    console.log('[CLEAR] Clearing localStorage...');
    
    // Clear known keys
    const keysToRemove = [
      'checkpoints',
      'gcp-modernization-accelerator',
      'gcp-ma-projects',
      'sessionId',
      'crashLogs',  // Note: key is 'crashLogs' not 'crash-logs'
      'crash-logs'  // Also clear old format if it exists
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`[CLEAR] Could not remove localStorage key: ${key}`, e);
      }
    });
    
    // Also clear any keys that start with known prefixes
    const prefixes = ['agent_cache_', 'pipeline_state_', 'checkpoint_'];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && prefixes.some(prefix => key.startsWith(prefix))) {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignore errors
        }
      }
    }
    
    console.log('[CLEAR] localStorage cleared');
    return true;
  } catch (error) {
    console.error('[CLEAR] Error clearing localStorage:', error);
    return false;
  }
}

/**
 * Clear all IndexedDB databases
 */
async function clearAllIndexedDB() {
  try {
    console.log('[CLEAR] Clearing all IndexedDB databases...');
    
    if (!window.indexedDB) {
      console.log('[CLEAR] IndexedDB not available');
      return true;
    }
    
    // List of known databases to delete
    const databases = [
      'infracc-agent-cache',
      'WorkloadRepository',
      'infracc-checkpoints'
    ];
    
    const deletePromises = databases.map(dbName => {
      return new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => {
          console.log(`[CLEAR] Deleted IndexedDB database: ${dbName}`);
          resolve(true);
        };
        deleteRequest.onerror = () => {
          console.error(`[CLEAR] Error deleting database: ${dbName}`);
          resolve(false);
        };
        deleteRequest.onblocked = () => {
          console.warn(`[CLEAR] Database deletion blocked: ${dbName}`);
          // Wait a bit and try again
          setTimeout(() => {
            const retryRequest = indexedDB.deleteDatabase(dbName);
            retryRequest.onsuccess = () => {
              console.log(`[CLEAR] Retry successful: ${dbName}`);
              resolve(true);
            };
            retryRequest.onerror = () => resolve(false);
          }, 1000);
        };
      });
    });
    
    await Promise.all(deletePromises);
    console.log('[CLEAR] All IndexedDB databases cleared');
    return true;
  } catch (error) {
    console.error('[CLEAR] Error clearing IndexedDB:', error);
    return false;
  }
}

/**
 * Clear all application storage
 * This is the main function to call when you want to start fresh
 * 
 * @returns {Promise<Object>} Results of clearing each storage type
 */
export async function clearAllStorage() {
  console.log('🧹 Starting complete storage clear...');
  
  const results = {
    agentCache: false,
    workloadRepository: false,
    checkpoints: false,
    localStorage: false,
    indexedDB: false
  };
  
  try {
    // Clear in parallel where possible
    const [agentCacheResult, workloadResult, checkpointResult, localStorageResult] = await Promise.all([
      clearAgentCache(),
      clearWorkloadRepository(),
      clearCheckpoints(),
      Promise.resolve(clearLocalStorage())
    ]);
    
    results.agentCache = agentCacheResult;
    results.workloadRepository = workloadResult;
    results.checkpoints = checkpointResult;
    results.localStorage = localStorageResult;
    
    // Clear all IndexedDB databases (this will also clear the ones above, but ensures everything is gone)
    results.indexedDB = await clearAllIndexedDB();
    
    const allSuccess = Object.values(results).every(r => r === true);
    
    if (allSuccess) {
      console.log('✅ All storage cleared successfully!');
    } else {
      console.warn('⚠️ Some storage clearing operations may have failed:', results);
    }
    
    return results;
  } catch (error) {
    console.error('❌ Error during storage clear:', error);
    return results;
  }
}

/**
 * Clear storage and reload the page
 * Useful for a "start fresh" button
 */
export async function clearAllStorageAndReload() {
  const confirmed = window.confirm(
    'This will clear ALL stored data including:\n' +
    '- All agent outputs and pipeline states\n' +
    '- All uploaded workloads\n' +
    '- All checkpoints and progress\n' +
    '- All localStorage data\n\n' +
    'Are you sure you want to start completely fresh?'
  );
  
  if (!confirmed) {
    return;
  }
  
  try {
    await clearAllStorage();
    console.log('🔄 Reloading page...');
    window.location.reload();
  } catch (error) {
    console.error('Error clearing storage:', error);
    alert('Error clearing storage. Please check the console for details.');
  }
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  window.clearAllStorage = clearAllStorage;
  window.clearAllStorageAndReload = clearAllStorageAndReload;
}
