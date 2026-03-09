/**
 * validations.test.ts — Tests adverses Zod (Protocole Blind & Logic)
 *
 * Envoyer des objets corrompus pour forcer l'échec de validation.
 * Tests du Bouclier Zod : Response schemas interceptent les données corrompues.
 */

import { describe, it, expect } from 'vitest';
import {
  createItemSchema,
  createAssetSchema,
  createGoalSchema,
  createDecisionSchema,
  updateProfileSchema,
  validateId,
  financialItemResponseSchema,
  assetResponseSchema,
  financialGoalResponseSchema,
  purchaseDecisionResponseSchema,
  profilePatchResponseSchema,
  successResponseSchema,
  profileAPIResponseSchema,
  parseAPIResponse,
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

// ============================================================================
// validateId — Paramètres d'URL [id] (format CUID)
// ============================================================================

describe('validateId — Tests adverses (E.3)', () => {
  it('retourne null pour un CUID valide', () => {
    // CUID Prisma typique : 25 caractères, commence par 'c'
    const validCuid = 'clh2abc123def456ghi789jkl';
    expect(validateId(validCuid)).toBeNull();
  });

  it('retourne 400 pour path traversal', () => {
    const response = validateId('../../../etc/passwd');
    expect(response).not.toBeNull();
    expect(response!.status).toBe(400);
  });

  it('retourne 400 pour chaîne vide', () => {
    const response = validateId('');
    expect(response).not.toBeNull();
    expect(response!.status).toBe(400);
  });

  it('retourne 400 pour ID trop court', () => {
    const response = validateId('c123');
    expect(response).not.toBeNull();
    expect(response!.status).toBe(400);
  });

  it('retourne 400 pour caractères invalides (SQL-like)', () => {
    const response = validateId("c'; DROP TABLE users;--");
    expect(response).not.toBeNull();
    expect(response!.status).toBe(400);
  });

  it('retourne 400 pour UUID au lieu de CUID', () => {
    const response = validateId('550e8400-e29b-41d4-a716-446655440000');
    expect(response).not.toBeNull();
    expect(response!.status).toBe(400);
  });
});

// ============================================================================
// BOUCLIER ZOD — Response Schemas : données corrompues interceptées
// ============================================================================

describe('financialItemResponseSchema — Bouclier (amount string au lieu de number)', () => {
  it('rejette amount sous forme de string', () => {
    const corrupted = {
      id: 'item_1',
      profileId: 'prof_1',
      name: 'Salaire',
      amount: '2500',
      category: 'INCOME',
      frequency: 'MONTHLY',
      dayOfMonth: 1,
      createdAt: '2026-03-09T12:00:00.000Z',
    };
    const result = financialItemResponseSchema.safeParse(corrupted);
    expect(result.success).toBe(false);
  });

  it('parseAPIResponse retourne null pour amount string', () => {
    const corrupted = { id: 'x', profileId: 'p', name: 'X', amount: '100', category: 'INCOME', frequency: 'MONTHLY', dayOfMonth: 1, createdAt: '2026-01-01' };
    const validated = parseAPIResponse(financialItemResponseSchema, corrupted, 'TEST');
    expect(validated).toBeNull();
  });

  it('accepte objet valide (amount number)', () => {
    const valid = { id: 'x', profileId: 'p', name: 'X', amount: 100, category: 'INCOME', frequency: 'MONTHLY', dayOfMonth: 1, createdAt: '2026-01-01' };
    const validated = parseAPIResponse(financialItemResponseSchema, valid, 'TEST');
    expect(validated).not.toBeNull();
    expect(validated!.amount).toBe(100);
  });
});

describe('assetResponseSchema — Bouclier (currentValue string)', () => {
  it('rejette currentValue string', () => {
    const corrupted = {
      id: 'a1',
      profileId: 'p1',
      name: 'Livret',
      type: 'LIVRET',
      currentValue: '5000',
      monthlyFlow: 0,
      transferDay: 1,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    const result = assetResponseSchema.safeParse(corrupted);
    expect(result.success).toBe(false);
  });

  it('parseAPIResponse retourne null pour type invalide', () => {
    const corrupted = { id: 'a1', profileId: 'p1', name: 'X', type: 'INVENTE', currentValue: 1000, monthlyFlow: 0, transferDay: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    expect(parseAPIResponse(assetResponseSchema, corrupted, 'TEST')).toBeNull();
  });
});

describe('financialGoalResponseSchema — Bouclier (targetAmount string)', () => {
  it('rejette targetAmount string', () => {
    const corrupted = {
      id: 'g1',
      profileId: 'p1',
      name: 'Voyage',
      category: 'TRAVEL',
      targetAmount: '3000',
      currentSaved: 0,
      monthlyContribution: 0,
      deadline: '2028-01-01',
      projectedYield: 0,
      transferDay: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    const result = financialGoalResponseSchema.safeParse(corrupted);
    expect(result.success).toBe(false);
  });
});

describe('purchaseDecisionResponseSchema — Bouclier (amount string)', () => {
  it('rejette amount string', () => {
    const corrupted = {
      id: 'd1',
      profileId: 'p1',
      name: 'Achat',
      amount: '500',
      date: '2026-04-01',
      type: 'NEED',
      paymentMode: 'CASH_CURRENT',
      isPro: false,
      isReimbursable: false,
      reimbursedAt: null,
      duration: null,
      rate: null,
      createdAt: '2026-01-01',
    };
    const result = purchaseDecisionResponseSchema.safeParse(corrupted);
    expect(result.success).toBe(false);
  });
});

describe('profilePatchResponseSchema — Bouclier', () => {
  it('rejette housingCost string', () => {
    const corrupted = {
      id: 'prof1',
      userId: 'u1',
      age: 30,
      persona: 'SALARIED',
      housingStatus: 'TENANT',
      housingCost: '800',
      housingPaymentDay: 5,
      adults: 1,
      children: 0,
      funBudget: 200,
      updatedAt: '2026-03-09T12:00:00.000Z',
    };
    const result = profilePatchResponseSchema.safeParse(corrupted);
    expect(result.success).toBe(false);
  });
});

describe('successResponseSchema — Bouclier (DELETE)', () => {
  it('rejette success: false', () => {
    const result = successResponseSchema.safeParse({ success: false });
    expect(result.success).toBe(false);
  });

  it('rejette objet vide', () => {
    const result = successResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepte success: true', () => {
    const validated = parseAPIResponse(successResponseSchema, { success: true }, 'DELETE');
    expect(validated).toBeTruthy();
    expect(validated!.success).toBe(true);
  });
});

describe('profileAPIResponseSchema — Bouclier (assets array corrompue)', () => {
  it('rejette assets avec amount string', () => {
    const corrupted = {
      id: 'u1',
      firstName: 'Test',
      assets: [{ id: 'a1', profileId: 'p1', name: 'X', type: 'LIVRET', currentValue: '5000', monthlyFlow: 0, transferDay: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' }],
      goals: [],
      decisions: [],
      incomes: [],
      fixedCosts: [],
      variableCosts: [],
      credits: [],
      subscriptions: [],
      annualExpenses: [],
    };
    const result = profileAPIResponseSchema.safeParse(corrupted);
    expect(result.success).toBe(false);
  });
});
