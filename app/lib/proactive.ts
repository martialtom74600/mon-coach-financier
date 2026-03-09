/**
 * proactive.ts — Moteur proactif d'insights financiers
 *
 * Analyse le profil et le budget pour générer des insights datés :
 * - detectDanger : alertes de découvert imminent
 * - detectDrift : dérive par rapport à la projection précédente
 * - detectMilestones : jalons atteints (matelas, objectifs)
 *
 * Invariants métier : Survie > Sécurité > Croissance (aligné sur engine.ts)
 */

import type { Profile, BudgetResult } from './definitions';
import { safeFloat, formatCurrency } from './definitions';
import { UserPersona } from '@prisma/client';

// ============================================================================
// 1. TYPES & CONSTANTES
// ============================================================================

const THRESHOLDS = {
  SURVIVAL_BUFFER: 1000,
  DANGER_BALANCE_RATIO: 0.3, // alerte si solde projeté < 30% du matelas
  DRIFT_THRESHOLD: 0.15, // dérive > 15% par rapport à la projection
};

export type InsightType = 'DANGER' | 'DRIFT' | 'MILESTONE';
export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface ProactiveInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  message: string;
  date: string; // ISO date
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 2. DETECT DANGER — Découvert imminent
// ============================================================================

/**
 * Détecte les alertes de découvert imminent.
 * Alerte si : endOfMonthBalance < 0, ou matelas < SURVIVAL_BUFFER, ou solde < 30% du matelas.
 * Respecte la hiérarchie Survie > Sécurité.
 */
export function detectDanger(
  _profile: Profile,
  budget: BudgetResult
): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const now = new Date().toISOString().slice(0, 10);

  const endOfMonthBalance = budget.endOfMonthBalance;
  const rawCapacity = budget.rawCapacity;
  const matelas = safeFloat(budget.matelas);
  const currentBalance = safeFloat(budget.currentBalance);

  // Porte 1 : Déficit structurel (DANGER absolu)
  if (endOfMonthBalance < 0 && rawCapacity < 0) {
    insights.push({
      id: 'danger_deficit',
      type: 'DANGER',
      severity: 'critical',
      message: `Déficit structurel de ${formatCurrency(rawCapacity)}. Vos charges dépassent vos revenus.`,
      date: now,
      metadata: { rawCapacity, endOfMonthBalance },
    });
    return insights; // early return
  }

  // Porte 2 : Surchauffe (investissement trop élevé par rapport aux moyens)
  if (endOfMonthBalance < 0 && rawCapacity >= 0) {
    insights.push({
      id: 'danger_overheat',
      type: 'DANGER',
      severity: 'critical',
      message: `Fin de mois en négatif. Vous investissez trop (${formatCurrency(budget.profitableExpenses)}) par rapport à vos moyens.`,
      date: now,
      metadata: { rawCapacity, endOfMonthBalance },
    });
    return insights;
  }

  // Porte 3 : Matelas inexistant
  if (matelas < THRESHOLDS.SURVIVAL_BUFFER) {
    insights.push({
      id: 'danger_no_matelas',
      type: 'DANGER',
      severity: 'critical',
      message: `Pas d'épargne de précaution (${formatCurrency(matelas)}). Visez au moins ${formatCurrency(THRESHOLDS.SURVIVAL_BUFFER)}.`,
      date: now,
      metadata: { matelas, threshold: THRESHOLDS.SURVIVAL_BUFFER },
    });
    return insights;
  }

  // Porte 4 : Solde courant < 30% du matelas (risque de découvert imminent)
  const minSafeBalance = matelas * THRESHOLDS.DANGER_BALANCE_RATIO;
  if (currentBalance < minSafeBalance && currentBalance >= 0) {
    insights.push({
      id: 'danger_low_balance',
      type: 'DANGER',
      severity: 'warning',
      message: `Solde courant (${formatCurrency(currentBalance)}) proche du seuil critique. Matelas : ${formatCurrency(matelas)}.`,
      date: now,
      metadata: { currentBalance, matelas, minSafeBalance },
    });
  }

  return insights;
}

// ============================================================================
// 3. DETECT DRIFT — Dérive par rapport à la projection
// ============================================================================

/**
 * Détecte la dérive par rapport au budget précédent.
 * Alerte si : matelas, endOfMonthBalance ou netCashflow ont dérivé de plus de 15%.
 */
export function detectDrift(
  _profile: Profile,
  budget: BudgetResult,
  previousBudget: BudgetResult | null
): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  const now = new Date().toISOString().slice(0, 10);

  if (!previousBudget) return insights;

  const prevMatelas = safeFloat(previousBudget.matelas);
  const currMatelas = safeFloat(budget.matelas);
  const prevBalance = previousBudget.endOfMonthBalance;
  const currBalance = budget.endOfMonthBalance;
  const prevCashflow = previousBudget.realCashflow;
  const currCashflow = budget.realCashflow;

  const driftMatelas =
    prevMatelas > 0
      ? Math.abs(currMatelas - prevMatelas) / prevMatelas
      : 0;
  const driftBalance =
    Math.abs(prevBalance) > 0
      ? Math.abs(currBalance - prevBalance) / Math.abs(prevBalance)
      : 0;
  const driftCashflow =
    Math.abs(prevCashflow) > 0
      ? Math.abs(currCashflow - prevCashflow) / Math.abs(prevCashflow)
      : 0;

  if (driftMatelas >= THRESHOLDS.DRIFT_THRESHOLD && currMatelas < prevMatelas) {
    insights.push({
      id: 'drift_matelas_down',
      type: 'DRIFT',
      severity: 'warning',
      message: `Votre matelas a baissé de ${formatCurrency(prevMatelas - currMatelas)} (${Math.round(driftMatelas * 100)}% de dérive).`,
      date: now,
      metadata: { prevMatelas, currMatelas, drift: driftMatelas },
    });
  }

  if (
    driftBalance >= THRESHOLDS.DRIFT_THRESHOLD &&
    currBalance < prevBalance &&
    prevBalance > 0
  ) {
    insights.push({
      id: 'drift_balance_down',
      type: 'DRIFT',
      severity: 'warning',
      message: `Votre solde de fin de mois a diminué (${formatCurrency(prevBalance)} → ${formatCurrency(currBalance)}).`,
      date: now,
      metadata: { prevBalance, currBalance, drift: driftBalance },
    });
  }

  if (
    driftCashflow >= THRESHOLDS.DRIFT_THRESHOLD &&
    currCashflow < prevCashflow &&
    prevCashflow > 0
  ) {
    insights.push({
      id: 'drift_cashflow_down',
      type: 'DRIFT',
      severity: 'info',
      message: `Votre capacité d'épargne a diminué (${formatCurrency(prevCashflow)} → ${formatCurrency(currCashflow)}).`,
      date: now,
      metadata: { prevCashflow, currCashflow, drift: driftCashflow },
    });
  }

  return insights;
}

// ============================================================================
// 4. DETECT MILESTONES — Jalons atteints
// ============================================================================

/**
 * Détecte les jalons positifs (matelas atteint).
 * Retourne au plus un insight : le palier le plus élevé atteint.
 */
export function detectMilestones(
  profile: Profile,
  budget: BudgetResult
): ProactiveInsight[] {
  const now = new Date().toISOString().slice(0, 10);

  const matelas = safeFloat(budget.matelas);
  const needsTotal =
    budget.fixed + (budget.variableExpenses ?? budget.variable);
  const discretionary = Math.min(budget.discretionaryExpenses ?? 0, 500);
  const isFreelance = profile.persona === UserPersona.FREELANCE;
  const targetMonths = isFreelance ? 6 : 3;
  const idealSafety = (needsTotal + discretionary) * targetMonths;
  const oneMonth = needsTotal + discretionary;

  // Priorité : 3/6 mois > 1 mois > 1000€
  if (idealSafety > 0 && matelas >= idealSafety) {
    return [
      {
        id: 'milestone_matelas',
        type: 'MILESTONE',
        severity: 'success',
        message: `Ton matelas a atteint ${targetMonths} mois (${formatCurrency(matelas)}) !`,
        date: now,
        metadata: { matelas, targetMonths, idealSafety },
      },
    ];
  }
  if (oneMonth > 0 && matelas >= oneMonth) {
    return [
      {
        id: 'milestone_one_month',
        type: 'MILESTONE',
        severity: 'success',
        message: `Ton matelas couvre 1 mois de charges (${formatCurrency(matelas)}) ! Continue vers ${targetMonths} mois.`,
        date: now,
        metadata: { matelas, oneMonth },
      },
    ];
  }
  if (matelas >= THRESHOLDS.SURVIVAL_BUFFER) {
    return [
      {
        id: 'milestone_survival_buffer',
        type: 'MILESTONE',
        severity: 'success',
        message: `Tu as dépassé le seuil de sécurité de ${formatCurrency(THRESHOLDS.SURVIVAL_BUFFER)}.`,
        date: now,
        metadata: { matelas },
      },
    ];
  }
  return [];
}

// ============================================================================
// 5. AGGREGATE — Tous les insights
// ============================================================================

/**
 * Agrège tous les insights proactifs.
 */
export function generateProactiveInsights(
  profile: Profile,
  budget: BudgetResult,
  previousBudget: BudgetResult | null = null
): ProactiveInsight[] {
  const danger = detectDanger(profile, budget);
  const drift = detectDrift(profile, budget, previousBudget);
  const milestones = detectMilestones(profile, budget);

  // Priorité : DANGER > DRIFT > MILESTONE
  // Si danger, on ne noie pas avec des milestones
  if (danger.length > 0) {
    return [...danger];
  }
  return [...drift, ...milestones];
}
