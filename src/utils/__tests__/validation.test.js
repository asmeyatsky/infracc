/**
 * Validation Utilities Tests
 */

import {
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
} from '../validation.js';

describe('Validation Utilities', () => {
  describe('validateWorkloadId', () => {
    it('should accept valid workload ID', () => {
      expect(() => validateWorkloadId('workload_123')).not.toThrow();
    });

    it('should throw error for empty string', () => {
      expect(() => validateWorkloadId('')).toThrow('Workload ID is required');
    });

    it('should throw error for null', () => {
      expect(() => validateWorkloadId(null)).toThrow('Workload ID is required');
    });
  });

  describe('validateWorkloadIds', () => {
    it('should accept valid workload IDs array', () => {
      expect(() => validateWorkloadIds(['id1', 'id2'])).not.toThrow();
    });

    it('should throw error for empty array', () => {
      expect(() => validateWorkloadIds([])).toThrow('At least one workload ID is required');
    });

    it('should throw error for non-array', () => {
      expect(() => validateWorkloadIds('not-array')).toThrow('Workload IDs must be an array');
    });
  });

  describe('validateCloudProvider', () => {
    it('should accept valid providers', () => {
      expect(() => validateCloudProvider('aws')).not.toThrow();
      expect(() => validateCloudProvider('azure')).not.toThrow();
      expect(() => validateCloudProvider('gcp')).not.toThrow();
    });

    it('should throw error for invalid provider', () => {
      expect(() => validateCloudProvider('invalid')).toThrow('Invalid cloud provider');
    });
  });

  describe('validateTimeframe', () => {
    it('should accept valid timeframe', () => {
      expect(() => validateTimeframe(36)).not.toThrow();
    });

    it('should throw error for too short timeframe', () => {
      expect(() => validateTimeframe(6)).toThrow('Timeframe must be between 12 and 60 months');
    });

    it('should throw error for too long timeframe', () => {
      expect(() => validateTimeframe(72)).toThrow('Timeframe must be between 12 and 60 months');
    });
  });

  describe('validateCost', () => {
    it('should accept valid cost', () => {
      expect(() => validateCost(100)).not.toThrow();
      expect(() => validateCost(0)).not.toThrow();
    });

    it('should throw error for negative cost', () => {
      expect(() => validateCost(-10)).toThrow('must be a non-negative number');
    });

    it('should throw error for NaN', () => {
      expect(() => validateCost('invalid')).toThrow('must be a non-negative number');
    });
  });

  describe('validateAssessmentInput', () => {
    it('should accept valid input', () => {
      expect(() => validateAssessmentInput({
        workloadId: 'workload_123',
        includeCodeMod: true
      })).not.toThrow();
    });

    it('should throw error for missing workloadId', () => {
      expect(() => validateAssessmentInput({
        includeCodeMod: true
      })).toThrow('Workload ID is required');
    });
  });

  describe('validateMigrationPlanInput', () => {
    it('should accept valid input', () => {
      expect(() => validateMigrationPlanInput({
        workloadIds: ['id1', 'id2'],
        useCodeMod: true
      })).not.toThrow();
    });

    it('should throw error for empty workloadIds', () => {
      expect(() => validateMigrationPlanInput({
        workloadIds: []
      })).toThrow('At least one workload ID is required');
    });
  });

  describe('validateTCOInput', () => {
    it('should accept valid input', () => {
      expect(() => validateTCOInput({
        timeframe: 36,
        region: 'us-east-1',
        onPremise: { hardware: 1000 },
        gcp: { compute: 5 }
      })).not.toThrow();
    });

    it('should throw error for invalid timeframe', () => {
      expect(() => validateTCOInput({
        timeframe: 6
      })).toThrow('Timeframe must be between 12 and 60 months');
    });
  });
});
