/**
 * Safe Array Operations Utility
 * 
 * Provides memory-safe alternatives to common array operations
 * that can cause stack overflow with very large arrays (500K+ items)
 */

/**
 * Safe batch processing constant
 */
export const SAFE_BATCH_SIZE = 10000; // Process 10K items at a time
export const MAX_ARRAY_SIZE = 1000000; // Hard limit of 1M items

/**
 * Safely process array in batches to avoid stack overflow
 * @param {Array} array - Array to process
 * @param {Function} processor - Function to process each item
 * @param {number} batchSize - Size of each batch (default: SAFE_BATCH_SIZE)
 * @returns {Promise<Array>} Processed results
 */
export async function safeBatchProcess(array, processor, batchSize = SAFE_BATCH_SIZE) {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }

  // SAFETY: Limit array size to prevent memory issues
  const safeArray = array.length > MAX_ARRAY_SIZE 
    ? array.slice(0, MAX_ARRAY_SIZE)
    : array;
  
  if (array.length > MAX_ARRAY_SIZE) {
    console.warn(`[SafeArrayOps] Limiting processing to ${MAX_ARRAY_SIZE} items (from ${array.length}) to prevent memory issues`);
  }

  const results = [];
  
  for (let i = 0; i < safeArray.length; i += batchSize) {
    const batch = safeArray.slice(i, Math.min(i + batchSize, safeArray.length));
    
    // Process batch
    if (processor.constructor.name === 'AsyncFunction') {
      const batchResults = await Promise.all(batch.map(processor));
      for (const result of batchResults) {
        results.push(result);
      }
    } else {
      for (const item of batch) {
        results.push(processor(item));
      }
    }
    
    // Yield to event loop periodically
    if (i % (batchSize * 10) === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
}

/**
 * Safely reduce array in batches
 * @param {Array} array - Array to reduce
 * @param {Function} reducer - Reduce function (acc, item) => newAcc
 * @param {*} initialValue - Initial accumulator value
 * @param {number} batchSize - Size of each batch
 * @returns {*} Final accumulator value
 */
export function safeBatchReduce(array, reducer, initialValue, batchSize = SAFE_BATCH_SIZE) {
  if (!Array.isArray(array) || array.length === 0) {
    return initialValue;
  }

  const safeArray = array.length > MAX_ARRAY_SIZE 
    ? array.slice(0, MAX_ARRAY_SIZE)
    : array;
  
  let accumulator = initialValue;
  
  for (let i = 0; i < safeArray.length; i += batchSize) {
    const batch = safeArray.slice(i, Math.min(i + batchSize, safeArray.length));
    for (const item of batch) {
      accumulator = reducer(accumulator, item);
    }
  }
  
  return accumulator;
}

/**
 * Safely map array in batches
 * @param {Array} array - Array to map
 * @param {Function} mapper - Map function (item) => newItem
 * @param {number} batchSize - Size of each batch
 * @returns {Array} Mapped results
 */
export function safeBatchMap(array, mapper, batchSize = SAFE_BATCH_SIZE) {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }

  const safeArray = array.length > MAX_ARRAY_SIZE 
    ? array.slice(0, MAX_ARRAY_SIZE)
    : array;
  
  const results = [];
  
  for (let i = 0; i < safeArray.length; i += batchSize) {
    const batch = safeArray.slice(i, Math.min(i + batchSize, safeArray.length));
    for (const item of batch) {
      results.push(mapper(item));
    }
  }
  
  return results;
}

/**
 * Safely filter array in batches
 * @param {Array} array - Array to filter
 * @param {Function} predicate - Filter function (item) => boolean
 * @param {number} batchSize - Size of each batch
 * @returns {Array} Filtered results
 */
export function safeBatchFilter(array, predicate, batchSize = SAFE_BATCH_SIZE) {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }

  const safeArray = array.length > MAX_ARRAY_SIZE 
    ? array.slice(0, MAX_ARRAY_SIZE)
    : array;
  
  const results = [];
  
  for (let i = 0; i < safeArray.length; i += batchSize) {
    const batch = safeArray.slice(i, Math.min(i + batchSize, safeArray.length));
    for (const item of batch) {
      if (predicate(item)) {
        results.push(item);
      }
    }
  }
  
  return results;
}

/**
 * Safely calculate min/max without spread operator
 * @param {Array} array - Array of numbers
 * @returns {Object} { min, max }
 */
export function safeMinMax(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return { min: null, max: null };
  }

  const safeArray = array.length > MAX_ARRAY_SIZE 
    ? array.slice(0, MAX_ARRAY_SIZE)
    : array;
  
  let min = safeArray[0];
  let max = safeArray[0];
  
  for (let i = 1; i < safeArray.length; i++) {
    if (safeArray[i] < min) min = safeArray[i];
    if (safeArray[i] > max) max = safeArray[i];
  }
  
  return { min, max };
}

/**
 * Wrap function with stack overflow error handling
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context description for error messages
 * @returns {Function} Wrapped function
 */
export function withStackOverflowProtection(fn, context = 'operation') {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      if (error instanceof RangeError && error.message.includes('Maximum call stack size exceeded')) {
        console.error(`[SafeArrayOps] Stack overflow in ${context}. This indicates an array operation needs batching.`);
        console.error(`[SafeArrayOps] Error:`, error);
        throw new Error(`Stack overflow in ${context}. The operation needs to be batched. Original error: ${error.message}`);
      }
      throw error;
    }
  };
}
