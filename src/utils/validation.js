/**
 * Validation Utilities
 * 
 * Centralized validation functions for use cases and components
 * 
 * Architectural Intent:
 * - Input validation for use cases
 * - Reusable validation functions
 * - Type checking and constraint validation
 */

/**
 * Validate workload ID
 * @param {string} workloadId 
 * @throws {Error} If invalid
 */
export function validateWorkloadId(workloadId) {
  if (!workloadId || typeof workloadId !== 'string' || workloadId.trim() === '') {
    throw new Error('Workload ID is required and must be a non-empty string');
  }
}

/**
 * Validate workload IDs array
 * @param {Array} workloadIds 
 * @throws {Error} If invalid
 */
export function validateWorkloadIds(workloadIds) {
  if (!Array.isArray(workloadIds)) {
    throw new Error('Workload IDs must be an array');
  }
  if (workloadIds.length === 0) {
    throw new Error('At least one workload ID is required');
  }
  // SAFETY: Batch forEach to avoid stack overflow with large arrays
  const VALIDATE_IDS_BATCH_SIZE = 10000;
  for (let i = 0; i < workloadIds.length; i += VALIDATE_IDS_BATCH_SIZE) {
    const batch = workloadIds.slice(i, Math.min(i + VALIDATE_IDS_BATCH_SIZE, workloadIds.length));
    for (let j = 0; j < batch.length; j++) {
      const id = batch[j];
      const index = i + j;
      if (!id || typeof id !== 'string') {
        throw new Error(`Invalid workload ID at index ${index}: must be a non-empty string`);
      }
    }
  }
}

/**
 * Validate cloud provider
 * @param {string} provider 
 * @throws {Error} If invalid
 */
export function validateCloudProvider(provider) {
  const validProviders = ['aws', 'azure', 'gcp', 'on_premise'];
  if (!provider || !validProviders.includes(provider.toLowerCase())) {
    throw new Error(`Invalid cloud provider: ${provider}. Must be one of: ${validProviders.join(', ')}`);
  }
}

/**
 * Validate timeframe
 * @param {number} timeframe 
 * @throws {Error} If invalid
 */
export function validateTimeframe(timeframe) {
  const months = parseInt(timeframe);
  if (isNaN(months) || months < 12 || months > 60) {
    throw new Error('Timeframe must be between 12 and 60 months');
  }
}

/**
 * Validate cost value
 * @param {number} cost 
 * @param {string} fieldName 
 * @throws {Error} If invalid
 */
export function validateCost(cost, fieldName = 'Cost') {
  const value = parseFloat(cost);
  if (isNaN(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }
}

/**
 * Validate region
 * @param {string} region 
 * @throws {Error} If invalid
 */
export function validateRegion(region) {
  if (!region || typeof region !== 'string' || region.trim() === '') {
    throw new Error('Region is required and must be a non-empty string');
  }
}

/**
 * Validate service name
 * @param {string} serviceName 
 * @throws {Error} If invalid
 */
export function validateServiceName(serviceName) {
  if (!serviceName || typeof serviceName !== 'string' || serviceName.trim() === '') {
    throw new Error('Service name is required and must be a non-empty string');
  }
}

/**
 * Validate assessment input
 * @param {Object} input 
 * @param {string} input.workloadId 
 * @param {boolean} input.includeCodeMod 
 * @throws {Error} If invalid
 */
export function validateAssessmentInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Assessment input must be an object');
  }
  validateWorkloadId(input.workloadId);
  if (input.includeCodeMod !== undefined && typeof input.includeCodeMod !== 'boolean') {
    throw new Error('includeCodeMod must be a boolean');
  }
}

/**
 * Validate migration plan input
 * @param {Object} input 
 * @param {Array} input.workloadIds 
 * @param {boolean} input.useCodeMod 
 * @throws {Error} If invalid
 */
export function validateMigrationPlanInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Migration plan input must be an object');
  }
  validateWorkloadIds(input.workloadIds);
  if (input.useCodeMod !== undefined && typeof input.useCodeMod !== 'boolean') {
    throw new Error('useCodeMod must be a boolean');
  }
}

/**
 * Validate TCO input
 * @param {Object} input 
 * @throws {Error} If invalid
 */
export function validateTCOInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('TCO input must be an object');
  }
  
  if (input.timeframe) {
    validateTimeframe(input.timeframe);
  }
  
  if (input.region) {
    validateRegion(input.region);
  }

  // Validate cost objects
  // SAFETY: Batch Object.values and forEach to avoid stack overflow with large objects
  const costObjects = ['onPremise', 'aws', 'azure', 'gcp', 'migration'];
  for (const objName of costObjects) {
    if (input[objName] && typeof input[objName] === 'object') {
      // SAFETY: Batch Object.values iteration
      const values = Object.values(input[objName]);
      const VALIDATE_BATCH_SIZE = 1000;
      for (let i = 0; i < values.length; i += VALIDATE_BATCH_SIZE) {
        const batch = values.slice(i, Math.min(i + VALIDATE_BATCH_SIZE, values.length));
        for (const cost of batch) {
          if (cost !== undefined && cost !== null) {
            validateCost(cost, `${objName} cost`);
          }
        }
      }
    }
  }
}

export default {
  validateWorkloadId,
  validateWorkloadIds,
  validateCloudProvider,
  validateTimeframe,
  validateCost,
  validateRegion,
  validateServiceName,
  validateAssessmentInput,
  validateMigrationPlanInput,
  validateTCOInput
};
