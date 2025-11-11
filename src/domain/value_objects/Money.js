/**
 * Money Value Object
 * 
 * Architectural Intent:
 * - Immutable value object for monetary calculations
 * - Encapsulates currency and amount
 * - Provides safe arithmetic operations
 */

/**
 * Money Value Object
 * Immutable representation of monetary value
 */
export class Money {
  /**
   * @param {number} amount - Monetary amount
   * @param {string} currency - Currency code (default: 'USD')
   * @throws {Error} If amount is not a valid number
   */
  constructor(amount, currency = 'USD') {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }
    
    Object.defineProperty(this, '_amount', {
      value: parsedAmount,
      writable: false,
      enumerable: true
    });
    
    Object.defineProperty(this, '_currency', {
      value: currency.toUpperCase(),
      writable: false,
      enumerable: true
    });
    
    Object.freeze(this);
  }

  /**
   * @returns {number} Amount
   */
  get amount() {
    return this._amount;
  }

  /**
   * @returns {string} Currency code
   */
  get currency() {
    return this._currency;
  }

  /**
   * Add two money values (must be same currency)
   * @param {Money} other 
   * @returns {Money} New Money instance
   * @throws {Error} If currencies don't match
   */
  add(other) {
    if (!(other instanceof Money)) {
      throw new Error('Can only add Money to Money');
    }
    if (this._currency !== other._currency) {
      throw new Error(`Cannot add ${this._currency} to ${other._currency}`);
    }
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * Subtract two money values (must be same currency)
   * @param {Money} other 
   * @returns {Money} New Money instance
   * @throws {Error} If currencies don't match
   */
  subtract(other) {
    if (!(other instanceof Money)) {
      throw new Error('Can only subtract Money from Money');
    }
    if (this._currency !== other._currency) {
      throw new Error(`Cannot subtract ${other._currency} from ${this._currency}`);
    }
    return new Money(this._amount - other._amount, this._currency);
  }

  /**
   * Multiply by a scalar
   * @param {number} multiplier 
   * @returns {Money} New Money instance
   */
  multiply(multiplier) {
    const multiplierValue = parseFloat(multiplier);
    if (isNaN(multiplierValue)) {
      throw new Error(`Invalid multiplier: ${multiplier}`);
    }
    return new Money(this._amount * multiplierValue, this._currency);
  }

  /**
   * Check if amount is positive
   * @returns {boolean}
   */
  isPositive() {
    return this._amount > 0;
  }

  /**
   * Check if amount is negative
   * @returns {boolean}
   */
  isNegative() {
    return this._amount < 0;
  }

  /**
   * Check if amount is zero
   * @returns {boolean}
   */
  isZero() {
    return this._amount === 0;
  }

  /**
   * Compare with another Money value
   * @param {Money} other 
   * @returns {number} -1 if less, 0 if equal, 1 if greater
   * @throws {Error} If currencies don't match
   */
  compareTo(other) {
    if (!(other instanceof Money)) {
      throw new Error('Can only compare Money to Money');
    }
    if (this._currency !== other._currency) {
      throw new Error(`Cannot compare ${this._currency} to ${other._currency}`);
    }
    if (this._amount < other._amount) return -1;
    if (this._amount > other._amount) return 1;
    return 0;
  }

  /**
   * Format as currency string
   * @param {Object} options - Intl.NumberFormat options
   * @returns {string} Formatted currency string
   */
  format(options = {}) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this._currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    }).format(this._amount);
  }

  /**
   * Value equality check
   * @param {Money} other 
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof Money)) {
      return false;
    }
    return this._amount === other._amount && this._currency === other._currency;
  }

  /**
   * @returns {string} String representation
   */
  toString() {
    return this.format();
  }

  /**
   * Create zero money
   * @param {string} currency 
   * @returns {Money}
   */
  static zero(currency = 'USD') {
    return new Money(0, currency);
  }
}

export default Money;
