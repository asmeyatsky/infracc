/**
 * Safe Operations Utility
 * 
 * Provides defensive programming utilities to prevent crashes:
 * - Memory guards for large datasets
 * - Safe array operations
 * - Safe object access
 * - Batch processing helpers
 * - Error recovery
 */

// Maximum safe array size for operations
export const MAX_SAFE_ARRAY_SIZE = 100000; // 100K items max for safe operations
export const MAX_SCREEN_WORKLOADS = 100000; // Max workloads to render on screen
export const BATCH_SIZE = 10000; // Standard batch size for processing

/**
 * Safely get array length (handles null/undefined/errors)
 */
export function safeArrayLength(arr) {
  try {
    if (!arr) return 0;
    if (!Array.isArray(arr)) return 0;
    return arr.length;
  } catch (e) {
    console.warn('[safeOperations] Error getting array length:', e);
    return 0;
  }
}

/**
 * Safely slice array with memory guard
 */
export function safeSlice(arr, start, end) {
  try {
    if (!arr || !Array.isArray(arr)) return [];
    const safeStart = Math.max(0, start || 0);
    const safeEnd = Math.min(arr.length, end || arr.length);
    return arr.slice(safeStart, safeEnd);
  } catch (e) {
    console.warn('[safeOperations] Error slicing array:', e);
    return [];
  }
}

/**
 * Process array in safe batches with progress callback
 */
export async function processInBatches(arr, processor, options = {}) {
  const {
    batchSize = BATCH_SIZE,
    maxItems = MAX_SAFE_ARRAY_SIZE,
    onProgress = null,
    onError = null
  } = options;

  try {
    if (!arr || !Array.isArray(arr)) {
      return { results: [], processed: 0, errors: [] };
    }

    const safeArr = arr.length > maxItems ? arr.slice(0, maxItems) : arr;
    const results = [];
    const errors = [];
    const total = safeArr.length;

    for (let i = 0; i < total; i += batchSize) {
      try {
        const batch = safeSlice(safeArr, i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((item, idx) => {
            try {
              return processor(item, i + idx);
            } catch (e) {
              if (onError) onError(e, item, i + idx);
              return Promise.reject(e);
            }
          })
        );

        batchResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            errors.push({ index: i + idx, error: result.reason });
            if (onError) onError(result.reason, safeArr[i + idx], i + idx);
          }
        });

        if (onProgress) {
          onProgress(Math.min(i + batchSize, total), total);
        }

        // Yield to event loop every batch
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (batchError) {
        console.error(`[safeOperations] Error processing batch ${i}-${i + batchSize}:`, batchError);
        errors.push({ batch: i, error: batchError });
        if (onError) onError(batchError, null, i);
      }
    }

    return { results, processed: results.length, errors, total };
  } catch (e) {
    console.error('[safeOperations] Fatal error in processInBatches:', e);
    return { results: [], processed: 0, errors: [e], total: 0 };
  }
}

/**
 * Safely access nested object property
 */
export function safeGet(obj, path, defaultValue = null) {
  try {
    if (!obj || typeof obj !== 'object') return defaultValue;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current == null || typeof current !== 'object') return defaultValue;
      current = current[key];
    }
    return current !== undefined ? current : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Check if operation is safe to perform (memory check)
 */
export function isSafeToProcess(count, maxCount = MAX_SAFE_ARRAY_SIZE) {
  return count > 0 && count <= maxCount;
}

/**
 * Get safe subset of array for processing
 */
export function getSafeSubset(arr, maxSize = MAX_SAFE_ARRAY_SIZE) {
  if (!arr || !Array.isArray(arr)) return [];
  if (arr.length <= maxSize) return arr;
  console.warn(`[safeOperations] Limiting array from ${arr.length} to ${maxSize} items`);
  return arr.slice(0, maxSize);
}

/**
 * Safe JSON stringify with error handling
 */
export function safeStringify(obj, fallback = '{}') {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    console.warn('[safeOperations] Error stringifying object:', e);
    return fallback;
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn('[safeOperations] Error parsing JSON:', e);
    return fallback;
  }
}

/**
 * Memory monitor - check if we're approaching memory limits
 */
export function checkMemoryHealth() {
  try {
    if (typeof performance !== 'undefined' && performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.totalJSHeapSize;
      const limit = performance.memory.jsHeapSizeLimit;
      const percentUsed = (used / limit) * 100;
      
      return {
        used,
        total,
        limit,
        percentUsed,
        isHealthy: percentUsed < 80, // Healthy if < 80% used
        warning: percentUsed > 90 // Warning if > 90% used
      };
    }
    return { isHealthy: true, warning: false };
  } catch (e) {
    return { isHealthy: true, warning: false };
  }
}

/**
 * Debounce function with safety checks
 */
export function safeDebounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      try {
        func(...args);
      } catch (e) {
        console.error('[safeOperations] Error in debounced function:', e);
      }
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
