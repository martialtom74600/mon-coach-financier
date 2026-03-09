/**
 * definitions.test.ts — Tests d'invariants métier (Protocole Blind & Logic)
 *
 * Calcul théorique AVANT appel de fonction.
 */

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
// safeFloat — Invariant : valeurs invalides → 0
// ============================================================================

describe('safeFloat', () => {
  it('retourne number tel quel', () => {
    expect(safeFloat(42)).toBe(42);
    expect(safeFloat(0)).toBe(0);
    expect(safeFloat(-10.5)).toBe(-10.5);
  });

  it('convertit string numérique', () => {
    expect(safeFloat('100')).toBe(100);
    expect(safeFloat('42.5')).toBe(42.5);
  });

  it('gère format français (espaces, virgule)', () => {
    expect(safeFloat('1 500,50')).toBe(1500.5);
    expect(safeFloat('2\u00A0000')).toBe(2000);
  });

  it('INVARIANT : valeurs invalides → 0', () => {
    expect(safeFloat(null)).toBe(0);
    expect(safeFloat(undefined)).toBe(0);
    expect(safeFloat('')).toBe(0);
    expect(safeFloat('abc')).toBe(0);
    expect(safeFloat(NaN)).toBe(0);
  });
});

// ============================================================================
// calculateListTotal — Calcul théorique par fréquence
// ============================================================================

describe('calculateListTotal', () => {
  it('liste vide → 0', () => {
    const expected = 0;
    expect(calculateListTotal([])).toBe(expected);
  });

  it('MONTHLY : somme directe', () => {
    const items = [
      makeItem({ amount: 2000, frequency: Frequency.MONTHLY }),
      makeItem({ amount: 500, frequency: Frequency.MONTHLY }),
    ];
    const expected = 2000 + 500;
    expect(calculateListTotal(items)).toBe(expected);
  });

  it('YEARLY → mensuel = amount / 12', () => {
    const items = [makeItem({ amount: 1200, frequency: Frequency.YEARLY })];
    const expected = 1200 / 12;
    expect(calculateListTotal(items)).toBe(expected);
  });

  it('QUARTERLY → mensuel = amount / 3', () => {
    const items = [makeItem({ amount: 300, frequency: Frequency.QUARTERLY })];
    const expected = 300 / 3;
    expect(calculateListTotal(items)).toBe(expected);
  });

  it('WEEKLY → mensuel = amount * 4.33', () => {
    const items = [makeItem({ amount: 100, frequency: Frequency.WEEKLY })];
    const expected = 100 * 4.33;
    expect(calculateListTotal(items)).toBeCloseTo(expected, 0);
  });

  it('DAILY → mensuel = amount * 30', () => {
    const items = [makeItem({ amount: 10, frequency: Frequency.DAILY })];
    const expected = 10 * 30;
    expect(calculateListTotal(items)).toBe(expected);
  });

  it('ONCE → exclu du budget mensuel = 0', () => {
    const items = [makeItem({ amount: 5000, frequency: Frequency.ONCE })];
    const expected = 0;
    expect(calculateListTotal(items)).toBe(expected);
  });

  it('montants négatifs traités en valeur absolue', () => {
    const items = [makeItem({ amount: -1200, frequency: Frequency.MONTHLY })];
    const expected = 1200;
    expect(calculateListTotal(items)).toBe(expected);
  });
});

// ============================================================================
// calculateFutureValue — FV = PV × (1 + r)^n
// ============================================================================

describe('calculateFutureValue', () => {
  it('rate = 0 → FV = principal', () => {
    const principal = 10000;
    const expected = principal;
    expect(calculateFutureValue(principal, 0, 10)).toBe(expected);
  });

  it('years = 0 → FV = principal', () => {
    const principal = 10000;
    const expected = principal;
    expect(calculateFutureValue(principal, 0.07, 0)).toBe(expected);
  });

  it('FV = PV × (1+r)^n (Blind & Logic)', () => {
    const principal = 10000;
    const rate = 0.07;
    const years = 10;
    const expected = principal * Math.pow(1 + rate, years);

    expect(calculateFutureValue(principal, rate, years)).toBeCloseTo(expected, 0);
  });

  it('1 an à 5% : 1000 → 1050', () => {
    const principal = 1000;
    const rate = 0.05;
    const years = 1;
    const expected = 1050;

    expect(calculateFutureValue(principal, rate, years)).toBeCloseTo(expected, 2);
  });
});

// ============================================================================
// formatCurrency — Format EUR français
// ============================================================================

describe('formatCurrency', () => {
  it('format positif contient symbole €', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('€');
    expect(result).toMatch(/\d/);
  });

  it('0 → "0 €" ou équivalent', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
    expect(result).toContain('€');
  });

  it('string numérique converti via safeFloat', () => {
    const result = formatCurrency('2500');
    expect(result).toContain('2');
    expect(result).toContain('500');
  });

  it('entrée invalide → format 0', () => {
    const result = formatCurrency('abc' as any);
    expect(result).toContain('0');
  });
});
