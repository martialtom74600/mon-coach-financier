/**
 * validations.test.ts — Tests adverses Zod (Protocole Blind & Logic)
 *
 * Envoyer des objets corrompus pour forcer l'échec de validation.
 */

import { describe, it, expect } from 'vitest';
import {
  createItemSchema,
  createAssetSchema,
  createGoalSchema,
  createDecisionSchema,
  updateProfileSchema,
} from '@/app/lib/validations';

// ============================================================================
// createItemSchema — Objets corrompus
// ============================================================================

describe('createItemSchema — Tests adverses', () => {
  it('rejette amount non numérique', () => {
    const result = createItemSchema.safeParse({
      name: 'Salaire',
      amount: 'pas-un-nombre',
      category: 'INCOME',
    });
    expect(result.success).toBe(false);
  });

  it('rejette category invalide', () => {
    const result = createItemSchema.safeParse({
      name: 'Test',
      amount: 100,
      category: 'CATEGORIE_INVENTEE',
    });
    expect(result.success).toBe(false);
  });

  it('rejette name vide', () => {
    const result = createItemSchema.safeParse({
      name: '',
      amount: 100,
      category: 'INCOME',
    });
    expect(result.success).toBe(false);
  });

  it('accepte objet valide', () => {
    const result = createItemSchema.safeParse({
      name: 'Salaire',
      amount: 2500,
      category: 'INCOME',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// createAssetSchema
// ============================================================================

describe('createAssetSchema — Tests adverses', () => {
  it('rejette type invalide', () => {
    const result = createAssetSchema.safeParse({
      name: 'Livret',
      type: 'ACTIF_INVENTE',
      currentValue: 5000,
    });
    expect(result.success).toBe(false);
  });

  it('rejette currentValue négatif infini', () => {
    const result = createAssetSchema.safeParse({
      name: 'Test',
      type: 'LIVRET',
      currentValue: -Infinity,
    });
    expect(result.success).toBe(false);
  });

  it('accepte objet valide', () => {
    const result = createAssetSchema.safeParse({
      name: 'Livret A',
      type: 'LIVRET',
      currentValue: 5000,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// createGoalSchema
// ============================================================================

describe('createGoalSchema — Tests adverses', () => {
  it('rejette deadline invalide', () => {
    const result = createGoalSchema.safeParse({
      name: 'Voyage',
      targetAmount: 3000,
      deadline: '2028-13-45',
    });
    expect(result.success).toBe(false);
  });

  it('rejette targetAmount négatif', () => {
    const result = createGoalSchema.safeParse({
      name: 'Objectif',
      targetAmount: -1000,
      deadline: new Date('2028-01-01'),
    });
    expect(result.success).toBe(false);
  });

  it('accepte objet valide', () => {
    const result = createGoalSchema.safeParse({
      name: 'Matelas',
      category: 'EMERGENCY',
      targetAmount: 6000,
      deadline: new Date('2028-01-01'),
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// createDecisionSchema
// ============================================================================

describe('createDecisionSchema — Tests adverses', () => {
  it('rejette paymentMode invalide', () => {
    const result = createDecisionSchema.safeParse({
      name: 'Achat',
      amount: 500,
      date: new Date(),
      type: 'NEED',
      paymentMode: 'MODE_INVENTE',
    });
    expect(result.success).toBe(false);
  });

  it('rejette type invalide', () => {
    const result = createDecisionSchema.safeParse({
      name: 'Achat',
      amount: 500,
      date: new Date(),
      type: 'TYPE_INVENTE',
      paymentMode: 'CASH_CURRENT',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateProfileSchema
// ============================================================================

describe('updateProfileSchema — Tests adverses', () => {
  it('rejette age hors bornes', () => {
    const result = updateProfileSchema.safeParse({
      age: 150,
    });
    expect(result.success).toBe(false);
  });

  it('rejette persona invalide', () => {
    const result = updateProfileSchema.safeParse({
      persona: 'PERSONA_INVENTE',
    });
    expect(result.success).toBe(false);
  });
});
