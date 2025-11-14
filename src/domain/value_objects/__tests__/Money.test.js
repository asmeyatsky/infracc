/**
 * Money Value Object Tests
 * 
 * Tests immutable Money value object and arithmetic operations
 */

import { Money } from '../Money.js';

describe('Money Value Object', () => {
  describe('Construction', () => {
    it('should create money with valid amount', () => {
      const money = new Money(100);
      expect(money.amount).toBe(100);
      expect(money.currency).toBe('USD');
    });

    it('should create money with custom currency', () => {
      const money = new Money(100, 'EUR');
      expect(money.currency).toBe('EUR');
    });

    it('should parse string amounts', () => {
      const money = new Money('100.50');
      expect(money.amount).toBe(100.5);
    });

    it('should throw error for invalid amount', () => {
      expect(() => {
        new Money('invalid');
      }).toThrow('Invalid amount');
    });
  });

  describe('Immutability', () => {
    it('should be immutable', () => {
      const money = new Money(100);
      
      // Try to modify - in strict mode (Jest uses strict mode), this throws
      // The important thing is that the original value remains unchanged
      try {
        money._amount = 200;
      } catch (e) {
        // Expected in strict mode - property is read-only
      }
      
      // Original should be unchanged regardless
      expect(money.amount).toBe(100);
    });
  });

  describe('Arithmetic Operations', () => {
    it('should add two money values', () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      const result = money1.add(money2);

      expect(result.amount).toBe(150);
      expect(result).not.toBe(money1); // New instance
      expect(money1.amount).toBe(100); // Original unchanged
    });

    it('should subtract two money values', () => {
      const money1 = new Money(100);
      const money2 = new Money(30);
      const result = money1.subtract(money2);

      expect(result.amount).toBe(70);
    });

    it('should multiply by scalar', () => {
      const money = new Money(100);
      const result = money.multiply(1.5);

      expect(result.amount).toBe(150);
      expect(money.amount).toBe(100); // Original unchanged
    });

    it('should throw error when adding different currencies', () => {
      const usd = new Money(100, 'USD');
      const eur = new Money(50, 'EUR');

      expect(() => {
        usd.add(eur);
      }).toThrow('Cannot add USD to EUR');
    });

    it('should throw error when subtracting different currencies', () => {
      const usd = new Money(100, 'USD');
      const eur = new Money(50, 'EUR');

      expect(() => {
        usd.subtract(eur);
      }).toThrow('Cannot subtract EUR from USD');
    });
  });

  describe('Comparison Operations', () => {
    it('should check if positive', () => {
      expect(new Money(100).isPositive()).toBe(true);
      expect(new Money(0).isPositive()).toBe(false);
      expect(new Money(-10).isPositive()).toBe(false);
    });

    it('should check if negative', () => {
      expect(new Money(-10).isNegative()).toBe(true);
      expect(new Money(0).isNegative()).toBe(false);
      expect(new Money(10).isNegative()).toBe(false);
    });

    it('should check if zero', () => {
      expect(new Money(0).isZero()).toBe(true);
      expect(new Money(10).isZero()).toBe(false);
    });

    it('should compare two money values', () => {
      const money1 = new Money(100);
      const money2 = new Money(50);
      const money3 = new Money(100);

      expect(money1.compareTo(money2)).toBe(1);
      expect(money2.compareTo(money1)).toBe(-1);
      expect(money1.compareTo(money3)).toBe(0);
    });
  });

  describe('Formatting', () => {
    it('should format as currency string', () => {
      const money = new Money(1234.56);
      const formatted = money.format();

      expect(formatted).toContain('1,234.56');
      expect(formatted).toContain('$'); // USD symbol
    });

    it('should format with custom options', () => {
      const money = new Money(1234.56);
      const formatted = money.format({ minimumFractionDigits: 0 });

      expect(formatted).toBeDefined();
    });
  });

  describe('Value Equality', () => {
    it('should check equality correctly', () => {
      const money1 = new Money(100);
      const money2 = new Money(100);
      const money3 = new Money(100, 'EUR');

      expect(money1.equals(money2)).toBe(true);
      expect(money1.equals(money3)).toBe(false); // Different currency
    });
  });

  describe('Static Methods', () => {
    it('should create zero money', () => {
      const zero = Money.zero();
      expect(zero.amount).toBe(0);
      expect(zero.currency).toBe('USD');
    });

    it('should create zero money with custom currency', () => {
      const zero = Money.zero('EUR');
      expect(zero.amount).toBe(0);
      expect(zero.currency).toBe('EUR');
    });
  });
});
