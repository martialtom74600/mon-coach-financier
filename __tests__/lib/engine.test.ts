/**
 * engine.test.ts — Tests d'invariants métier (Protocole Blind & Logic)
 *
 * RÈGLE : Calculer la valeur attendue MANUELLEMENT avant d'appeler la fonction.
 * Ne jamais ajuster expect() en fonction du retour du code.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateMonthlyEffort,
  analyzeGoalStrategies,
  distributeGoals,
  computeFinancialPlan,
  simulateGoalScenario,
  analyzeProfileHealth,
  estimateTaxSavings,
} from '@/app/lib/engine';
import type { SimulationRates } from '@/app/lib/engine';
import {
  UserPersona,
  HousingStatus,
  ItemCategory,
  AssetType,
  GoalCategory,
  Frequency,
  INITIAL_PROFILE,
  CONSTANTS,
  GOAL_CATEGORIES,
} from '@/app/lib/definitions';
import type { Profile, Goal, Asset, FinancialItem, SimulationResult } from '@/app/lib/definitions';
import { differenceInMonths } from 'date-fns';

// ============================================================================
// FACTORIES
// ============================================================================

const NOW = new Date('2026-03-08T12:00:00Z');

const makeItem = (overrides: Partial<FinancialItem> = {}): FinancialItem =>
  ({
    id: 'item-1',
    profileId: 'p1',
    name: 'Test',
    amount: 0,
    category: ItemCategory.INCOME,
    frequency: Frequency.MONTHLY,
    dayOfMonth: 1,
    createdAt: NOW,
    ...overrides,
  }) as FinancialItem;

const makeAsset = (overrides: Partial<Asset> = {}): Asset =>
  ({
    id: 'asset-1',
    profileId: 'p1',
    name: 'Test Asset',
    type: AssetType.LIVRET,
    currentValue: 0,
    monthlyFlow: 0,
    transferDay: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }) as Asset;

const makeGoal = (overrides: Partial<Goal> = {}): Goal =>
  ({
    id: 'goal-1',
    profileId: 'p1',
    name: 'Test Goal',
    category: GoalCategory.OTHER,
    targetAmount: 10000,
    currentSaved: 0,
    monthlyContribution: 0,
    deadline: new Date('2028-03-08'),
    projectedYield: 0,
    transferDay: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }) as Goal;

const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  ...INITIAL_PROFILE,
  id: 'p1',
  userId: 'u1',
  age: 30,
  persona: UserPersona.SALARIED,
  housingStatus: HousingStatus.TENANT,
  housingCost: 800,
  housingPaymentDay: 5,
  adults: 1,
  children: 0,
  funBudget: 200,
  household: { adults: 1, children: 0 },
  housing: { status: HousingStatus.TENANT, monthlyCost: 800, paymentDay: 5 },
  items: [],
  assets: [],
  goals: [],
  decisions: [],
  incomes: [],
  fixedCosts: [],
  variableCosts: [],
  subscriptions: [],
  credits: [],
  annualExpenses: [],
  savingsContributions: [],
  investments: [],
  ...overrides,
});

const RATES: SimulationRates = {
  INFLATION: 0.025,
  LIVRET_A: 0.03,
  LEP: 0.05,
  MARKET_AVG: 0.07,
  SAFE_WITHDRAWAL: 0.04,
};

// ============================================================================
// estimateTaxSavings — TAX_BRACKETS (Tranches 2025)
// TMI: 0-11294→11%, 11294-28797→30%, 28797-82341→41%, 82341-177106→45%, >177106→45%
// ============================================================================

describe('estimateTaxSavings', () => {
  it('retourne 0 si revenu ou versement <= 0', () => {
    expect(estimateTaxSavings(0, 1000)).toBe(0);
    expect(estimateTaxSavings(30000, 0)).toBe(0);
    expect(estimateTaxSavings(-100, 1000)).toBe(0);
  });

  it('TMI 11% : revenu 10 000€, versement 1 000€ → économie 110€', () => {
    const annualIncome = 10000;
    const perContribution = 1000;
    const expected = Math.round(perContribution * 0.11);
    expect(estimateTaxSavings(annualIncome, perContribution)).toBe(expected);
    expect(expected).toBe(110);
  });

  it('TMI 30% : revenu 20 000€, versement 1 000€ → économie 300€', () => {
    const annualIncome = 20000;
    const perContribution = 1000;
    const expected = Math.round(perContribution * 0.30);
    expect(estimateTaxSavings(annualIncome, perContribution)).toBe(expected);
    expect(expected).toBe(300);
  });

  it('TMI 41% : revenu 50 000€, versement 3 000€ → économie 1 230€', () => {
    const annualIncome = 50000;
    const perContribution = 3000;
    const expected = Math.round(perContribution * 0.41);
    expect(estimateTaxSavings(annualIncome, perContribution)).toBe(expected);
    expect(expected).toBe(1230);
  });

  it('TMI 45% : revenu 100 000€, versement 2 000€ → économie 900€', () => {
    const annualIncome = 100000;
    const perContribution = 2000;
    const expected = Math.round(perContribution * 0.45);
    expect(estimateTaxSavings(annualIncome, perContribution)).toBe(expected);
    expect(expected).toBe(900);
  });

  it('Revenu > 177 106€ : TMI 45% (dernière tranche)', () => {
    const annualIncome = 200000;
    const perContribution = 1000;
    const expected = Math.round(perContribution * 0.45);
    expect(estimateTaxSavings(annualIncome, perContribution)).toBe(expected);
    expect(expected).toBe(450);
  });
});

// ============================================================================
// INVARIANT : Calcul théorique des efforts mensuels
// effort = (targetAmount - currentSaved) / monthsRemaining
// ============================================================================

describe('calculateMonthlyEffort', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 when targetAmount is 0 (invariant: pas d\'effort sans objectif)', () => {
    const expected = 0;
    const goal = makeGoal({ targetAmount: 0 });
    expect(calculateMonthlyEffort(goal)).toBe(expected);
  });

  it('returns 0 when deadline is null (invariant: pas de timeline)', () => {
    const expected = 0;
    const goal = makeGoal({ deadline: null as any });
    expect(calculateMonthlyEffort(goal)).toBe(expected);
  });

  it('calcule l\'effort mensuel = (target - saved) / months (Blind & Logic)', () => {
    const targetAmount = 10000;
    const currentSaved = 0;
    const deadline = new Date('2028-03-08');
    const months = Math.max(1, differenceInMonths(deadline, NOW));
    const expected = (targetAmount - currentSaved) / months;

    const goal = makeGoal({ targetAmount, currentSaved, deadline });
    expect(calculateMonthlyEffort(goal)).toBeCloseTo(expected, 0);
  });

  it('déduit currentSaved du gap (Blind & Logic)', () => {
    const targetAmount = 10000;
    const currentSaved = 4000;
    const deadline = new Date('2028-03-08');
    const months = Math.max(1, differenceInMonths(deadline, NOW));
    const expected = (targetAmount - currentSaved) / months;

    const goal = makeGoal({ targetAmount, currentSaved, deadline });
    expect(calculateMonthlyEffort(goal)).toBeCloseTo(expected, 0);
  });

  it('effort investi < effort simple (intérêts composés réduisent l\'effort)', () => {
    const goalSimple = makeGoal({
      targetAmount: 10000,
      currentSaved: 0,
      deadline: new Date('2028-03-08'),
    });
    const goalInvested = makeGoal({
      targetAmount: 10000,
      currentSaved: 0,
      deadline: new Date('2028-03-08'),
      isInvested: true,
      projectedYield: 7,
    });
    const effortSimple = calculateMonthlyEffort(goalSimple);
    const effortInvested = calculateMonthlyEffort(goalInvested);

    expect(effortInvested).toBeLessThan(effortSimple);
    expect(effortInvested).toBeGreaterThan(0);
  });

  it('deadline passée → effort = reste à épargner (min 1 mois)', () => {
    const targetAmount = 5000;
    const currentSaved = 1000;
    const expected = targetAmount - currentSaved; // 4000

    const goal = makeGoal({ targetAmount, currentSaved, deadline: new Date('2025-01-01') });
    expect(calculateMonthlyEffort(goal)).toBe(expected);
  });

  it('déjà atteint → effort = 0', () => {
    const expected = 0;
    const goal = makeGoal({ targetAmount: 5000, currentSaved: 6000, deadline: new Date('2028-03-08') });
    expect(calculateMonthlyEffort(goal)).toBe(expected);
  });
});

// ============================================================================
// INVARIANT : Priorisation des objectifs (Urgence > Loisirs)
// ============================================================================

describe('distributeGoals', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('INVARIANT : Objectif Urgence (EMERGENCY) servi AVANT Loisirs (TRAVEL)', () => {
    const capacity = 500;
    const maxAvailable = capacity * (1 - CONSTANTS.BUFFER_RATIO); // 450€

    const goals = [
      makeGoal({
        id: 'loisirs',
        category: GoalCategory.TRAVEL,
        targetAmount: 6000,
        deadline: new Date('2028-03-08'),
      }),
      makeGoal({
        id: 'urgence',
        category: GoalCategory.EMERGENCY,
        targetAmount: 6000,
        deadline: new Date('2028-03-08'),
      }),
    ];

    const result = distributeGoals(goals, capacity);

    const emergencyAlloc = result.allocations.find((a) => a.id === 'urgence');
    const travelAlloc = result.allocations.find((a) => a.id === 'loisirs');

    expect(emergencyAlloc).toBeDefined();
    expect(travelAlloc).toBeDefined();
    expect(GOAL_CATEGORIES.EMERGENCY.priority).toBeLessThan(GOAL_CATEGORIES.TRAVEL.priority);
    expect(result.allocations[0].id).toBe('urgence');
  });

  it('capacity suffisante → objectif FULL à 100%', () => {
    const targetAmount = 6000;
    const deadline = new Date('2028-03-08');
    const months = Math.max(1, differenceInMonths(deadline, NOW));
    const effortRequired = targetAmount / months;
    const capacity = effortRequired * 2;
    const expectedFillRate = 100;

    const goals = [makeGoal({ targetAmount, deadline })];
    const result = distributeGoals(goals, capacity);

    expect(result.allocations[0].status).toBe('FULL');
    expect(result.allocations[0].fillRate).toBe(expectedFillRate);
  });

  it('capacity insuffisante → objectif PARTIAL', () => {
    const targetAmount = 60000;
    const deadline = new Date('2028-03-08');
    const months = Math.max(1, differenceInMonths(deadline, NOW));
    const effortRequired = targetAmount / months;
    const capacity = effortRequired * 0.1;

    const goals = [makeGoal({ targetAmount, deadline })];
    const result = distributeGoals(goals, capacity);

    expect(result.allocations[0].status).toBe('PARTIAL');
    expect(result.allocations[0].fillRate).toBeLessThan(100);
  });

  it('capacity = 0 → totalAllocated = 0', () => {
    const expected = 0;
    const goals = [makeGoal({ targetAmount: 10000, deadline: new Date('2028-03-08') })];
    const result = distributeGoals(goals, 0);

    expect(result.totalAllocated).toBe(expected);
    expect(result.allocations[0].allocatedEffort).toBe(expected);
  });

  it('goals vide → allocations vide', () => {
    const result = distributeGoals([], 1000);
    expect(result.allocations).toHaveLength(0);
    expect(result.totalAllocated).toBe(0);
  });
});

// ============================================================================
// INVARIANT : netCashflow = revenus - toutes_charges (Zéro fuite)
// ============================================================================

describe('computeFinancialPlan — Invariants métier', () => {
  it('INVARIANT ZÉRO FUITES : realCashflow = max(0, revenus - fixed - variable - funBudget - manualSavings)', () => {
    const income = 2500;
    const fixedCosts = 200;
    const housingCost = 800;
    const variable = 300;
    const funBudget = 200;
    const manualSavings = 0;

    const fixed = fixedCosts + housingCost;
    const mandatoryAndVital = fixed + variable;
    const rawCapacity = income - mandatoryAndVital - funBudget;
    const totalSavingsCapacity = Math.max(0, rawCapacity);
    const expectedNetCashflow = Math.max(0, totalSavingsCapacity - manualSavings);

    const profile = makeProfile({
      incomes: [makeItem({ amount: income, category: ItemCategory.INCOME })],
      fixedCosts: [makeItem({ amount: fixedCosts, category: ItemCategory.FIXED_COST })],
      variableCosts: [makeItem({ amount: variable, category: ItemCategory.VARIABLE_COST })],
      funBudget,
      savingsContributions: [],
    });

    const result = computeFinancialPlan(profile);

    expect(result.budget.realCashflow).toBeCloseTo(expectedNetCashflow, 0);
    expect(result.budget.income).toBe(income);
    expect(result.budget.fixed).toBeGreaterThanOrEqual(fixed);
  });

  it('INVARIANT CONSERVATION : Revenus 0€, charges 10000€ → patrimoine ne peut pas augmenter', () => {
    const income = 0;
    const charges = 10000;
    const expectedNetCashflow = 0;
    const expectedRawCapacity = income - charges - 0;

    const profile = makeProfile({
      incomes: [],
      fixedCosts: [makeItem({ amount: charges, category: ItemCategory.FIXED_COST })],
      variableCosts: [],
      funBudget: 0,
      housing: { status: HousingStatus.FREE, monthlyCost: 0, paymentDay: 1 },
      assets: [],
      savingsContributions: [],
    });

    const result = computeFinancialPlan(profile);

    expect(result.budget.income).toBe(income);
    expect(result.budget.realCashflow).toBe(expectedNetCashflow);
    expect(result.budget.rawCapacity).toBeLessThanOrEqual(0);
    expect(result.budget.endOfMonthBalance).toBeLessThanOrEqual(0);
  });

  it('Scénario catastrophe : revenus 0€, charges 10000€, patrimoine négatif impossible à afficher', () => {
    const profile = makeProfile({
      incomes: [],
      fixedCosts: [makeItem({ amount: 10000, category: ItemCategory.FIXED_COST })],
      housing: { status: HousingStatus.FREE, monthlyCost: 0, paymentDay: 1 },
      assets: [],
    });

    const result = computeFinancialPlan(profile);

    expect(result.budget.income).toBe(0);
    expect(result.budget.capacityToSave).toBe(0);
    expect(result.budget.realCashflow).toBe(0);
  });

  it('Calcul théorique : income - fixed - variable - fun = capacity (Blind & Logic)', () => {
    const income = 3000;
    const fixedItem = 1000;
    const housing = 800;
    const variable = 500;
    const funBudget = 200;

    const expectedFixed = fixedItem + housing;
    const expectedRawCapacity = income - expectedFixed - variable - funBudget;

    const profile = makeProfile({
      incomes: [makeItem({ amount: income, category: ItemCategory.INCOME })],
      fixedCosts: [makeItem({ amount: fixedItem, category: ItemCategory.FIXED_COST })],
      variableCosts: [makeItem({ amount: variable, category: ItemCategory.VARIABLE_COST })],
      funBudget,
    });

    const result = computeFinancialPlan(profile);

    expect(result.budget.fixed).toBe(expectedFixed);
    expect(result.budget.rawCapacity).toBeCloseTo(expectedRawCapacity, 0);
  });

  it('Housing FREE → fixed exclut le logement', () => {
    const expectedFixed = 0;
    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      housing: { status: HousingStatus.FREE, monthlyCost: 0, paymentDay: 5 },
    });

    const result = computeFinancialPlan(profile);
    expect(result.budget.fixed).toBe(expectedFixed);
  });

  it('Profil vide → tout à 0', () => {
    const profile = makeProfile({
      funBudget: 0,
      housingCost: 0,
      housing: { status: HousingStatus.FREE, monthlyCost: 0, paymentDay: 5 },
    });

    const result = computeFinancialPlan(profile);

    expect(result.budget.income).toBe(0);
    expect(result.budget.fixed).toBe(0);
    expect(result.budget.capacityToSave).toBe(0);
  });

  it('Agrégation actifs : CC + LIVRET + PEA = totalWealth', () => {
    const cc = 1500;
    const livret = 8000;
    const pea = 15000;
    const expectedTotalWealth = cc + livret + pea;

    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      assets: [
        makeAsset({ type: AssetType.CC, currentValue: cc }),
        makeAsset({ type: AssetType.LIVRET, currentValue: livret }),
        makeAsset({ type: AssetType.PEA, currentValue: pea }),
      ],
    });

    const result = computeFinancialPlan(profile);

    expect(result.budget.currentBalance).toBe(cc);
    expect(result.budget.matelas).toBe(livret);
    expect(result.budget.investments).toBe(pea);
    expect(result.budget.totalWealth).toBe(expectedTotalWealth);
  });

  it('LDDS, LEP, PEL, PEE comptent dans matelas (cohérence definitions.ts ASSET_TYPES)', () => {
    const ldds = 8000;
    const lep = 5000;
    const pel = 3000;
    const pee = 2000;
    const expectedMatelas = ldds + lep + pel + pee;

    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      assets: [
        makeAsset({ type: AssetType.LDDS, currentValue: ldds }),
        makeAsset({ type: AssetType.LEP, currentValue: lep }),
        makeAsset({ type: AssetType.PEL, currentValue: pel }),
        makeAsset({ type: AssetType.PEE, currentValue: pee }),
      ],
    });

    const result = computeFinancialPlan(profile);

    expect(result.budget.matelas).toBe(expectedMatelas);
    expect(result.budget.investments).toBe(0);
  });

  it('safetyMonths = matelas / burnRate (calcul théorique)', () => {
    const matelas = 6000;
    const fixed = 1000;
    const housing = 800;
    const variable = 500;
    const funBudget = 200;
    const burnRate = fixed + housing + variable + Math.min(funBudget, 500);
    const expectedSafetyMonths = matelas / burnRate;

    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      fixedCosts: [makeItem({ amount: fixed, category: ItemCategory.FIXED_COST })],
      variableCosts: [makeItem({ amount: variable, category: ItemCategory.VARIABLE_COST })],
      funBudget,
      assets: [makeAsset({ type: AssetType.LIVRET, currentValue: matelas })],
    });

    const result = computeFinancialPlan(profile);

    expect(result.budget.safetyMonths).toBeCloseTo(expectedSafetyMonths, 1);
  });

  it('savingsContributions réduisent endOfMonthBalance (A.0)', () => {
    const income = 3000;
    const savingsTotal = 500;

    const profileWithSavings = makeProfile({
      incomes: [makeItem({ amount: income, category: ItemCategory.INCOME })],
      savingsContributions: [
        { id: 'sc-1', name: 'Livret A', amount: 200, dayOfMonth: 5 },
        { id: 'sc-2', name: 'PEA', amount: 300, dayOfMonth: 10 },
      ],
    });

    const profileNoSavings = makeProfile({
      incomes: [makeItem({ amount: income, category: ItemCategory.INCOME })],
      savingsContributions: [],
    });

    const resultWith = computeFinancialPlan(profileWithSavings);
    const resultNo = computeFinancialPlan(profileNoSavings);

    const expectedDiff = savingsTotal;
    expect(resultWith.budget.endOfMonthBalance).toBe(
      resultNo.budget.endOfMonthBalance - expectedDiff
    );
  });

  it('securityBuffer = matelas - idealSafety (A.2)', () => {
    const matelas = 6000;
    const burnRate = 2500;
    const targetMonths = 3;
    const idealSafety = burnRate * targetMonths;
    const expectedSecurityBuffer = matelas - idealSafety;

    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      fixedCosts: [makeItem({ amount: 1000, category: ItemCategory.FIXED_COST })],
      variableCosts: [makeItem({ amount: 500, category: ItemCategory.VARIABLE_COST })],
      funBudget: 200,
      assets: [makeAsset({ type: AssetType.LIVRET, currentValue: matelas })],
      persona: UserPersona.SALARIED,
    });

    const result = computeFinancialPlan(profile);

    expect(result.budget.securityBuffer).toBeCloseTo(expectedSecurityBuffer, 0);
  });

  it('availableForProjects = max(0, netCashflow - totalAllocated)', () => {
    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      funBudget: 200,
      goals: [],
    });

    const result = computeFinancialPlan(profile);

    expect(result.budget.availableForProjects).toBe(result.budget.realCashflow);
  });

  it('savingsContributions avec mauvais champs (monthlyFlow/transferDay) ignorés (A.0)', () => {
    const brokenContributions = [
      { id: 'sc-1', name: 'Livret A', monthlyFlow: 200, transferDay: 5 },
    ] as unknown as Profile['savingsContributions'];

    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      savingsContributions: brokenContributions,
    });

    const result = computeFinancialPlan(profile);
    const resultNoSavings = computeFinancialPlan(
      makeProfile({
        incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
        savingsContributions: [],
      })
    );

    expect(result.budget.endOfMonthBalance).toBe(resultNoSavings.budget.endOfMonthBalance);
  });
});

// ============================================================================
// simulateGoalScenario
// ============================================================================

describe('simulateGoalScenario', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('monthlyEffort = (target - currentSaved) / months (Blind & Logic)', () => {
    const targetAmount = 3000;
    const currentSaved = 0;
    const deadline = new Date('2027-03-08');
    const months = Math.max(1, differenceInMonths(deadline, NOW));
    const expectedEffort = (targetAmount - currentSaved) / months;

    const goalInput = {
      name: 'Voyage',
      targetAmount,
      currentSaved,
      deadline,
      category: GoalCategory.TRAVEL,
      projectedYield: 0,
    };
    const context = { availableForProjects: 500, monthlyIncome: 2500, matelas: 5000 };

    const result = simulateGoalScenario(goalInput, {}, context);

    expect(result.monthlyEffort).toBeCloseTo(expectedEffort, 0);
  });

  it('projection démarre à currentSaved', () => {
    const currentSaved = 1200;
    const goalInput = {
      name: 'Épargne',
      targetAmount: 5000,
      currentSaved,
      deadline: new Date('2027-03-08'),
      category: GoalCategory.OTHER,
      projectedYield: 0,
    };
    const context = { availableForProjects: 500, monthlyIncome: 3000, matelas: 5000 };

    const result = simulateGoalScenario(goalInput, {}, context);
    const first = result.projectionData.projection[0];

    expect(first.balance).toBe(currentSaved);
    expect(first.contributed).toBe(currentSaved);
  });

  it('summary.totalInterests = 0 quand non investi', () => {
    const goalInput = {
      name: 'Cash Goal',
      targetAmount: 5000,
      currentSaved: 0,
      deadline: new Date('2028-03-08'),
      category: GoalCategory.OTHER,
      projectedYield: 0,
    };
    const context = { availableForProjects: 500, monthlyIncome: 3000, matelas: 5000 };

    const result = simulateGoalScenario(goalInput, {}, context);

    expect(result.projectionData.summary.totalInterests).toBe(0);
    expect(result.projectionData.summary.finalAmount).toBe(
      result.projectionData.summary.totalPocket
    );
  });
});

// ============================================================================
// analyzeProfileHealth — Portes hiérarchiques
// ============================================================================

describe('analyzeProfileHealth', () => {
  const makeContext = (
    overrides: Partial<SimulationResult['budget']> = {}
  ): SimulationResult['budget'] => ({
    income: 2500,
    fixed: 1000,
    variable: 300,
    variableExpenses: 300,
    monthlyIncome: 2500,
    mandatoryExpenses: 1000,
    discretionaryExpenses: 200,
    capacityToSave: 1000,
    rawCapacity: 1000,
    endOfMonthBalance: 500,
    profitableExpenses: 200,
    totalRecurring: 1500,
    remainingToLive: 1000,
    realCashflow: 800,
    matelas: 5000,
    investments: 0,
    totalWealth: 5000,
    safetyMonths: 3,
    engagementRate: 10,
    rules: { safetyMonths: 3, maxDebt: 35, minLiving: 300 },
    securityBuffer: 0,
    availableForProjects: 0,
    currentBalance: 1500,
    capacity: 1000,
    totalGoalsEffort: 0,
    ...overrides,
  });

  it('DANGER (score 10) pour déficit structurel', () => {
    const expectedScore = 10;
    const profile = makeProfile();
    const context = makeContext({ rawCapacity: -500, endOfMonthBalance: -700 });

    const result = analyzeProfileHealth(profile, context);

    expect(result.globalScore).toBe(expectedScore);
    expect(result.tags).toContain('DANGER');
  });

  it('SURCHAUFFE (score 30) pour sur-investissement', () => {
    const expectedScore = 30;
    const profile = makeProfile();
    const context = makeContext({
      rawCapacity: 500,
      endOfMonthBalance: -200,
      profitableExpenses: 700,
    });

    const result = analyzeProfileHealth(profile, context);

    expect(result.globalScore).toBe(expectedScore);
    expect(result.tags).toContain('SURCHAUFFE');
  });

  it('fireYear = 0 quand wealth >= 25× dépenses annuelles', () => {
    const annualExpenses = (1000 + 300 + 200) * 12;
    const fireTarget = annualExpenses / 0.04;
    const totalWealth = 500000;
    const expectedFireYear = totalWealth >= fireTarget ? 0 : 99;

    const profile = makeProfile();
    const context = makeContext({
      totalWealth,
      fixed: 1000,
      variableExpenses: 300,
      discretionaryExpenses: 200,
    });

    const result = analyzeProfileHealth(profile, context);

    expect(result.projections.fireYear).toBe(expectedFireYear);
  });

  it('fireYear = 99 quand capacityToSave = 0', () => {
    const expectedFireYear = 99;
    const profile = makeProfile();
    const context = makeContext({
      capacityToSave: 0,
      endOfMonthBalance: 0,
      monthlyIncome: 1500,
    });

    const result = analyzeProfileHealth(profile, context);

    expect(result.projections.fireYear).toBe(expectedFireYear);
  });

  it('fireYear décroît quand savings rate augmente', () => {
    const profile = makeProfile();
    const base = {
      totalWealth: 20000,
      endOfMonthBalance: 500,
      matelas: 5000,
      fixed: 1000,
      variableExpenses: 300,
      discretionaryExpenses: 200,
      monthlyIncome: 3000,
    };

    const lowSaver = analyzeProfileHealth(profile, makeContext({ ...base, capacityToSave: 500 }));
    const highSaver = analyzeProfileHealth(profile, makeContext({ ...base, capacityToSave: 2000 }));

    expect(highSaver.projections.fireYear).toBeLessThan(lowSaver.projections.fireYear);
  });

  it('tax_optim_open inclut potentialGain calculé via TAX_BRACKETS (Blind & Logic)', () => {
    const profile = makeProfile();
    const monthlyIncome = 4000;
    const annualIncome = monthlyIncome * 12;
    const context = makeContext({
      monthlyIncome,
      endOfMonthBalance: 500,
      matelas: 5000,
      investments: 5000,
      totalWealth: 10000,
    });

    const result = analyzeProfileHealth(profile, context);
    const taxOpp = result.opportunities.find((o) => o.id === 'tax_optim_open');
    expect(taxOpp).toBeDefined();

    const expectedSavings = estimateTaxSavings(annualIncome, 3000);
    expect(taxOpp!.potentialGain).toBe(expectedSavings);
    expect(taxOpp!.message).toContain('économisez');
  });
});
