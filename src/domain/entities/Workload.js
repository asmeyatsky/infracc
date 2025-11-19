/**
 * Workload Entity
 * 
 * Architectural Intent:
 * - Aggregate root for discovered cloud workloads
 * - Encapsulates workload specifications and metadata
 * - Maintains invariants for workload data
 * - All modifications go through domain methods
 */

import { CloudProvider, CloudProviderType } from '../value_objects/CloudProvider.js';
import { WorkloadType, WorkloadTypeEnum } from '../value_objects/WorkloadType.js';
import { Money } from '../value_objects/Money.js';

/**
 * Workload Entity
 * Represents a discovered cloud workload ready for migration assessment
 */
export class Workload {
  /**
   * @param {Object} props - Workload properties
   * @param {string} props.id - Unique identifier
   * @param {string} props.name - Workload name
   * @param {string} props.service - Source cloud service name
   * @param {string} props.type - Workload type
   * @param {string} props.sourceProvider - Source cloud provider ('aws' or 'azure')
   * @param {number} props.cpu - CPU cores
   * @param {number} props.memory - Memory in GB
   * @param {number} props.storage - Storage in GB
   * @param {number} props.monthlyCost - Monthly cost
   * @param {string} props.region - Region
   * @param {string} props.os - Operating system
   * @param {number} props.monthlyTraffic - Monthly traffic in GB
   * @param {string[]} props.dependencies - Dependent workload IDs
   */
  constructor(props) {
    this._validateProps(props);
    
    Object.defineProperty(this, '_id', {
      value: props.id || this._generateId(),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_name', {
      value: props.name || '',
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_service', {
      value: props.service || '',
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_type', {
      value: new WorkloadType(props.type || WorkloadTypeEnum.VM),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_sourceProvider', {
      value: new CloudProvider(props.sourceProvider || CloudProviderType.AWS),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_cpu', {
      value: Math.max(0, parseFloat(props.cpu) || 0),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_memory', {
      value: Math.max(0, parseFloat(props.memory) || 0),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_storage', {
      value: Math.max(0, parseFloat(props.storage) || 0),
      writable: true,
      enumerable: true
    });
    
    // CRITICAL FIX: Handle both numbers and Money objects for monthlyCost
    // If it's already a Money object, use it directly; otherwise create new Money from number
    const monthlyCostValue = props.monthlyCost instanceof Money 
      ? props.monthlyCost.amount 
      : (props.monthlyCost || 0);
    Object.defineProperty(this, '_monthlyCost', {
      value: new Money(monthlyCostValue),
      writable: true,
      enumerable: true
    });
    
    Object.defineProperty(this, '_region', {
      value: props.region || 'us-east-1',
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_os', {
      value: props.os || 'linux',
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_monthlyTraffic', {
      value: Math.max(0, parseFloat(props.monthlyTraffic) || 0),
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_dependencies', {
      value: Array.isArray(props.dependencies) ? [...props.dependencies] : [],
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_assessment', {
      value: null,
      writable: true,
      enumerable: true
    });
    
    Object.defineProperty(this, '_migrationStrategy', {
      value: null,
      writable: true,
      enumerable: true
    });
    
  }

  /**
   * Validate constructor properties
   * @private
   */
  _validateProps(props) {
    if (!props.name || props.name.trim() === '') {
      throw new Error('Workload name is required');
    }
    
    if (props.sourceProvider) {
      const provider = new CloudProvider(props.sourceProvider);
      if (!provider.isSourceProvider()) {
        throw new Error('Source provider must be AWS or Azure');
      }
    }
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    return `workload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get id() { return this._id; }
  get name() { return this._name; }
  get service() { return this._service; }
  get type() { return this._type; }
  get sourceProvider() { return this._sourceProvider; }
  get cpu() { return this._cpu; }
  get memory() { return this._memory; }
  get storage() { return this._storage; }
  get monthlyCost() { return this._monthlyCost; }
  get region() { return this._region; }
  get os() { return this._os; }
  get monthlyTraffic() { return this._monthlyTraffic; }
  get dependencies() { return [...this._dependencies]; }
  get assessment() { return this._assessment; }
  get migrationStrategy() { return this._migrationStrategy; }

  /**
   * Check if workload is large (requires special handling)
   * @returns {boolean}
   */
  isLargeWorkload() {
    return this._cpu >= 16 || this._memory >= 64;
  }

  /**
   * Check if workload has dependencies
   * @returns {boolean}
   */
  hasDependencies() {
    return this._dependencies.length > 0;
  }

  /**
   * Check if workload is Windows-based
   * @returns {boolean}
   */
  isWindowsWorkload() {
    return this._os.toLowerCase().includes('windows');
  }

  /**
   * Check if workload is containerized
   * @returns {boolean}
   */
  isContainerized() {
    return this._type.type === WorkloadTypeEnum.CONTAINER;
  }

  /**
   * Assign assessment to workload
   * @param {Object} assessment - Assessment result
   */
  assignAssessment(assessment) {
    if (!assessment || typeof assessment !== 'object') {
      throw new Error('Assessment must be a valid object');
    }
    this._assessment = Object.freeze({ ...assessment });
  }

  /**
   * Assign migration strategy to workload
   * @param {Object} strategy - Migration strategy
   */
  assignMigrationStrategy(strategy) {
    if (!strategy || typeof strategy !== 'object') {
      throw new Error('Migration strategy must be a valid object');
    }
    this._migrationStrategy = Object.freeze({ ...strategy });
  }

  /**
   * Calculate total resource score (for prioritization)
   * @returns {number}
   */
  calculateResourceScore() {
    const cpuWeight = 0.3;
    const memoryWeight = 0.3;
    const storageWeight = 0.2;
    const costWeight = 0.2;
    
    const normalizedCpu = Math.min(this._cpu / 32, 1); // Max 32 cores
    const normalizedMemory = Math.min(this._memory / 128, 1); // Max 128 GB
    const normalizedStorage = Math.min(this._storage / 1000, 1); // Max 1 TB
    const normalizedCost = Math.min(this._monthlyCost.amount / 10000, 1); // Max $10k/month
    
    return (normalizedCpu * cpuWeight + 
            normalizedMemory * memoryWeight + 
            normalizedStorage * storageWeight + 
            normalizedCost * costWeight) * 100;
  }

  /**
   * Convert to plain object (for serialization)
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      service: this._service,
      type: this._type.type,
      sourceProvider: this._sourceProvider.type,
      cpu: this._cpu,
      memory: this._memory,
      storage: this._storage,
      monthlyCost: this._monthlyCost.amount,
      region: this._region,
      os: this._os,
      monthlyTraffic: this._monthlyTraffic,
      dependencies: this._dependencies,
      assessment: this._assessment,
      migrationStrategy: this._migrationStrategy
    };
  }

  /**
   * Create from plain object
   * @param {Object} data 
   * @returns {Workload}
   */
  static fromJSON(data) {
    return new Workload(data);
  }
}

export default Workload;
