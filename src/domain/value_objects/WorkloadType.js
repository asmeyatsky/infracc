/**
 * Workload Type Value Object
 * 
 * Architectural Intent:
 * - Encapsulates workload classification
 * - Immutable value object for type safety
 * - Provides business rules for workload categorization
 */

/**
 * @readonly
 * @enum {string}
 */
export const WorkloadTypeEnum = {
  VM: 'vm',
  DATABASE: 'database',
  STORAGE: 'storage',
  APPLICATION: 'application',
  CONTAINER: 'container',
  FUNCTION: 'function',
  NETWORK: 'network',
  MONITORING: 'monitoring'
};

/**
 * Workload Type Value Object
 */
export class WorkloadType {
  /**
   * @param {string} type - Workload type from WorkloadTypeEnum
   * @throws {Error} If type is invalid
   */
  constructor(type) {
    if (!Object.values(WorkloadTypeEnum).includes(type.toLowerCase())) {
      throw new Error(`Invalid workload type: ${type}`);
    }
    const normalizedType = type.toLowerCase();
    Object.defineProperty(this, '_type', {
      value: normalizedType,
      writable: false,
      enumerable: true
    });
    Object.freeze(this);
  }

  /**
   * @returns {string} Workload type
   */
  get type() {
    return this._type;
  }

  /**
   * @returns {string} Display name
   */
  get displayName() {
    const names = {
      [WorkloadTypeEnum.VM]: 'Virtual Machine',
      [WorkloadTypeEnum.DATABASE]: 'Database',
      [WorkloadTypeEnum.STORAGE]: 'Storage',
      [WorkloadTypeEnum.APPLICATION]: 'Application',
      [WorkloadTypeEnum.CONTAINER]: 'Container',
      [WorkloadTypeEnum.FUNCTION]: 'Serverless Function',
      [WorkloadTypeEnum.NETWORK]: 'Networking',
      [WorkloadTypeEnum.MONITORING]: 'Monitoring'
    };
    return names[this._type] || this._type;
  }

  /**
   * @returns {boolean} True if this workload type requires state management
   */
  requiresStateManagement() {
    return this._type === WorkloadTypeEnum.DATABASE || 
           this._type === WorkloadTypeEnum.STORAGE;
  }

  /**
   * @returns {boolean} True if this workload is typically stateless
   */
  isStateless() {
    return this._type === WorkloadTypeEnum.FUNCTION || 
           this._type === WorkloadTypeEnum.APPLICATION;
  }

  /**
   * @returns {boolean} True if this workload can be containerized
   */
  canBeContainerized() {
    return this._type === WorkloadTypeEnum.APPLICATION || 
           this._type === WorkloadTypeEnum.VM;
  }

  /**
   * Value equality check
   * @param {WorkloadType} other 
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof WorkloadType)) {
      return false;
    }
    return this._type === other._type;
  }

  /**
   * @returns {string} String representation
   */
  toString() {
    return this._type;
  }
}

export default WorkloadType;
