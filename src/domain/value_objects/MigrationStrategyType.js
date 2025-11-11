/**
 * Migration Strategy Type Value Object
 * 
 * Architectural Intent:
 * - Encapsulates the 6 R's migration framework
 * - Immutable value object with validation
 * - Provides business logic for strategy selection
 */

/**
 * @readonly
 * @enum {string}
 */
export const MigrationStrategy = {
  REHOST: 'rehost',
  REPLATFORM: 'replatform',
  REFACTOR: 'refactor',
  REPURCHASE: 'repurchase',
  RETIRE: 'retire',
  RETAIN: 'retain'
};

/**
 * Migration Strategy Type Value Object
 */
export class MigrationStrategyType {
  /**
   * @param {string} strategy - Strategy from MigrationStrategy enum
   * @throws {Error} If strategy is invalid
   */
  constructor(strategy) {
    if (!Object.values(MigrationStrategy).includes(strategy)) {
      throw new Error(`Invalid migration strategy: ${strategy}`);
    }
    Object.defineProperty(this, '_strategy', {
      value: strategy,
      writable: false,
      enumerable: true
    });
    Object.freeze(this);
  }

  /**
   * @returns {string} Strategy value
   */
  get strategy() {
    return this._strategy;
  }

  /**
   * @returns {string} Display name
   */
  get displayName() {
    const names = {
      [MigrationStrategy.REHOST]: 'Rehost (Lift & Shift)',
      [MigrationStrategy.REPLATFORM]: 'Replatform (Lift, Tinker & Shift)',
      [MigrationStrategy.REFACTOR]: 'Refactor (Re-architect)',
      [MigrationStrategy.REPURCHASE]: 'Repurchase (Drop & Shop)',
      [MigrationStrategy.RETIRE]: 'Retire',
      [MigrationStrategy.RETAIN]: 'Retain'
    };
    return names[this._strategy] || this._strategy;
  }

  /**
   * @returns {string} Description
   */
  get description() {
    const descriptions = {
      [MigrationStrategy.REHOST]: 'Move applications to cloud with minimal changes',
      [MigrationStrategy.REPLATFORM]: 'Migrate to cloud with some optimizations',
      [MigrationStrategy.REFACTOR]: 'Restructure applications for cloud-native architecture',
      [MigrationStrategy.REPURCHASE]: 'Move to a different product or vendor',
      [MigrationStrategy.RETIRE]: 'Decommission the workload',
      [MigrationStrategy.RETAIN]: 'Keep workload in current location'
    };
    return descriptions[this._strategy] || '';
  }

  /**
   * @returns {boolean} True if this strategy requires significant changes
   */
  requiresSignificantChanges() {
    return this._strategy === MigrationStrategy.REFACTOR || 
           this._strategy === MigrationStrategy.REPURCHASE;
  }

  /**
   * @returns {boolean} True if this is a "do nothing" strategy
   */
  isNoOpStrategy() {
    return this._strategy === MigrationStrategy.RETIRE || 
           this._strategy === MigrationStrategy.RETAIN;
  }

  /**
   * Value equality check
   * @param {MigrationStrategyType} other 
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof MigrationStrategyType)) {
      return false;
    }
    return this._strategy === other._strategy;
  }

  /**
   * @returns {string} String representation
   */
  toString() {
    return this._strategy;
  }
}

export default MigrationStrategyType;
