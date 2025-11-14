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
    
    const cacheData = {
      version: CACHE_VERSION,
      fileUUID,
      agentId,
      output,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        cachedAt: Date.now()
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
    console.error(`Error saving agent output for ${agentId}:`, error);
    console.error(`[CACHE DEBUG] fileUUID: ${fileUUID}, agentId: ${agentId}, error:`, error);
    return false;
  }
}

/**
 * Get agent output from cache
 * @param {string} fileUUID - UUID of the file/bill
 * @param {string} agentId - Agent identifier
 * @returns {Promise<Object|null>} Cached output or null if not found
 */
export async function getAgentOutput(fileUUID, agentId) {
  try {
    const cacheKey = getCacheKey(fileUUID, agentId);
    
    // DEBUG: Log cache key being used
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CACHE DEBUG] getAgentOutput - fileUUID: ${fileUUID}, agentId: ${agentId}, cacheKey: ${cacheKey}`);
    }
    
    const cached = await localforage.getItem(cacheKey);
    
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CACHE DEBUG] Successfully retrieved cached output for ${agentId}`);
    }
    
    return cached.output;
  } catch (error) {
    console.error(`Error getting agent output for ${agentId}:`, error);
    console.error(`[CACHE DEBUG] fileUUID: ${fileUUID}, agentId: ${agentId}, error:`, error);
    return null;
  }
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
