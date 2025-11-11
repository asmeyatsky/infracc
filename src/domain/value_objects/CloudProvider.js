/**
 * Cloud Provider Value Object
 * 
 * Architectural Intent:
 * - Immutable value object representing cloud provider identity
 * - Encapsulates provider-specific constants and validations
 * - No identity, only equality by value
 */

/**
 * @readonly
 * @enum {string}
 */
export const CloudProviderType = {
  AWS: 'aws',
  AZURE: 'azure',
  GCP: 'gcp',
  ON_PREMISE: 'on_premise'
};

/**
 * Cloud Provider Value Object
 * Immutable representation of a cloud provider
 */
export class CloudProvider {
  /**
   * @param {string} type - Provider type from CloudProviderType enum
   * @throws {Error} If provider type is invalid
   */
  constructor(type) {
    if (!Object.values(CloudProviderType).includes(type)) {
      throw new Error(`Invalid cloud provider type: ${type}`);
    }
    Object.defineProperty(this, '_type', {
      value: type,
      writable: false,
      enumerable: true
    });
    Object.freeze(this);
  }

  /**
   * @returns {string} Provider type
   */
  get type() {
    return this._type;
  }

  /**
   * @returns {string} Display name
   */
  get displayName() {
    const names = {
      [CloudProviderType.AWS]: 'Amazon Web Services',
      [CloudProviderType.AZURE]: 'Microsoft Azure',
      [CloudProviderType.GCP]: 'Google Cloud Platform',
      [CloudProviderType.ON_PREMISE]: 'On-Premise'
    };
    return names[this._type] || this._type;
  }

  /**
   * @returns {boolean} True if this is a source provider (AWS/Azure)
   */
  isSourceProvider() {
    return this._type === CloudProviderType.AWS || 
           this._type === CloudProviderType.AZURE;
  }

  /**
   * @returns {boolean} True if this is GCP
   */
  isGCP() {
    return this._type === CloudProviderType.GCP;
  }

  /**
   * Value equality check
   * @param {CloudProvider} other 
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof CloudProvider)) {
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

export default CloudProvider;
