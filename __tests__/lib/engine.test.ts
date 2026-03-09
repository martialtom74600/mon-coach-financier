import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateMonthlyEffort,
  analyzeGoalStrategies,
  distributeGoals,
  computeFinancialPlan,
  simulateGoalScenario,
  analyzeProfileHealth,
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
} from '@/app/lib/definitions';
import type { Profile, Goal, Asset, FinancialItem, SimulationResult } from '@/app/lib/definitions';

// ============================================================================
// FACTORIES — Profils types réutilisables
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
// 1. calculateMonthlyEffort
// ============================================================================

describe('calculateMonthlyEffort', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns 0 when targetAmount is missing', () => {
    const goal = makeGoal({ targetAmount: 0 });
    expect(calculateMonthlyEffort(goal)).toBe(0);
  });

  it('returns 0 when deadline is missing', () => {
    const goal = makeGoal({ deadline: null as any });
    expect(calculateMonthlyEffort(goal)).toBe(0);
  });

  it('calculates simple monthly savings (no investment)', () => {
    // differenceInMonths('2028-03-08', NOW) = 23 (sub-day offset)
    // 10000 / 23 ≈ 434.78
    const goal = makeGoal({
      targetAmount: 10000,
      currentSaved: 0,
      deadline: new Date('2028-03-08'),
    });
    const effort = calculateMonthlyEffort(goal);
    expect(effort).toBeCloseTo(10000 / 23, 0);
  });

  it('accounts for already-saved amount', () => {
    // (10000 - 4000) / 23 ≈ 260.87
    const goal = makeGoal({
      targetAmount: 10000,
      currentSaved: 4000,
      deadline: new Date('2028-03-08'),
    });
    const effort = calculateMonthlyEffort(goal);
    expect(effort).toBeCloseTo(6000 / 23, 0);
  });

  it('reduces effort when invested (compound interest)', () => {
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

  it('returns remaining amount if deadline is past (min 1 month)', () => {
    const goal = makeGoal({
      targetAmount: 5000,
      currentSaved: 1000,
      deadline: new Date('2025-01-01'),
    });
    const effort = calculateMonthlyEffort(goal);
    expect(effort).toBe(4000);
  });

  it('returns 0 when already saved more than target', () => {
    const goal = makeGoal({
      targetAmount: 5000,
      currentSaved: 6000,
      deadline: new Date('2028-03-08'),
    });
    const effort = calculateMonthlyEffort(goal);
    expect(effort).toBe(0);
  });
});

// ============================================================================
// 2. analyzeGoalStrategies
// ============================================================================

describe('analyzeGoalStrategies', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns POSSIBLE when effort fits within capacity', () => {
    const goal = makeGoal({ targetAmount: 10000, deadline: new Date('2030-01-01') });
    const result = analyzeGoalStrategies(goal, 200, 500, 3000, 5000, RATES);
    expect(result.status).toBe('POSSIBLE');
    expect(result.color).toBe('green');
    expect(result.gap).toBe(0);
  });

  it('returns HARD when effort exceeds capacity but not income', () => {
    const goal = makeGoal({ targetAmount: 50000, deadline: new Date('2028-01-01') });
    const result = analyzeGoalStrategies(goal, 2500, 500, 3000, 5000, RATES);
    expect(result.status).toBe('HARD');
    expect(result.color).toBe('red');
    expect(result.gap).toBe(2000);
  });

  it('returns IMPOSSIBLE when effort exceeds income', () => {
    const goal = makeGoal({ targetAmount: 100000, deadline: new Date('2027-01-01') });
    const result = analyzeGoalStrategies(goal, 10000, 500, 3000, 5000, RATES);
    expect(result.status).toBe('IMPOSSIBLE');
    expect(result.color).toBe('black');
  });

  it('suggests deposit strategy when savings > 1000 and status is HARD', () => {
    const goal = makeGoal({ targetAmount: 50000, deadline: new Date('2028-01-01') });
    const result = analyzeGoalStrategies(goal, 2500, 500, 3000, 8000, RATES);
    expect(result.status).toBe('HARD');
    const depositStrategy = result.strategies.find(s => s.type === 'BUDGET');
    expect(depositStrategy).toBeDefined();
    expect(depositStrategy!.title).toBe('Apport');
  });

  it('suggests time strategy when HARD', () => {
    const goal = makeGoal({
      targetAmount: 20000,
      currentSaved: 0,
      deadline: new Date('2028-01-01'),
    });
    const result = analyzeGoalStrategies(goal, 1000, 400, 3000, 500, RATES);
    expect(result.status).toBe('HARD');
    const timeStrategy = result.strategies.find(s => s.type === 'TIME');
    expect(timeStrategy).toBeDefined();
  });
});

// ============================================================================
// 3. distributeGoals
// ============================================================================

describe('distributeGoals', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it('fully funds a single goal when capacity is sufficient', () => {
    const goals = [makeGoal({ targetAmount: 6000, deadline: new Date('2028-03-08') })];
    const result = distributeGoals(goals, 1000);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].status).toBe('FULL');
    expect(result.allocations[0].fillRate).toBe(100);
  });

  it('partially funds a goal when capacity is insufficient', () => {
    const goals = [makeGoal({ targetAmount: 60000, deadline: new Date('2028-03-08') })];
    const result = distributeGoals(goals, 100);
    expect(result.allocations[0].status).toBe('PARTIAL');
    expect(result.allocations[0].fillRate).toBeLessThan(100);
  });

  it('respects priority ordering (EMERGENCY > OTHER > RETIREMENT)', () => {
    const goals = [
      makeGoal({ id: 'retirement', category: GoalCategory.RETIREMENT, targetAmount: 6000, deadline: new Date('2028-03-08') }),
      makeGoal({ id: 'emergency', category: GoalCategory.EMERGENCY, targetAmount: 6000, deadline: new Date('2028-03-08') }),
      makeGoal({ id: 'travel', category: GoalCategory.TRAVEL, targetAmount: 6000, deadline: new Date('2028-03-08') }),
    ];
    const result = distributeGoals(goals, 500);
    expect(result.allocations[0].id).toBe('emergency');
    expect(result.allocations[0].status).toBe('FULL');
  });

  it('returns 0 allocations for zero capacity', () => {
    const goals = [makeGoal({ targetAmount: 10000, deadline: new Date('2028-03-08') })];
    const result = distributeGoals(goals, 0);
    expect(result.totalAllocated).toBe(0);
    expect(result.allocations[0].allocatedEffort).toBe(0);
  });

  it('handles empty goals array', () => {
    const result = distributeGoals([], 1000);
    expect(result.allocations).toHaveLength(0);
    expect(result.totalAllocated).toBe(0);
  });
});

// ============================================================================
// 4. computeFinancialPlan
// ============================================================================

describe('computeFinancialPlan', () => {
  it('computes a basic salaried profile correctly', () => {
    const profile = makeProfile({
      incomes: [makeItem({ amount: 2500, category: ItemCategory.INCOME })],
      fixedCosts: [makeItem({ amount: 200, category: ItemCategory.FIXED_COST })],
      variableCosts: [makeItem({ amount: 300, category: ItemCategory.VARIABLE_COST })],
      funBudget: 200,
    });

    const result = computeFinancialPlan(profile);
    expect(result.budget.income).toBe(2500);
    expect(result.budget.fixed).toBeGreaterThanOrEqual(200);
    expect(result.budget.variable).toBe(300);
    expect(result.budget.capacityToSave).toBeGreaterThan(0);
  });

  it('includes housing cost for tenants', () => {
    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      housing: { status: HousingStatus.TENANT, monthlyCost: 900, paymentDay: 5 },
    });

    const result = computeFinancialPlan(profile);
    expect(result.budget.fixed).toBeGreaterThanOrEqual(900);
  });

  it('excludes housing cost for FREE status', () => {
    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      housing: { status: HousingStatus.FREE, monthlyCost: 0 },
    });

    const result = computeFinancialPlan(profile);
    expect(result.budget.fixed).toBe(0);
  });

  it('handles empty profile (all zeros)', () => {
    const profile = makeProfile({
      funBudget: 0,
      housingCost: 0,
      housing: { status: HousingStatus.FREE, monthlyCost: 0 },
    });
    const result = computeFinancialPlan(profile);
    expect(result.budget.income).toBe(0);
    expect(result.budget.fixed).toBe(0);
    expect(result.budget.capacityToSave).toBe(0);
  });

  it('classifies assets by type (CC / LIVRET / Invested)', () => {
    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      assets: [
        makeAsset({ type: AssetType.CC, currentValue: 1500 }),
        makeAsset({ type: AssetType.LIVRET, currentValue: 8000 }),
        makeAsset({ type: AssetType.PEA, currentValue: 15000 }),
      ],
    });

    const result = computeFinancialPlan(profile);
    expect(result.budget.currentBalance).toBe(1500);
    expect(result.budget.matelas).toBe(8000);
    expect(result.budget.investments).toBe(15000);
    expect(result.budget.totalWealth).toBe(24500);
  });

  it('calculates safety months from matelas and burn rate', () => {
    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      fixedCosts: [makeItem({ amount: 1000, category: ItemCategory.FIXED_COST })],
      variableCosts: [makeItem({ amount: 500, category: ItemCategory.VARIABLE_COST })],
      funBudget: 200,
      assets: [makeAsset({ type: AssetType.LIVRET, currentValue: 6000 })],
    });

    const result = computeFinancialPlan(profile);
    // fixed = 1000 (fixedCosts) + 800 (housing tenant) = 1800
    // mandatoryAndVital = 1800 + 500 = 2300
    // burnRate = 2300 + min(200, 500) = 2500
    // safetyMonths = 6000 / 2500 = 2.4
    expect(result.budget.safetyMonths).toBeCloseTo(2.4, 1);
  });

  it('calculates debt ratio correctly', () => {
    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
      credits: [makeItem({ amount: 500, category: ItemCategory.CREDIT })],
      housing: { status: HousingStatus.OWNER_LOAN, monthlyCost: 1000, paymentDay: 5 },
    });

    const result = computeFinancialPlan(profile);
    // debtTotal = 500 (credits) + 1000 (housing loan) = 1500
    // ratio = 1500 / 3000 * 100 = 50%
    expect(result.budget.engagementRate).toBeCloseTo(50, 0);
  });

  it('accepts custom rates override', () => {
    const profile = makeProfile({
      incomes: [makeItem({ amount: 3000, category: ItemCategory.INCOME })],
    });
    const result = computeFinancialPlan(profile, { INFLATION: 0.10 });
    expect(result.usedRates!.INFLATION).toBe(0.10);
    expect(result.usedRates!.MARKET_AVG).toBe(0.07);
  });
});

// ============================================================================
// 5. simulateGoalScenario
// ============================================================================

describe('simulateGoalScenario', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns diagnosis and monthly effort for a goal', () => {
    const goalInput = {
      name: 'Voyage',
      targetAmount: 3000,
      currentSaved: 0,
      deadline: new Date('2027-03-08'),
      category: GoalCategory.TRAVEL,
      projectedYield: 0,
    };
    const context = { availableForProjects: 500, monthlyIncome: 2500, matelas: 5000 };
    const result = simulateGoalScenario(goalInput, {}, context);

    // differenceInMonths('2027-03-08', NOW) = 11
    expect(result.monthlyEffort).toBeCloseTo(3000 / 11, 0);
    expect(result.diagnosis).toBeDefined();
    expect(result.diagnosis.status).toBe('POSSIBLE');
  });

  it('diagnoses IMPOSSIBLE for unrealistic goal', () => {
    const goalInput = {
      name: 'Manoir',
      targetAmount: 500000,
      currentSaved: 0,
      deadline: new Date('2027-03-08'),
      category: GoalCategory.REAL_ESTATE,
      projectedYield: 0,
    };
    const context = { availableForProjects: 200, monthlyIncome: 2000, matelas: 1000 };
    const result = simulateGoalScenario(goalInput, {}, context);

    expect(result.diagnosis.status).toBe('IMPOSSIBLE');
  });
});

// ============================================================================
// 6. analyzeProfileHealth — Le Docteur Financier
// ============================================================================

describe('analyzeProfileHealth', () => {
  const makeContext = (overrides: Partial<SimulationResult['budget']> = {}): SimulationResult['budget'] => ({
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

  // --- PORTE 1 : SURVIE ---

  it('returns DANGER (score 10) for structural deficit', () => {
    const profile = makeProfile();
    const context = makeContext({ rawCapacity: -500, endOfMonthBalance: -700 });
    const result = analyzeProfileHealth(profile, context);

    expect(result.globalScore).toBe(10);
    expect(result.tags).toContain('DANGER');
    expect(result.opportunities[0].id).toBe('CRITICAL_DEFICIT');
    expect(result.opportunities[0].level).toBe('CRITICAL');
  });

  it('returns SURCHAUFFE (score 30) for over-investing', () => {
    const profile = makeProfile();
    const context = makeContext({
      rawCapacity: 500,
      endOfMonthBalance: -200,
      profitableExpenses: 700,
    });
    const result = analyzeProfileHealth(profile, context);

    expect(result.globalScore).toBe(30);
    expect(result.tags).toContain('SURCHAUFFE');
    expect(result.opportunities[0].id).toBe('OVER_INVEST');
  });

  // --- PORTE 2 : SÉCURITÉ ---

  it('flags CRITICAL safety when matelas < 1000€', () => {
    const profile = makeProfile();
    const context = makeContext({ matelas: 500, endOfMonthBalance: 200 });
    const result = analyzeProfileHealth(profile, context);

    const safetyOpp = result.opportunities.find(o => o.id === 'safety_danger');
    expect(safetyOpp).toBeDefined();
    expect(safetyOpp!.level).toBe('CRITICAL');
  });

  it('requires 6 months safety for freelance profiles', () => {
    const profile = makeProfile({ persona: UserPersona.FREELANCE });
    const context = makeContext({
      matelas: 3000,
      endOfMonthBalance: 500,
      fixed: 1000,
      variableExpenses: 300,
      discretionaryExpenses: 200,
    });
    const result = analyzeProfileHealth(profile, context);

    const safetyOpp = result.opportunities.find(o =>
      o.id === 'safety_boost' || o.id === 'safety_build'
    );
    expect(safetyOpp).toBeDefined();
    expect(safetyOpp!.level).toBe('CRITICAL');
  });

  it('flags high debt ratio (> 35%)', () => {
    const profile = makeProfile();
    const context = makeContext({
      engagementRate: 42,
      endOfMonthBalance: 200,
      matelas: 5000,
    });
    const result = analyzeProfileHealth(profile, context);

    const debtOpp = result.opportunities.find(o => o.id === 'debt_alert');
    expect(debtOpp).toBeDefined();
    expect(debtOpp!.level).toBe('WARNING');
  });

  // --- PORTE 3 : INVESTISSEMENT ---

  it('detects cash drag when too much idle cash', () => {
    const profile = makeProfile({
      assets: [makeAsset({ type: AssetType.CC, currentValue: 5000 })],
    });
    const context = makeContext({
      matelas: 10000,
      currentBalance: 5000,
      fixed: 1000,
      endOfMonthBalance: 500,
      variableExpenses: 300,
      discretionaryExpenses: 200,
    });
    const result = analyzeProfileHealth(profile, context);

    const cashDrag = result.opportunities.find(o => o.id === 'cash_drag');
    expect(cashDrag).toBeDefined();
    expect(cashDrag!.type).toBe('INVESTMENT');
  });

  it('suggests PEA for late starters (age > 25, invested < 1000, savings > 3000)', () => {
    const profile = makeProfile({ age: 30, assets: [] });
    const context = makeContext({
      investments: 0,
      matelas: 5000,
      endOfMonthBalance: 500,
    });
    const result = analyzeProfileHealth(profile, context);

    const lateStarter = result.opportunities.find(o => o.id === 'late_starter');
    expect(lateStarter).toBeDefined();
  });

  it('suggests LEP for eligible low-income single', () => {
    const profile = makeProfile({
      household: { adults: 1, children: 0 },
      assets: [],
    });
    // Income * 12 < 22000 → monthlyIncome < 1833
    const context = makeContext({
      monthlyIncome: 1500,
      matelas: 3000,
      endOfMonthBalance: 200,
      investments: 0,
      currentBalance: 500,
      fixed: 500,
      variableExpenses: 200,
      discretionaryExpenses: 100,
    });
    const result = analyzeProfileHealth(profile, context);

    const lepOpp = result.opportunities.find(o => o.id === 'lep_opp');
    expect(lepOpp).toBeDefined();
    expect(lepOpp!.level).toBe('SUCCESS');
  });

  // --- SCORING ---

  it('produces a score between 0 and 100', () => {
    const profile = makeProfile();
    const context = makeContext();
    const result = analyzeProfileHealth(profile, context);

    expect(result.globalScore).toBeGreaterThanOrEqual(0);
    expect(result.globalScore).toBeLessThanOrEqual(100);
  });

  it('tags "Fourmi" for high savers (savings ratio > 25%)', () => {
    const profile = makeProfile();
    const context = makeContext({
      capacityToSave: 1000,
      monthlyIncome: 3000,
      endOfMonthBalance: 500,
      matelas: 5000,
      fixed: 1000,
      variableExpenses: 300,
      discretionaryExpenses: 200,
    });
    const result = analyzeProfileHealth(profile, context);

    expect(result.tags).toContain('Fourmi');
  });

  it('tags "Investisseur" when invested > 50% of savings', () => {
    const profile = makeProfile({
      assets: [makeAsset({ type: AssetType.PEA, currentValue: 20000 })],
    });
    const context = makeContext({
      investments: 20000,
      matelas: 5000,
      endOfMonthBalance: 500,
      currentBalance: 2000,
      monthlyIncome: 4000,
      fixed: 1500,
      variableExpenses: 400,
      discretionaryExpenses: 300,
      capacityToSave: 1500,
    });
    const result = analyzeProfileHealth(profile, context);

    expect(result.tags).toContain('Investisseur');
  });

  it('computes 10-year and 20-year wealth projections', () => {
    const profile = makeProfile();
    const context = makeContext({
      totalWealth: 20000,
      capacityToSave: 500,
      endOfMonthBalance: 500,
      matelas: 5000,
      fixed: 1000,
      variableExpenses: 300,
      discretionaryExpenses: 200,
      monthlyIncome: 3000,
    });
    const result = analyzeProfileHealth(profile, context) as any;

    expect(result.projections.wealth10y).toBeGreaterThan(20000);
    expect(result.projections.wealth20y).toBeGreaterThan(result.projections.wealth10y);
  });

  it('sorts opportunities by severity (CRITICAL first)', () => {
    const profile = makeProfile({ persona: UserPersona.FREELANCE, age: 30 });
    const context = makeContext({
      matelas: 500,
      endOfMonthBalance: 200,
      investments: 0,
      engagementRate: 40,
      monthlyIncome: 3000,
      currentBalance: 500,
      fixed: 1000,
      variableExpenses: 300,
      discretionaryExpenses: 200,
    });
    const result = analyzeProfileHealth(profile, context);

    if (result.opportunities.length >= 2) {
      const levels: Record<string, number> = { CRITICAL: 0, WARNING: 1, SUCCESS: 2, INFO: 3 };
      for (let i = 1; i < result.opportunities.length; i++) {
        expect(levels[result.opportunities[i].level]).toBeGreaterThanOrEqual(
          levels[result.opportunities[i - 1].level]
        );
      }
    }
  });
});
