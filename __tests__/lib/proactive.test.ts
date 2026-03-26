/**
 * proactive.test.ts — Tests du moteur proactif (Protocole Blind & Logic)
 *
 * RÈGLE : Calculer la valeur attendue MANUELLEMENT avant d'appeler la fonction.
 * Les tests sont des gardiens du résultat attendu, pas des miroirs du code.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectDanger,
  detectDrift,
  detectMilestones,
  detectCalendarAlerts,
  generateProactiveInsights,
} from '@/app/lib/proactive';
import type { Profile, BudgetResult } from '@/app/lib/definitions';
import { INITIAL_PROFILE, EMPTY_BUDGET_RESULT } from '@/app/lib/definitions';
import { UserPersona, ItemCategory } from '@prisma/client';

// ============================================================================
// FACTORIES
// ============================================================================

const NOW = new Date('2026-03-09T12:00:00Z');

const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  ...INITIAL_PROFILE,
  id: 'p1',
  userId: 'u1',
  persona: UserPersona.SALARIED,
  ...overrides,
});

const makeBudget = (overrides: Partial<BudgetResult> = {}): BudgetResult => ({
  ...EMPTY_BUDGET_RESULT,
  monthlyIncome: 3000,
  fixed: 1500,
  variableExpenses: 500,
  discretionaryExpenses: 300,
  matelas: 6000,
  currentBalance: 3000,
  endOfMonthBalance: 500,
  rawCapacity: 700,
  realCashflow: 700,
  profitableExpenses: 200,
  ...overrides,
});

// ============================================================================
// detectDanger — Invariants : Survie > Sécurité
// ============================================================================

describe('detectDanger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('déficit structurel (endOfMonthBalance < 0, rawCapacity < 0) → 1 insight critical', () => {
    // Calcul manuel : rawCapacity = -500 → déficit
    const budget = makeBudget({ endOfMonthBalance: -200, rawCapacity: -500 });
    const profile = makeProfile();
    const result = detectDanger(profile, budget);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('danger_deficit');
    expect(result[0].type).toBe('DANGER');
    expect(result[0].severity).toBe('critical');
    expect(result[0].message).toMatch(/charges dépassent.*revenus/i);
    expect(result[0].message).toContain('-500');
  });

  it('surchauffe (endOfMonthBalance < 0, rawCapacity >= 0) → 1 insight critical', () => {
    const budget = makeBudget({
      endOfMonthBalance: -100,
      rawCapacity: 200,
      profitableExpenses: 1500,
    });
    const profile = makeProfile();
    const result = detectDanger(profile, budget);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('danger_overheat');
    expect(result[0].severity).toBe('critical');
    expect(result[0].message).toContain('Fin de mois en rouge');
    expect(result[0].message).toContain('épargne');
  });

  it('sans matelas (matelas < 1000) → 1 insight critical', () => {
    // Calcul manuel : matelas = 500 < SURVIVAL_BUFFER 1000
    const budget = makeBudget({ matelas: 500, endOfMonthBalance: 100 });
    const profile = makeProfile();
    const result = detectDanger(profile, budget);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('danger_no_matelas');
    expect(result[0].message).toContain('500');
    expect(result[0].message).toMatch(/1[\s\u202F]*000/);
  });

  it('solde courant < 30% du matelas → 1 insight warning', () => {
    // Calcul manuel : matelas = 6000, minSafeBalance = 1800, currentBalance = 1000
    const budget = makeBudget({
      matelas: 6000,
      currentBalance: 1000,
      endOfMonthBalance: 500,
    });
    const profile = makeProfile();
    const result = detectDanger(profile, budget);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('danger_low_balance');
    expect(result[0].severity).toBe('warning');
  });

  it('profil sain (matelas OK, solde OK) → 0 insight', () => {
    const budget = makeBudget({
      matelas: 6000,
      currentBalance: 4000,
      endOfMonthBalance: 500,
    });
    const profile = makeProfile();
    const result = detectDanger(profile, budget);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// detectDrift — Dérive > 15%
// ============================================================================

describe('detectDrift', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('previousBudget null → 0 insight', () => {
    const budget = makeBudget();
    const profile = makeProfile();
    const result = detectDrift(profile, budget, null);
    expect(result).toHaveLength(0);
  });

  it('matelas baisse de 20% → 1 insight drift_matelas_down', () => {
    // Calcul manuel : prevMatelas = 5000, currMatelas = 4000, drift = 20%
    const prev = makeBudget({ matelas: 5000 });
    const curr = makeBudget({ matelas: 4000 });
    const profile = makeProfile();
    const result = detectDrift(profile, curr, prev);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('drift_matelas_down');
    expect(result[0].type).toBe('DRIFT');
    expect(result[0].message).toMatch(/1[\s\u202F]*000/);
  });

  it('solde baisse de 20% → 1 insight drift_balance_down', () => {
    const prev = makeBudget({ endOfMonthBalance: 1000, realCashflow: 500 });
    const curr = makeBudget({ endOfMonthBalance: 800, realCashflow: 500 });
    const profile = makeProfile();
    const result = detectDrift(profile, curr, prev);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('drift_balance_down');
  });

  it('pas de dérive significative (< 15%) → 0 insight', () => {
    const prev = makeBudget({ matelas: 5000 });
    const curr = makeBudget({ matelas: 4500 }); // 10% de baisse
    const profile = makeProfile();
    const result = detectDrift(profile, curr, prev);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// detectMilestones — Jalons atteints
// ============================================================================

describe('detectMilestones', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('matelas >= 3 mois de charges → milestone_matelas', () => {
    // Calcul manuel : needsTotal = 2000, discretionary = 300, idealSafety = 6900
    // matelas = 7000 >= 6900
    const budget = makeBudget({
      fixed: 1500,
      variableExpenses: 500,
      discretionaryExpenses: 300,
      matelas: 7000,
    });
    const profile = makeProfile({ persona: UserPersona.SALARIED });
    const result = detectMilestones(profile, budget);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('milestone_matelas');
    expect(result[0].message).toContain('3 mois');
  });

  it('matelas >= 1 mois mais < 3 mois → milestone_one_month', () => {
    // oneMonth = 2000, idealSafety = 6900, matelas = 2500
    const budget = makeBudget({
      fixed: 1500,
      variableExpenses: 500,
      discretionaryExpenses: 300,
      matelas: 2500,
    });
    const profile = makeProfile();
    const result = detectMilestones(profile, budget);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('milestone_one_month');
    expect(result[0].message).toContain('1 mois');
  });

  it('matelas >= 1000 mais < 1 mois → milestone_survival_buffer', () => {
    // oneMonth = 2000, matelas = 1500
    const budget = makeBudget({
      fixed: 1500,
      variableExpenses: 500,
      discretionaryExpenses: 0,
      matelas: 1500,
    });
    const profile = makeProfile();
    const result = detectMilestones(profile, budget);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('milestone_survival_buffer');
    expect(result[0].message).toMatch(/1[\s\u202F]*000/);
  });

  it('matelas < 1000 → 0 insight', () => {
    const budget = makeBudget({ matelas: 500 });
    const profile = makeProfile();
    const result = detectMilestones(profile, budget);
    expect(result).toHaveLength(0);
  });

  it('freelance : target 6 mois', () => {
    // idealSafety = (1500+500+300) * 6 = 13800, matelas >= 13800
    const budget = makeBudget({
      fixed: 1500,
      variableExpenses: 500,
      discretionaryExpenses: 300,
      matelas: 14000,
    });
    const profile = makeProfile({ persona: UserPersona.FREELANCE });
    const result = detectMilestones(profile, budget);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('milestone_matelas');
    expect(result[0].message).toContain('6 mois');
  });
});

// ============================================================================
// detectCalendarAlerts — I.2 Alertes calendaires (Blind & Logic)
// ============================================================================

describe('detectCalendarAlerts', () => {
  const MARCH_10 = new Date('2026-03-10T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(MARCH_10);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('jour J+2 avec prélèvement, solde < 30% matelas → 1 alerte', () => {
    // Calcul manuel : today = 10 mars. Matelas 6000, minSafeBalance = 1800.
    // Profil : currentBalance 2000, loyer 600€ le 12. Timeline : anchor 10 mars, balance 2000.
    // J+1 (11 mars) : pas d'événement, balance 2000. J+2 (12 mars) : -600, balance 1400 < 1800.
    const profile = makeProfile({
      updatedAt: MARCH_10.toISOString(),
      currentBalance: 2000,
      fixedCosts: [{ id: 'f1', name: 'Loyer', amount: 600, dayOfMonth: 12, category: ItemCategory.FIXED_COST }],
      variableCosts: [],
      decisions: [],
    });
    const budget = makeBudget({
      matelas: 6000,
      endOfMonthBalance: 500,
      rawCapacity: 700,
    });
    const result = detectCalendarAlerts(profile, budget);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('CALENDAR');
    expect(result[0].severity).toBe('warning');
    expect(result[0].id).toContain('calendar_alert_');
    expect(result[0].message).toMatch(/Dans 2 jours/);
    expect(result[0].message).toMatch(/1 prélèvement/);
    expect(result[0].message).toMatch(/600/);
    expect(result[0].message).toMatch(/1[\s\u202F]*400/);
  });

  it('danger critique (déficit) → 0 alerte calendaire (invariant Survie)', () => {
    const profile = makeProfile({
      updatedAt: MARCH_10.toISOString(),
      currentBalance: 2000,
      fixedCosts: [{ id: 'f1', name: 'Loyer', amount: 600, dayOfMonth: 12, category: ItemCategory.FIXED_COST }],
      variableCosts: [],
    });
    const budget = makeBudget({
      matelas: 6000,
      endOfMonthBalance: -100,
      rawCapacity: -500,
    });
    const result = detectCalendarAlerts(profile, budget);
    expect(result).toHaveLength(0);
  });

  it('matelas < 1000 → 0 alerte calendaire', () => {
    const profile = makeProfile({
      updatedAt: MARCH_10.toISOString(),
      currentBalance: 500,
      fixedCosts: [{ id: 'f1', name: 'Loyer', amount: 600, dayOfMonth: 12, category: ItemCategory.FIXED_COST }],
      variableCosts: [],
    });
    const budget = makeBudget({
      matelas: 500,
      endOfMonthBalance: 100,
      rawCapacity: 200,
    });
    const result = detectCalendarAlerts(profile, budget);
    expect(result).toHaveLength(0);
  });

  it('solde projeté >= 30% matelas → 0 alerte', () => {
    // currentBalance 5000, loyer 600 le 12 → balance 4400 > 1800
    const profile = makeProfile({
      updatedAt: MARCH_10.toISOString(),
      currentBalance: 5000,
      fixedCosts: [{ id: 'f1', name: 'Loyer', amount: 600, dayOfMonth: 12, category: ItemCategory.FIXED_COST }],
      variableCosts: [],
    });
    const budget = makeBudget({
      matelas: 6000,
      endOfMonthBalance: 500,
      rawCapacity: 700,
    });
    const result = detectCalendarAlerts(profile, budget);
    expect(result).toHaveLength(0);
  });

  it('jour sans prélèvement (balance basse mais pas d\'events) → 0 alerte', () => {
    // Balance basse mais pas d'événements ce jour-là : on n'alerte pas (pas de prélèvement prévu)
    const profile = makeProfile({
      updatedAt: MARCH_10.toISOString(),
      currentBalance: 1000,
      fixedCosts: [], // pas de prélèvement
      variableCosts: [],
    });
    const budget = makeBudget({
      matelas: 6000,
      endOfMonthBalance: 500,
      rawCapacity: 700,
    });
    const result = detectCalendarAlerts(profile, budget);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// generateProactiveInsights — Agrégation
// ============================================================================

describe('generateProactiveInsights', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('priorité DANGER : si danger, pas de milestones', () => {
    const budget = makeBudget({
      endOfMonthBalance: -100,
      rawCapacity: -50,
    });
    const profile = makeProfile();
    const result = generateProactiveInsights(profile, budget, null);
    expect(result.every((r) => r.type === 'DANGER')).toBe(true);
    expect(result.some((r) => r.type === 'MILESTONE')).toBe(false);
  });

  it('sans danger : drift + milestones agrégés', () => {
    const prev = makeBudget({ matelas: 5000 });
    const curr = makeBudget({ matelas: 4000 }); // drift
    const profile = makeProfile();
    const result = generateProactiveInsights(profile, curr, prev);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((r) => r.type === 'DRIFT')).toBe(true);
  });
});
