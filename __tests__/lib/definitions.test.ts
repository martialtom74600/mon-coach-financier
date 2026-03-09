import { describe, it, expect } from 'vitest';
import {
  safeFloat,
  calculateListTotal,
  calculateFutureValue,
  formatCurrency,
  Frequency,
  ItemCategory,
} from '@/app/lib/definitions';
import type { FinancialItem } from '@/app/lib/definitions';

// ============================================================================
// FACTORY
// ============================================================================

const makeItem = (overrides: Partial<FinancialItem> = {}): FinancialItem =>
  ({
    id: 'item-1',
    profileId: 'p1',
    name: 'Test',
    amount: 0,
    category: ItemCategory.INCOME,
    frequency: Frequency.MONTHLY,
    dayOfMonth: 1,
    createdAt: new Date(),
    ...overrides,
  }) as FinancialItem;

// ============================================================================
// safeFloat
// ============================================================================

describe('safeFloat', () => {
  it('returns number as-is', () => {
    expect(safeFloat(42)).toBe(42);
    expect(safeFloat(0)).toBe(0);
    expect(safeFloat(-10.5)).toBe(-10.5);
  });

  it('converts string numbers', () => {
    expect(safeFloat('100')).toBe(100);
    expect(safeFloat('42.5')).toBe(42.5);
    expect(safeFloat('-7.3')).toBe(-7.3);
  });

  it('handles French formatting (spaces and commas)', () => {
    expect(safeFloat('1 500,50')).toBe(1500.50);
    expect(safeFloat('2\u00A0000')).toBe(2000);
    expect(safeFloat('  100  ')).toBe(100);
  });

  it('returns 0 for invalid or missing values', () => {
    expect(safeFloat(null)).toBe(0);
    expect(safeFloat(undefined)).toBe(0);
    expect(safeFloat('')).toBe(0);
    expect(safeFloat('abc')).toBe(0);
    expect(safeFloat(NaN)).toBe(0);
  });
});

// ============================================================================
// calculateListTotal
// ============================================================================

describe('calculateListTotal', () => {
  it('returns 0 for empty or invalid input', () => {
    expect(calculateListTotal([])).toBe(0);
    expect(calculateListTotal(null as any)).toBe(0);
    expect(calculateListTotal(undefined as any)).toBe(0);
  });

  it('sums monthly items directly', () => {
    const items = [
      makeItem({ amount: 2000, frequency: Frequency.MONTHLY }),
      makeItem({ amount: 500, frequency: Frequency.MONTHLY }),
    ];
    expect(calculateListTotal(items)).toBe(2500);
  });

  it('uses absolute values (negative amounts treated as positive)', () => {
    const items = [makeItem({ amount: -1200, frequency: Frequency.MONTHLY })];
    expect(calculateListTotal(items)).toBe(1200);
  });

  it('converts yearly amounts to monthly (/12)', () => {
    const items = [makeItem({ amount: 1200, frequency: Frequency.YEARLY })];
    expect(calculateListTotal(items)).toBe(100);
  });

  it('converts quarterly amounts to monthly (/3)', () => {
    const items = [makeItem({ amount: 300, frequency: Frequency.QUARTERLY })];
    expect(calculateListTotal(items)).toBe(100);
  });

  it('converts weekly amounts to monthly (*4.33)', () => {
    const items = [makeItem({ amount: 100, frequency: Frequency.WEEKLY })];
    expect(calculateListTotal(items)).toBeCloseTo(433, 0);
  });

  it('converts daily amounts to monthly (*30)', () => {
    const items = [makeItem({ amount: 10, frequency: Frequency.DAILY })];
    expect(calculateListTotal(items)).toBe(300);
  });

  it('excludes one-time (ONCE) items from monthly budget', () => {
    const items = [makeItem({ amount: 5000, frequency: Frequency.ONCE })];
    expect(calculateListTotal(items)).toBe(0);
  });

  it('handles mixed frequencies correctly', () => {
    const items = [
      makeItem({ amount: 2000, frequency: Frequency.MONTHLY }),
      makeItem({ amount: 1200, frequency: Frequency.YEARLY }),
      makeItem({ amount: 50, frequency: Frequency.WEEKLY }),
    ];
    // 2000 + 100 + 216.5
    const total = calculateListTotal(items);
    expect(total).toBeCloseTo(2316.5, 0);
  });
});

// ============================================================================
// calculateFutureValue
// ============================================================================

describe('calculateFutureValue', () => {
  it('returns principal when rate is 0', () => {
    expect(calculateFutureValue(10000, 0, 10)).toBe(10000);
  });

  it('returns principal when years is 0', () => {
    expect(calculateFutureValue(10000, 0.07, 0)).toBe(10000);
  });

  it('calculates compound interest correctly', () => {
    // 10000 * (1.07)^10 ≈ 19671.51
    const result = calculateFutureValue(10000, 0.07, 10);
    expect(result).toBeCloseTo(19671.51, 0);
  });

  it('handles 1 year at 5%', () => {
    expect(calculateFutureValue(1000, 0.05, 1)).toBeCloseTo(1050, 2);
  });
});

// ============================================================================
// formatCurrency
// ============================================================================

describe('formatCurrency', () => {
  it('formats positive numbers as EUR', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1');
    expect(result).toContain('500');
    expect(result).toContain('€');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
    expect(result).toContain('€');
  });

  it('handles string input via safeFloat', () => {
    const result = formatCurrency('2500');
    expect(result).toContain('2');
    expect(result).toContain('500');
    expect(result).toContain('€');
  });

  it('handles invalid input gracefully', () => {
    const result = formatCurrency('abc' as any);
    expect(result).toContain('0');
    expect(result).toContain('€');
  });
});
