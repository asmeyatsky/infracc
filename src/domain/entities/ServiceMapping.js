/**
 * Service Mapping Entity
 * 
 * Architectural Intent:
 * - Encapsulates mapping between source cloud services and GCP equivalents
 * - Contains migration strategy recommendations
 * - Provides business rules for service mapping decisions
 */

import { CloudProvider, CloudProviderType } from '../value_objects/CloudProvider.js';
import { MigrationStrategyType, MigrationStrategy } from '../value_objects/MigrationStrategyType.js';
import { EffortLevel, EffortLevelType } from '../value_objects/EffortLevel.js';

/**
 * Service Mapping Entity
 * Represents a mapping from source cloud service to GCP service
 */
export class ServiceMapping {
  /**
   * @param {Object} props - Mapping properties
   * @param {string} props.sourceService - Source cloud service name
   * @param {CloudProvider} props.sourceProvider - Source cloud provider
   * @param {string} props.gcpService - Target GCP service name
   * @param {string} props.gcpApi - GCP API identifier
   * @param {string} props.migrationStrategy - Migration strategy (6 R's)
   * @param {string} props.effort - Effort level (low, medium, high)
   * @param {string} props.notes - Additional notes
   * @param {string[]} props.considerations - Migration considerations
   */
  constructor(props) {
    this._validateProps(props);
    
    Object.defineProperty(this, '_sourceService', {
      value: props.sourceService,
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_sourceProvider', {
      value: props.sourceProvider instanceof CloudProvider 
        ? props.sourceProvider 
        : new CloudProvider(props.sourceProvider || CloudProviderType.AWS),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_gcpService', {
      value: props.gcpService || '',
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_gcpApi', {
      value: props.gcpApi || '',
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_migrationStrategy', {
      value: props.migrationStrategy instanceof MigrationStrategyType
        ? props.migrationStrategy
        : new MigrationStrategyType(props.migrationStrategy || MigrationStrategy.REHOST),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_effort', {
      value: props.effort instanceof EffortLevel
        ? props.effort
        : new EffortLevel(props.effort || EffortLevelType.MEDIUM),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_notes', {
      value: props.notes || '',
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_considerations', {
      value: Array.isArray(props.considerations) 
        ? Object.freeze([...props.considerations]) 
        : Object.freeze([]),
      writable: false,
      enumerable: true
    });
    
    Object.seal(this);
  }

  /**
   * Validate constructor properties
   * @private
   */
  _validateProps(props) {
    if (!props.sourceService || props.sourceService.trim() === '') {
      throw new Error('Source service name is required');
    }
    
    if (!props.gcpService || props.gcpService.trim() === '') {
      throw new Error('GCP service name is required');
    }
  }

  // Getters
  get sourceService() { return this._sourceService; }
  get sourceProvider() { return this._sourceProvider; }
  get gcpService() { return this._gcpService; }
  get gcpApi() { return this._gcpApi; }
  get migrationStrategy() { return this._migrationStrategy; }
  get effort() { return this._effort; }
  get notes() { return this._notes; }
  get considerations() { return [...this._considerations]; }

  /**
   * Check if mapping is a direct migration (low effort)
   * @returns {boolean}
   */
  isDirectMigration() {
    return this._effort.level === EffortLevelType.LOW && 
           this._migrationStrategy.strategy === MigrationStrategy.REHOST;
  }

  /**
   * Check if mapping requires significant changes
   * @returns {boolean}
   */
  requiresSignificantChanges() {
    return this._effort.level === EffortLevelType.HIGH || 
           this._migrationStrategy.requiresSignificantChanges();
  }

  /**
   * Get estimated migration complexity score (1-10)
   * @returns {number}
   */
  getComplexityScore() {
    const effortScore = this._effort.score * 2; // 2, 4, or 6
    const strategyScore = this._migrationStrategy.requiresSignificantChanges() ? 4 : 1;
    return effortScore + strategyScore;
  }

  /**
   * Convert to plain object (for serialization)
   * @returns {Object}
   */
  toJSON() {
    return {
      sourceService: this._sourceService,
      sourceProvider: this._sourceProvider.type,
      gcpService: this._gcpService,
      gcpApi: this._gcpApi,
      migrationStrategy: this._migrationStrategy.strategy,
      effort: this._effort.level,
      notes: this._notes,
      considerations: this._considerations
    };
  }

  /**
   * Create from plain object
   * @param {Object} data 
   * @returns {ServiceMapping}
   */
  static fromJSON(data) {
    return new ServiceMapping(data);
  }
}

export default ServiceMapping;
