// app/lib/types.ts

// ============================================================================
// 1. LES BRIQUES DE BASE
// ============================================================================

// Un élément financier simple (Revenu, Facture, Abonnement...)
export interface FinancialItem {
  id: string;
  name: string;
  amount: number | string; // Accepte string (formulaire) et number (calcul)
  frequency?: 'mensuel' | 'annuel';
  dayOfMonth?: number | string;
}

// ============================================================================
// 2. LES OBJECTIFS (GOALS)
// ============================================================================

export type GoalCategory = 'REAL_ESTATE' | 'VEHICLE' | 'TRAVEL' | 'WEDDING' | 'EMERGENCY' | 'OTHER';

export interface GoalStrategy {
  type: 'TIME' | 'BUDGET' | 'HYBRID' | 'INCOME';
  title: string;
  description: string;
  value?: number | Date | string;
  painLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  message?: string;
  disabled?: boolean;
  newDate?: string; // Format ISO
  actionLabel?: string;
}

export interface GoalDiagnosis {
  status: 'DONE' | 'POSSIBLE' | 'HARD' | 'IMPOSSIBLE' | 'EASY';
  label: string;
  color: string;
  mainMessage: string;
  gap?: number;
  strategies: GoalStrategy[];
}

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory | string;
  targetAmount: number | string;
  currentSaved: number | string;
  deadline: string; // Format ISO YYYY-MM-DD
  projectedYield: number | string;
  isInvested?: boolean;
  
  // Propriétés calculées (optionnelles car pas en base de données)
  monthlyNeed?: number;
  diagnosis?: GoalDiagnosis;
}

// ============================================================================
// 3. LE PROFIL UTILISATEUR COMPLET
// ============================================================================

export interface Household {
  adults: number | string;
  children: number | string;
}

export interface PersonaRules {
  safetyMonths: number;
  maxDebt: number;
  minLiving: number;
}

export interface Profile {
  // Identité
  firstName?: string;
  mode: 'beginner' | 'expert';
  persona: string; // 'salaried', 'student', etc.
  household: Household;
  updatedAt?: string;
  balanceDate?: string;

  // Patrimoine (Stocks)
  savings: number | string;      // Épargne Dispo
  investments: number | string;  // Épargne Bloquée
  investmentYield: number | string; 
  currentBalance: number | string; // Solde Compte Courant

  // Budget (Flux)
  variableCosts: number | string; // Budget vie courante

  // Listes
  incomes: FinancialItem[];
  fixedCosts: FinancialItem[];
  subscriptions: FinancialItem[];
  credits: FinancialItem[];
  savingsContributions: FinancialItem[];
  annualExpenses: FinancialItem[];
  
  // Objectifs
  goals?: Goal[];
}

// ============================================================================
// 4. SIMULATION D'ACHAT
// ============================================================================

export type PaymentMode = 'CASH_SAVINGS' | 'CASH_ACCOUNT' | 'SPLIT' | 'CREDIT' | 'SUBSCRIPTION';

export interface Purchase {
  name: string;
  type: string; // 'need', 'useful', 'desire'
  amount: number | string;
  date: string; // ISO Date
  paymentMode: PaymentMode | string;
  duration?: number | string;
  rate?: number | string;
  isReimbursable?: boolean;
  isPro?: boolean;
}

// Le résultat de l'analyseur (Verdict)
export interface AnalysisResult {
  verdict: 'green' | 'orange' | 'red';
  score: number;
  smartTitle: string;
  smartMessage: string;
  isBudgetOk: boolean;
  isCashflowOk: boolean;
  newMatelas: number;
  newRV: number;
  lowestProjectedBalance: number;
  issues: any[]; // On pourra typer plus finement plus tard (ex: {level: string, text: string})
  tips: any[];
  projectedCurve: { date: string; value: number }[];
  
  // Champs additionnels
  newSafetyMonths: number;
  newEngagementRate: number;
  realCost: number;
  creditCost: number;
  opportunityCost: number;
  timeToWork: number;
}