/**
 * Agent Cache Service
 * 
 * Manages agent output caching using IndexedDB (via localforage)
 * Each agent's output is cached separately and can be retrieved independently
 */

import localforage from 'localforage';

// Configure localforage to use IndexedDB
localforage.config({
  name: 'infracc-agent-cache',
  storeName: 'agent_outputs',
  description: 'Cache for agent outputs in migration pipeline'
});

const CACHE_VERSION = '1.0.0';
const CACHE_PREFIX = 'agent_cache_v1';

/**
 * Get cache key for a specific agent and file UUID
 * @param {string} fileUUID - UUID of the file/bill
 * @param {string} agentId - Agent identifier (discovery, assessment, strategy, cost)
 * @returns {string} Cache key
 */
function getCacheKey(fileUUID, agentId) {
  return `${CACHE_PREFIX}_${fileUUID}_${agentId}`;
}

/**
 * Get pipeline state cache key
 * @param {string} fileUUID - UUID of the file/bill
 * @returns {string} Cache key
 */
function getPipelineStateKey(fileUUID) {
  return `${CACHE_PREFIX}_${fileUUID}_pipeline_state`;
}

/**
 * Save agent output to cache
 * @param {string} fileUUID - UUID of the file/bill
 * @param {string} agentId - Agent identifier
 * @param {Object} output - Agent output data
 * @param {Object} metadata - Optional metadata (timestamp, workloadCount, etc.)
 * @returns {Promise<boolean>} Success status
 */
export async function saveAgentOutput(fileUUID, agentId, output, metadata = {}) {
  try {
    const cacheKey = getCacheKey(fileUUID, agentId);
    
    // DEBUG: Log cache key being used
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CACHE DEBUG] saveAgentOutput - fileUUID: ${fileUUID}, agentId: ${agentId}, cacheKey: ${cacheKey}`);
    }
    
    // CRITICAL: Strip large arrays BEFORE saving to prevent storing huge objects in IndexedDB
    // This prevents crashes when loading the cache later
    let outputToSave = output;
    if (checkIfNeedsStripping(output, agentId)) {
      console.warn(`[CACHE] Output for ${agentId} contains large arrays - stripping before save to prevent memory issues`);
      outputToSave = createLightweightVersion(output, agentId);
    }
    
    const cacheData = {
      version: CACHE_VERSION,
      fileUUID,
      agentId,
      output: outputToSave,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        cachedAt: Date.now(),
        // Store counts if arrays were stripped
        stripped: outputToSave !== output
      }
    };
    
    await localforage.setItem(cacheKey, cacheData);
    
    // Verify it was saved immediately
    const verify = await localforage.getItem(cacheKey);
    if (!verify) {
      console.error(`[CACHE DEBUG] Failed to verify save for ${agentId}. Key: ${cacheKey}`);
      return false;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CACHE DEBUG] Successfully saved and verified cache for ${agentId}`);
    }
    
    return true;
  } catch (error) {
    // CRITICAL: If save fails due to quota, try saving lightweight version
    if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
      console.warn(`[CACHE] Quota error saving ${agentId} cache, attempting lightweight version...`);
      try {
        const lightweightOutput = createLightweightVersion(output, agentId);
        return await saveAgentOutput(fileUUID, agentId, lightweightOutput, { ...metadata, savedAsLightweight: true });
      } catch (retryError) {
        console.error(`[CACHE] Failed to save lightweight version:`, retryError);
      }
    }
    
    console.error(`Error saving agent output for ${agentId}:`, error);
    console.error(`[CACHE DEBUG] fileUUID: ${fileUUID}, agentId: ${agentId}, error:`, error);
    return false;
  }
}

/**
 * Get agent output from cache
 * MEMORY-SAFE: Checks memory before loading and strips large arrays if needed
 * @param {string} fileUUID - UUID of the file/bill
 * @param {string} agentId - Agent identifier
 * @param {Object} options - Options for retrieval
 * @param {boolean} options.lightweight - If true, return lightweight version without large arrays
 * @returns {Promise<Object|null>} Cached output or null if not found
 */
export async function getAgentOutput(fileUUID, agentId, options = {}) {
  try {
    const cacheKey = getCacheKey(fileUUID, agentId);
    
    // DEBUG: Log cache key being used
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CACHE DEBUG] getAgentOutput - fileUUID: ${fileUUID}, agentId: ${agentId}, cacheKey: ${cacheKey}`);
    }
    
    // CRITICAL: Check memory before loading large cached data
    let shouldLoadLightweight = options.lightweight || false;
    if (performance.memory) {
      const usedMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = performance.memory.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;
      
      if (usagePercent > 70) {
        console.warn(`[CACHE] Memory usage ${usagePercent.toFixed(1)}% - Will load lightweight version of ${agentId} cache`);
        shouldLoadLightweight = true;
      }
    }
    
    // CRITICAL: Wrap getItem in try-catch to handle memory errors during deserialization
    // IndexedDB deserialization can crash if the object is too large
    let cached;
    try {
      cached = await localforage.getItem(cacheKey);
    } catch (loadError) {
      // If loading fails due to memory/quota, try to clear and return null
      if (loadError.name === 'QuotaExceededError' || 
          loadError.message?.includes('quota') || 
          loadError.message?.includes('memory') ||
          loadError.message?.includes('exceeded')) {
        console.error(`[CACHE] Failed to load ${agentId} cache due to memory/quota error. Cache may be too large.`, loadError);
        // Don't retry - the object is too large to load
        return null;
      }
      // Re-throw other errors
      throw loadError;
    }
    
    if (!cached) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[CACHE DEBUG] No cached data found for key: ${cacheKey}`);
      }
      return null;
    }
    
    // Verify cache version and file UUID match
    if (cached.version !== CACHE_VERSION) {
      console.warn(`[CACHE DEBUG] Version mismatch for ${agentId}. Expected: ${CACHE_VERSION}, Got: ${cached.version}`);
      await clearAgentOutput(fileUUID, agentId);
      return null;
    }
    
    if (cached.fileUUID !== fileUUID) {
      console.warn(`[CACHE DEBUG] fileUUID mismatch for ${agentId}. Expected: ${fileUUID}, Got: ${cached.fileUUID}`);
      await clearAgentOutput(fileUUID, agentId);
      return null;
    }
    
    let output = cached.output;
    
    // CRITICAL: Always strip large arrays if they exceed thresholds, regardless of memory state
    // This prevents crashes when processing very large cached objects
    // Note: The object is already in memory at this point, but we can still free memory by removing arrays
    if (output) {
      const shouldStrip = shouldLoadLightweight || checkIfNeedsStripping(output, agentId);
      if (shouldStrip) {
        output = createLightweightVersion(output, agentId);
        // CRITICAL: Force garbage collection hint after stripping large arrays
        if (global.gc) {
          global.gc();
        } else if (window.gc) {
          window.gc();
        }
        if (process.env.NODE_ENV === 'development') {
          console.log(`[CACHE DEBUG] Returned lightweight version of ${agentId} cache`);
        }
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CACHE DEBUG] Successfully retrieved cached output for ${agentId}`);
    }
    
    return output;
  } catch (error) {
    // CRITICAL: If error is QuotaExceededError or similar, try lightweight version
    if (error.name === 'QuotaExceededError' || error.message?.includes('quota') || error.message?.includes('memory')) {
      console.warn(`[CACHE] Memory/quota error loading ${agentId} cache, attempting lightweight version...`);
      try {
        return await getAgentOutput(fileUUID, agentId, { lightweight: true });
      } catch (retryError) {
        console.error(`[CACHE] Failed to load lightweight version:`, retryError);
      }
    }
    
    console.error(`Error getting agent output for ${agentId}:`, error);
    console.error(`[CACHE DEBUG] fileUUID: ${fileUUID}, agentId: ${agentId}, error:`, error);
    return null;
  }
}

/**
 * Check if output needs array stripping based on size thresholds
 * @param {Object} output - Agent output
 * @param {string} agentId - Agent identifier
 * @returns {boolean} True if arrays should be stripped
 */
function checkIfNeedsStripping(output, agentId) {
  if (!output || typeof output !== 'object') {
    return false;
  }
  
  // Strategy agent: Check planItems and plans arrays
  if (agentId === 'strategy' && output.migrationPlan) {
    const planItemsCount = output.migrationPlan.planItems?.length || 0;
    const plansCount = output.migrationPlan.plans?.length || 0;
    if (planItemsCount > 10000 || plansCount > 10000) {
      return true;
    }
  }
  
  // Assessment/Discovery agents: Check workloads array
  if ((agentId === 'assessment' || agentId === 'discovery') && Array.isArray(output.workloads)) {
    if (output.workloads.length > 10000) {
      return true;
    }
  }
  
  // Cost agent: Check costEstimates array
  if (agentId === 'cost' && Array.isArray(output.costEstimates)) {
    if (output.costEstimates.length > 50000) {
      return true;
    }
  }
  
  return false;
}

/**
 * Create a lightweight version of agent output by removing large arrays
 * @param {Object} output - Full agent output
 * @param {string} agentId - Agent identifier
 * @returns {Object} Lightweight version without large arrays
 */
function createLightweightVersion(output, agentId) {
  if (!output || typeof output !== 'object') {
    return output;
  }
  
  // Create a shallow copy to avoid mutating original
  const lightweight = { ...output };
  
  // Strategy agent: Remove planItems array (can be 266K+ items)
  if (agentId === 'strategy' && lightweight.migrationPlan) {
    const planItemsCount = lightweight.migrationPlan.planItems?.length || 0;
    if (planItemsCount > 10000) {
      console.warn(`[CACHE] Removing planItems array (${planItemsCount.toLocaleString()} items) from strategy cache to save memory`);
      lightweight.migrationPlan = {
        ...lightweight.migrationPlan,
        planItems: undefined, // Remove large array
        planItemsCount // Keep count for reference
      };
    }
    
    // Also check plans array
    const plansCount = lightweight.migrationPlan.plans?.length || 0;
    if (plansCount > 10000) {
      console.warn(`[CACHE] Removing plans array (${plansCount.toLocaleString()} items) from strategy cache to save memory`);
      lightweight.migrationPlan = {
        ...lightweight.migrationPlan,
        plans: undefined,
        plansCount
      };
    }
  }
  
  // Assessment agent: Remove workloads array if present
  if (agentId === 'assessment' && Array.isArray(lightweight.workloads)) {
    const workloadCount = lightweight.workloads.length;
    if (workloadCount > 10000) {
      console.warn(`[CACHE] Removing workloads array (${workloadCount.toLocaleString()} items) from assessment cache to save memory`);
      lightweight.workloads = undefined;
      lightweight.workloadCount = workloadCount;
    }
  }
  
  // Discovery agent: Remove workloads array if present
  if (agentId === 'discovery' && Array.isArray(lightweight.workloads)) {
    const workloadCount = lightweight.workloads.length;
    if (workloadCount > 10000) {
      console.warn(`[CACHE] Removing workloads array (${workloadCount.toLocaleString()} items) from discovery cache to save memory`);
      lightweight.workloads = undefined;
      lightweight.workloadCount = workloadCount;
    }
  }
  
  // Cost agent: Limit costEstimates array
  if (agentId === 'cost' && Array.isArray(lightweight.costEstimates)) {
    const costEstimatesCount = lightweight.costEstimates.length;
    if (costEstimatesCount > 50000) {
      console.warn(`[CACHE] Limiting costEstimates array from ${costEstimatesCount.toLocaleString()} to 50K items`);
      lightweight.costEstimates = lightweight.costEstimates.slice(0, 50000);
      lightweight.costEstimatesTotal = costEstimatesCount;
    }
  }
  
  return lightweight;
}

/**
 * Get agent cache metadata
 * @param {string} fileUUID - UUID of the file/bill
 * @param {string} agentId - Agent identifier
 * @returns {Promise<Object|null>} Cache metadata or null
 */
export async function getAgentCacheMetadata(fileUUID, agentId) {
  try {
    const cacheKey = getCacheKey(fileUUID, agentId);
    const cached = await localforage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }
    
    return cached.metadata || {};
  } catch (error) {
    console.error(`Error getting cache metadata for ${agentId}:`, error);
    return null;
  }
}

/**
 * Check if agent output exists in cache
 * @param {string} fileUUID - UUID of the file/bill
 * @param {string} agentId - Agent identifier
 * @returns {Promise<boolean>} True if cached output exists
 */
export async function hasAgentOutput(fileUUID, agentId) {
  try {
    const cacheKey = getCacheKey(fileUUID, agentId);
    const cached = await localforage.getItem(cacheKey);
    return cached !== null && cached.version === CACHE_VERSION && cached.fileUUID === fileUUID;
  } catch (error) {
    return false;
  }
}

/**
 * Clear agent output from cache
 * @param {string} fileUUID - UUID of the file/bill
 * @param {string} agentId - Agent identifier
 * @returns {Promise<boolean>} Success status
 */
export async function clearAgentOutput(fileUUID, agentId) {
  try {
    const cacheKey = getCacheKey(fileUUID, agentId);
    await localforage.removeItem(cacheKey);
    return true;
  } catch (error) {
    console.error(`Error clearing agent output for ${agentId}:`, error);
    return false;
  }
}

/**
 * Clear all cache for a specific file UUID
 * @param {string} fileUUID - UUID of the file/bill
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllCacheForFile(fileUUID) {
  try {
    const agentIds = ['discovery', 'assessment', 'strategy', 'cost'];
    await Promise.all(agentIds.map(agentId => clearAgentOutput(fileUUID, agentId)));
    await clearPipelineState(fileUUID);
    return true;
  } catch (error) {
    console.error(`Error clearing all cache for file ${fileUUID}:`, error);
    return false;
  }
}

/**
 * Save pipeline state (current step, progress, etc.)
 * @param {string} fileUUID - UUID of the file/bill
 * @param {Object} state - Pipeline state
 * @returns {Promise<boolean>} Success status
 */
export async function savePipelineState(fileUUID, state) {
  try {
    const stateKey = getPipelineStateKey(fileUUID);
    const stateData = {
      version: CACHE_VERSION,
      fileUUID,
      ...state,
      timestamp: new Date().toISOString()
    };
    
    await localforage.setItem(stateKey, stateData);
    return true;
  } catch (error) {
    console.error('Error saving pipeline state:', error);
    return false;
  }
}

/**
 * Get pipeline state
 * @param {string} fileUUID - UUID of the file/bill
 * @returns {Promise<Object|null>} Pipeline state or null
 */
export async function getPipelineState(fileUUID) {
  try {
    const stateKey = getPipelineStateKey(fileUUID);
    const state = await localforage.getItem(stateKey);
    
    if (!state || state.fileUUID !== fileUUID) {
      return null;
    }
    
    return state;
  } catch (error) {
    console.error('Error getting pipeline state:', error);
    return null;
  }
}

/**
 * Clear pipeline state
 * @param {string} fileUUID - UUID of the file/bill
 * @returns {Promise<boolean>} Success status
 */
export async function clearPipelineState(fileUUID) {
  try {
    const stateKey = getPipelineStateKey(fileUUID);
    await localforage.removeItem(stateKey);
    return true;
  } catch (error) {
    console.error('Error clearing pipeline state:', error);
    return false;
  }
}

/**
 * Get all cached agent IDs for a file UUID
 * @param {string} fileUUID - UUID of the file/bill
 * @returns {Promise<string[]>} Array of agent IDs that have cached output
 */
export async function getCachedAgentIds(fileUUID) {
  try {
    const agentIds = ['discovery', 'assessment', 'strategy', 'cost'];
    const cachedAgents = [];
    
    for (const agentId of agentIds) {
      const hasCache = await hasAgentOutput(fileUUID, agentId);
      if (hasCache) {
        cachedAgents.push(agentId);
      }
    }
    
    return cachedAgents;
  } catch (error) {
    console.error('Error getting cached agent IDs:', error);
    return [];
  }
}
