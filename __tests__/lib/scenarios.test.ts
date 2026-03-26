/**
 * scenarios.test.ts — Tests d'invariants métier (Protocole Blind & Logic)
 *
 * INVARIANTS :
 * - Réalité du crédit : totalPaid = capital + intérêts (formule annuité constante)
 * - Calcul théorique AVANT appel de fonction
 * - Edge cases : catastrophe, dates limites, Zod
 */

import { describe, it, expect } from 'vitest';
import { addDays } from 'date-fns';
import {
  getSimulatedEvents,
  generateTimeline,
  analyzePurchaseImpact,
  type TimelineEvent,
  type MonthData,
} from '@/app/lib/scenarios';
import {
  PaymentMode,
  PurchaseType,
  HousingStatus,
  UserPersona,
  ItemCategory,
  Frequency,
} from '@/app/lib/definitions';
import type { Purchase, PurchaseDecision, Profile, BudgetResult } from '@/app/lib/definitions';

const defaultBudgetResult: BudgetResult = {
  income: 2500,
  fixed: 800,
  variable: 300,
  variableExpenses: 300,
  monthlyIncome: 2500,
  mandatoryExpenses: 1100,
  discretionaryExpenses: 200,
  capacityToSave: 400,
  rawCapacity: 400,
  endOfMonthBalance: 1200,
  profitableExpenses: 0,
  totalRecurring: 1300,
  remainingToLive: 800,
  realCashflow: 400,
  matelas: 5000,
  investments: 0,
  totalWealth: 5000,
  safetyMonths: 4,
  engagementRate: 0,
  rules: { safetyMonths: 3, maxDebt: 35, minLiving: 100 },
  securityBuffer: 0,
  availableForProjects: 400,
  currentBalance: 2000,
  capacity: 400,
  totalGoalsEffort: 0,
};

// Formule annuité constante : PMT = P × r(1+r)^n / ((1+r)^n - 1), totalPaid = PMT × n
const expectedAnnuityTotal = (principal: number, annualRate: number, months: number): number => {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal;
  const pmt = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(pmt * months * 100) / 100;
};

const totalPaidFromEvents = (events: { amount: number }[]): number =>
  Math.abs(events.reduce((sum, e) => sum + e.amount, 0));

// ============================================================================
// C.1 — getSimulatedEvents — INVARIANT RÉALITÉ DU CRÉDIT
// totalPaid = capital + intérêts (formule annuité constante)
// ============================================================================

describe('C.1 — getSimulatedEvents (Blind & Logic)', () => {
  it('CASH_CURRENT : 1 événement, montant = -amount', () => {
    const amount = 500;
    const expectedAmount = -amount;

    const purchase: Purchase = {
      name: 'Achat cash',
      amount,
      paymentMode: PaymentMode.CASH_CURRENT,
      date: new Date('2026-04-01'),
    };

    const events = getSimulatedEvents(purchase);

    expect(events).toHaveLength(1);
    expect(events[0].amount).toBe(expectedAmount);
    expect(events[0].type).toBe('purchase');
  });

  it('CASH_CURRENT + reimbursable : 2 événements, remboursement J+30', () => {
    const amount = 300;
    const purchaseDate = new Date('2026-04-01');
    purchaseDate.setHours(12, 0, 0, 0);

    const expectedRefundDate = addDays(purchaseDate, 30);

    const purchase: Purchase = {
      name: 'Avance frais',
      amount,
      paymentMode: PaymentMode.CASH_CURRENT,
      date: purchaseDate,
      isReimbursable: true,
    };

    const events = getSimulatedEvents(purchase);

    expect(events).toHaveLength(2);
    expect(events[0].amount).toBe(-amount);
    expect(events[1].amount).toBe(amount);
    expect(events[1].type).toBe('income');

    const refundDate =
      typeof events[1].date === 'string' ? new Date(events[1].date) : events[1].date!;
    expect(refundDate.getTime()).toBe(expectedRefundDate.getTime());
  });

  it('SPLIT 4x : 4 événements, somme = montant total', () => {
    const amount = 1200;
    const duration = 4;
    const expectedTotal = amount;
    const expectedPerEvent = amount / duration;

    const purchase: Purchase = {
      name: 'Split 4x',
      amount,
      paymentMode: PaymentMode.SPLIT,
      duration,
      date: new Date('2026-04-01'),
    };

    const events = getSimulatedEvents(purchase);

    expect(events).toHaveLength(4);
    const total = totalPaidFromEvents(events);
    expect(total).toBeCloseTo(expectedTotal, 2);
    events.forEach((e) => expect(Math.abs(e.amount)).toBeCloseTo(expectedPerEvent, 2));
  });

  it('INVARIANT CRÉDIT : totalPaid = capital + intérêts (annuité constante)', () => {
    const principal = 10000;
    const rate = 5;
    const months = 48;

    const expectedTotal = expectedAnnuityTotal(principal, rate, months);
    const expectedInterests = expectedTotal - principal;

    const purchase: Purchase = {
      name: 'Crédit 5%',
      amount: principal,
      paymentMode: PaymentMode.CREDIT,
      duration: months,
      rate,
      date: new Date('2026-03-09'),
    };

    const events = getSimulatedEvents(purchase);
    const total = totalPaidFromEvents(events);

    expect(events).toHaveLength(months);
    expect(total).toBeCloseTo(expectedTotal, 2);
    const simpleInterest = principal * (1 + (rate / 100) * (months / 12));
    expect(total).toBeLessThan(simpleInterest);
  });

  it('CREDIT 0% : totalPaid = principal', () => {
    const principal = 5000;
    const expectedTotal = principal;

    const purchase: Purchase = {
      name: 'Crédit 0%',
      amount: principal,
      paymentMode: PaymentMode.CREDIT,
      duration: 12,
      rate: 0,
      date: new Date('2026-03-09'),
    };

    const events = getSimulatedEvents(purchase);
    const total = totalPaidFromEvents(events);

    expect(events).toHaveLength(12);
    expect(total).toBeCloseTo(expectedTotal, 2);
  });

  it('CASH_SAVINGS : 0 événements (pas d\'impact timeline)', () => {
    const purchase: Purchase = {
      name: 'Retrait épargne',
      amount: 2000,
      paymentMode: PaymentMode.CASH_SAVINGS,
      date: new Date('2026-04-01'),
    };

    const events = getSimulatedEvents(purchase);

    expect(events).toHaveLength(0);
  });

  it('EDGE : Annuité 1 mois → 1 événement', () => {
    const principal = 1000;
    const expectedTotal = principal * 1.01; // 1% sur 1 mois

    const purchase: Purchase = {
      name: 'Micro-crédit',
      amount: principal,
      paymentMode: PaymentMode.CREDIT,
      duration: 1,
      rate: 12,
      date: new Date('2026-04-01'),
    };

    const events = getSimulatedEvents(purchase);
    const total = totalPaidFromEvents(events);

    expect(events).toHaveLength(1);
    expect(total).toBeCloseTo(expectedTotal, 0);
  });

  it('EDGE : Crédit 360 mois (30 ans)', () => {
    const principal = 200000;
    const rate = 3;
    const months = 360;

    const expectedTotal = expectedAnnuityTotal(principal, rate, months);

    const purchase: Purchase = {
      name: 'Crédit immobilier',
      amount: principal,
      paymentMode: PaymentMode.CREDIT,
      duration: months,
      rate,
      date: new Date('2026-03-09'),
    };

    const events = getSimulatedEvents(purchase);
    const total = totalPaidFromEvents(events);

    expect(events).toHaveLength(months);
    expect(total).toBeCloseTo(expectedTotal, 0);
  });

});

// ============================================================================
// C.2 — generateTimeline
// ============================================================================

describe('C.2 — generateTimeline (Blind & Logic)', () => {
  const minimalProfile: Profile = {
    id: 'test-profile',
    userId: 'test-user',
    firstName: 'Test',
    age: 30,
    persona: UserPersona.SALARIED,
    mode: 'beginner',
    household: { adults: 1, children: 0 },
    housing: { status: HousingStatus.TENANT, monthlyCost: 800, paymentDay: 5 },
    housingCost: 800,
    housingPaymentDay: 5,
    adults: 1,
    children: 0,
    housingStatus: HousingStatus.TENANT,
    funBudget: 200,
    savings: 5000,
    investedAmount: 0,
    investmentYield: 5,
    currentBalance: 2000,
    monthlyIncome: 2500,
    items: [],
    assets: [],
    goals: [],
    decisions: [],
    variableCosts: [],
    incomes: [
      {
        id: 'inc1',
        profileId: 'test-profile',
        name: 'Salaire',
        amount: 2500,
        category: ItemCategory.INCOME,
        dayOfMonth: 1,
        frequency: Frequency.MONTHLY,
        createdAt: new Date(),
      },
    ],
    fixedCosts: [
      {
        id: 'fix1',
        profileId: 'test-profile',
        name: 'Loyer',
        amount: 800,
        category: ItemCategory.FIXED_COST,
        dayOfMonth: 5,
        frequency: Frequency.MONTHLY,
        createdAt: new Date(),
      },
    ],
    subscriptions: [],
    credits: [],
    annualExpenses: [],
    savingsContributions: [],
    investments: [],
    updatedAt: new Date().toISOString(),
  };

  it('Salaire le 1er augmente le solde, loyer le 5 le baisse', () => {
    const profile = {
      ...minimalProfile,
      currentBalance: 2000,
      updatedAt: '2026-03-01T12:00:00.000Z',
    };

    const result = generateTimeline(profile, [], [], 60);
    const allDays = result.flatMap((m) => m.days).filter((d) => d.balance !== null);

    const day4 = allDays.find((d) => d.date.startsWith('2026-03-04'));
    const day5 = allDays.find((d) => d.date.startsWith('2026-03-05'));
    const day6 = allDays.find((d) => d.date.startsWith('2026-03-06'));

    expect(day4).toBeDefined();
    expect(day5).toBeDefined();
    expect(day6).toBeDefined();

    expect(day5!.balance!).toBeLessThan(day4!.balance!);
    expect(day6!.balance).toBe(day5!.balance);
  });

  it('EDGE : Année bissextile — événement le 31 février → tombe le 28', () => {
    const profile: Profile = {
      id: 'test',
      userId: 'u1',
      firstName: 'Test',
      age: 30,
      persona: UserPersona.SALARIED,
      mode: 'beginner',
      household: { adults: 1, children: 0 },
      housing: { status: HousingStatus.TENANT, monthlyCost: 800, paymentDay: 5 },
      housingCost: 800,
      housingPaymentDay: 5,
      adults: 1,
      children: 0,
      housingStatus: HousingStatus.TENANT,
      funBudget: 200,
      savings: 5000,
      investedAmount: 0,
      investmentYield: 5,
      currentBalance: 5000,
      monthlyIncome: 3000,
      items: [],
      assets: [],
      goals: [],
      decisions: [],
      variableCosts: [],
      incomes: [
        {
          id: 'inc1',
          profileId: 'test',
          name: 'Salaire',
          amount: 3000,
          category: ItemCategory.INCOME,
          dayOfMonth: 1,
          frequency: Frequency.MONTHLY,
          createdAt: new Date(),
        },
      ],
      fixedCosts: [
        {
          id: 'fix1',
          profileId: 'test',
          name: 'Prime 31',
          amount: 500,
          category: ItemCategory.FIXED_COST,
          dayOfMonth: 31,
          frequency: Frequency.MONTHLY,
          createdAt: new Date(),
        },
      ],
      subscriptions: [],
      credits: [],
      annualExpenses: [],
      savingsContributions: [],
      investments: [],
      updatedAt: '2026-02-01T12:00:00.000Z',
    };

    const result = generateTimeline(profile, [], [], 60);
    const febDays = result.find((m) => m.id === '2026-02')?.days ?? [];
    const day28 = febDays.find((d) => d.dayOfMonth === 28);

    expect(day28).toBeDefined();
    const primeEvent = day28!.events.find((e) => e.name === 'Prime 31');
    expect(primeEvent).toBeDefined();
    expect(primeEvent!.amount).toBe(-500);
  });

  it('Jours avant anchor : balance = null', () => {
    const profile = {
      ...minimalProfile,
      currentBalance: 2000,
      updatedAt: '2026-03-15T12:00:00.000Z',
    };

    const result = generateTimeline(profile, [], [], 30);
    const allDays = result.flatMap((m) => m.days);

    const dateStr = (d: { date: string }) => d.date.split('T')[0];
    const beforeAnchor = allDays.filter((d) => dateStr(d) < '2026-03-15');
    const anchorAndAfter = allDays.filter((d) => dateStr(d) >= '2026-03-15');

    beforeAnchor.forEach((day) => expect(day.balance).toBeNull());
    anchorAndAfter.forEach((day) => {
      expect(day.balance).not.toBeNull();
      expect(typeof day.balance).toBe('number');
    });
  });
});

// ============================================================================
// C.3 — analyzePurchaseImpact (Blind & Logic)
// ============================================================================

describe('C.3 — analyzePurchaseImpact (Blind & Logic)', () => {
  const baseStats: BudgetResult = { ...defaultBudgetResult };

  it('Achat cash OK : remainingToLive - amount >= minLiving → verdict green', () => {
    const amount = 100;
    const remainingToLive = 800;
    const minLiving = 100;
    const newRemainingToLive = remainingToLive - amount;
    const expectedVerdict = newRemainingToLive >= minLiving ? 'green' : 'orange';

    const purchase: Purchase = {
      name: 'Petit achat',
      amount,
      paymentMode: PaymentMode.CASH_CURRENT,
      date: new Date('2026-04-01'),
    };

    const result = analyzePurchaseImpact(baseStats, purchase);

    expect(result.verdict).toBe(expectedVerdict);
    expect(result.smartTitle).toBe('Fonce !');
  });

  it('Achat CASH_SAVINGS dépassant matelas → newMatelas = 0, verdict red', () => {
    const amount = 6000;
    const matelas = 5000;
    const expectedNewMatelas = 0;
    const expectedNewSafetyMonths = 0;

    const stats: BudgetResult = { ...baseStats, matelas };
    const purchase: Purchase = {
      name: 'Gros retrait épargne',
      amount,
      paymentMode: PaymentMode.CASH_SAVINGS,
      date: new Date('2026-04-01'),
    };

    const result = analyzePurchaseImpact(stats, purchase);

    expect(result.newMatelas).toBe(expectedNewMatelas);
    expect(result.newSafetyMonths).toBe(expectedNewSafetyMonths);
    expect(result.verdict).toBe('red');
    expect(result.smartTitle).toBe('Pas assez de côté');
    expect(result.issues.some((i) => /matelas passerait|mois de sécu/i.test(i.text))).toBe(true);
  });

  it('INVARIANT CRÉDIT : realCost = capital + creditCost (annuité constante)', () => {
    const principal = 10000;
    const rate = 5;
    const months = 48;

    const expectedTotal = expectedAnnuityTotal(principal, rate, months);
    const expectedCreditCost = expectedTotal - principal;

    const purchase: Purchase = {
      name: 'Crédit test',
      amount: principal,
      paymentMode: PaymentMode.CREDIT,
      duration: months,
      rate,
      date: new Date('2026-04-01'),
    };

    const result = analyzePurchaseImpact(baseStats, purchase);

    expect(result.creditCost).toBeCloseTo(expectedCreditCost, 0);
    expect(result.realCost).toBeCloseTo(expectedTotal, 0);
    expect(result.realCost).toBe(principal + result.creditCost);
  });

  it('Achat remboursable → realCost = 0, opportunityCost = 0', () => {
    const expectedRealCost = 0;
    const expectedOpportunityCost = 0;

    const purchase: Purchase = {
      name: 'Note de frais',
      amount: 500,
      paymentMode: PaymentMode.CASH_CURRENT,
      date: new Date('2026-04-01'),
      isReimbursable: true,
    };

    const result = analyzePurchaseImpact(baseStats, purchase);

    expect(result.realCost).toBe(expectedRealCost);
    expect(result.opportunityCost).toBe(expectedOpportunityCost);
  });

  it('Achat passé → verdict green "Mis à jour"', () => {
    const purchase: Purchase = {
      name: 'Achat historique',
      amount: 1000,
      paymentMode: PaymentMode.CASH_CURRENT,
      date: new Date('2024-01-01'),
    };

    const result = analyzePurchaseImpact(baseStats, purchase);

    expect(result.verdict).toBe('green');
    expect(result.smartTitle).toBe('Mis à jour');
  });

  it('newSafetyMonths = newMatelas / burnRate (calcul théorique)', () => {
    const matelas = 5000;
    const safetyMonths = 4;
    const burnRate = matelas / safetyMonths;
    const amount = 2500;
    const newMatelas = matelas - amount;
    const expectedNewSafetyMonths = newMatelas / burnRate;

    const stats: BudgetResult = { ...baseStats, matelas, safetyMonths };
    const purchase: Purchase = {
      name: 'Retrait épargne',
      amount,
      paymentMode: PaymentMode.CASH_SAVINGS,
      date: new Date('2026-04-01'),
    };

    const result = analyzePurchaseImpact(stats, purchase);

    expect(result.newSafetyMonths).toBeCloseTo(expectedNewSafetyMonths, 1);
  });
});

