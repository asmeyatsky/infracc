/**
 * Migration Effort Level Value Object
 * 
 * Architectural Intent:
 * - Encapsulates effort assessment for migration
 * - Immutable value object with business rules
 * - Used for risk assessment and planning
 */

/**
 * @readonly
 * @enum {string}
 */
export const EffortLevelType = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * Migration Effort Level Value Object
 */
export class EffortLevel {
  /**
   * @param {string} level - Effort level from EffortLevelType enum
   * @throws {Error} If level is invalid
   */
  constructor(level) {
    if (!Object.values(EffortLevelType).includes(level.toLowerCase())) {
      throw new Error(`Invalid effort level: ${level}`);
    }
    const normalizedLevel = level.toLowerCase();
    Object.defineProperty(this, '_level', {
      value: normalizedLevel,
      writable: false,
      enumerable: true
    });
    Object.freeze(this);
  }

  /**
   * @returns {string} Effort level
   */
  get level() {
    return this._level;
  }

  /**
   * @returns {string} Display name
   */
  get displayName() {
    const names = {
      [EffortLevelType.LOW]: 'Low Effort',
      [EffortLevelType.MEDIUM]: 'Medium Effort',
      [EffortLevelType.HIGH]: 'High Effort'
    };
    return names[this._level] || this._level;
  }

  /**
   * @returns {number} Numeric score (1-3)
   */
  get score() {
    const scores = {
      [EffortLevelType.LOW]: 1,
      [EffortLevelType.MEDIUM]: 2,
      [EffortLevelType.HIGH]: 3
    };
    return scores[this._level] || 2;
  }

  /**
   * @returns {string} Bootstrap color class
   */
  get colorClass() {
    const colors = {
      [EffortLevelType.LOW]: 'success',
      [EffortLevelType.MEDIUM]: 'warning',
      [EffortLevelType.HIGH]: 'danger'
    };
    return colors[this._level] || 'secondary';
  }

  /**
   * @returns {number} Estimated migration duration in weeks
   */
  get estimatedDuration() {
    const durations = {
      [EffortLevelType.LOW]: 2,
      [EffortLevelType.MEDIUM]: 8,
      [EffortLevelType.HIGH]: 16
    };
    return durations[this._level] || 8;
  }

  /**
   * Value equality check
   * @param {EffortLevel} other 
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof EffortLevel)) {
      return false;
    }
    return this._level === other._level;
  }

  /**
   * @returns {string} String representation
   */
  toString() {
    return this._level;
  }
}

export default EffortLevel;
