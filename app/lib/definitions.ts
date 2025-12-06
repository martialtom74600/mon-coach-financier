// app/lib/definitions.ts

// ============================================================================
// 1. CONSTANTES & CONFIGURATION
// ============================================================================

export const STORAGE_KEY = 'financial_coach_data_v1';

export const CONSTANTS = {
  AVG_WORK_DAYS_MONTH: 21.6, 
  SAFE_SAVINGS_RATE: 0.03,
  INVESTMENT_RATE: 0.07,
  INFLATION_RATE: 0.02,
  WEALTHY_THRESHOLD: 12,
  BUFFER_RATIO: 0.10, // 10% de marge de sécurité
};

export const GOAL_CATEGORIES = {
  SAFETY:      { id: 'SAFETY',      priority: 1, label: 'Matelas de Sécurité', icon: '🛡️', description: 'Épargne de précaution' },
  REAL_ESTATE: { id: 'REAL_ESTATE', priority: 2, label: 'Immobilier',          icon: '🏠', description: 'Achat résidence' },
  DEBT:        { id: 'DEBT',        priority: 2, label: 'Dette',               icon: '💳', description: 'Remboursement' },
  VEHICLE:     { id: 'VEHICLE',     priority: 3, label: 'Véhicule',            icon: '🚗', description: 'Voiture, Moto' },
  TRAVEL:      { id: 'TRAVEL',      priority: 3, label: 'Voyage',              icon: '✈️', description: 'Vacances' },
  WEDDING:     { id: 'WEDDING',     priority: 3, label: 'Événement',           icon: '💍', description: 'Mariage' },
  OTHER:       { id: 'OTHER',       priority: 3, label: 'Autre Projet',        icon: '🎯', description: 'Divers' },
  FINANCE:     { id: 'FINANCE',     priority: 4, label: 'Bourse / Crypto',     icon: '📈', description: 'Investissement' },
  RETIREMENT:  { id: 'RETIREMENT',  priority: 4, label: 'Retraite',            icon: '🌴', description: 'Long terme' },
} as const;

export const PURCHASE_TYPES = {
  NEED:   { id: 'need',   label: 'Besoin Vital',    description: 'Nourriture, Santé', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  USEFUL: { id: 'useful', label: 'Confort / Utile', description: 'Gain de temps',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  DESIRE: { id: 'desire', label: 'Envie / Plaisir', description: 'Loisirs, Mode',     color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

export const PAYMENT_MODES = {
  CASH_SAVINGS: 'Épargne (Je tape dans le stock)',
  CASH_ACCOUNT: 'Compte Courant (Je paie avec le salaire)',
  SPLIT:        'Paiement 3x/4x (Dette court terme)',
  CREDIT:       'Crédit / LOA (Dette long terme)',
  SUBSCRIPTION: 'Abonnement (Charge fixe)',
};

// ============================================================================
// 2. TYPES
// ============================================================================

export type GoalCategoryKey = keyof typeof GOAL_CATEGORIES;

export interface FinancialItem {
  id: string;
  name: string;
  amount: number | string;
  frequency?: 'mensuel' | 'annuel';
  dayOfMonth?: number | string;
}

export interface GoalStrategy {
  type: 'TIME' | 'BUDGET' | 'HYBRID' | 'INCOME';
  title: string;
  description: string;
  value?: number | Date | string;
  painLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  message?: string;
  disabled?: boolean;
  newDate?: string; 
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
  category: GoalCategoryKey;
  targetAmount: number | string;
  currentSaved: number | string;
  deadline: string; 
  projectedYield: number | string;
  isInvested?: boolean;
  transferDay?: number;
  monthlyNeed?: number;
  diagnosis?: GoalDiagnosis;
  monthlyContribution?: number;
}

export interface Household { adults: number | string; children: number | string; }
export interface PersonaRules { safetyMonths: number; maxDebt: number; minLiving: number; }

export interface Profile {
  firstName?: string;
  mode: 'beginner' | 'expert';
  persona: string;
  household: Household;
  updatedAt?: string;
  balanceDate?: string;
  savings: number | string;
  investments: number | string;
  investmentYield: number | string; 
  currentBalance: number | string;
  monthlyIncome?: number; 
  variableCosts: number | string;
  incomes: FinancialItem[];
  fixedCosts: FinancialItem[];
  subscriptions: FinancialItem[];
  credits: FinancialItem[];
  savingsContributions: FinancialItem[];
  annualExpenses: FinancialItem[];
  goals?: Goal[];
  // Nouveaux champs pour le split variable (optionnels pour compatibilité)
  foodBudget?: number | string;
  funBudget?: number | string;
}

export interface Purchase {
  name: string;
  type: string; 
  amount: number | string;
  date: string;
  paymentMode: keyof typeof PAYMENT_MODES | string;
  duration?: number | string;
  rate?: number | string;
  isReimbursable?: boolean;
  isPro?: boolean;
}

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
  issues: any[];
  tips: any[];
  projectedCurve: { date: string; value: number }[];
  newSafetyMonths: number;
  newEngagementRate: number;
  realCost: number;
  creditCost: number;
  opportunityCost: number;
  timeToWork: number;
}

// --- NOUVEAU : TYPES DU DOCTEUR FINANCIER & ACTIONS ---

export type OpportunityLevel = 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
export type OpportunityType = 'SAVINGS' | 'DEBT' | 'INVESTMENT' | 'BUDGET';

// Structure pour le contenu éducatif (Modale)
export interface ActionGuide {
  title: string;
  definition: string;
  steps: string[];
  tips: string[];
}

export interface OptimizationOpportunity {
  id: string;
  type: OpportunityType;
  level: OpportunityLevel;
  title: string;
  message: string;
  actionLabel?: string;
  potentialGain?: number;
  // Câblage des actions :
  link?: string;        // Redirection interne (ex: /profile)
  guide?: ActionGuide;  // Ouverture modale éducative
}

export interface DeepAnalysis {
  globalScore: number;
  tags: string[];
  ratios: { needs: number; wants: number; savings: number; };
  opportunities: OptimizationOpportunity[];
  // Ajout des projections pour l'affichage V5
  projections?: { 
    wealth10y: number; 
    wealth20y: number; 
    fireYear: number; 
  };
}

export interface SimulationResult {
  allocations: { 
      id: string; 
      name: string;
      tier: 'SAFETY' | 'HARD' | 'SOFT' | 'GROWTH';
      allocatedEffort: number; 
      requestedEffort: number;
      status: 'FULL'|'PARTIAL'|'STARVED';
      fillRate: number;
      message: string;
  }[];
  budget: { 
      income: number; 
      fixed: number; 
      capacity: number; 
      remainingToLive: number; 
      totalRecurring: number; 
      monthlyIncome: number; 
      mandatoryExpenses: number; 
      discretionaryExpenses: number; 
      capacityToSave: number; 
      matelas: number; 
      rules: PersonaRules; 
      securityBuffer: number; 
      availableForProjects: number;
      profitableExpenses: number;
      totalGoalsEffort: number;
      realCashflow: number;
      investments: number;
      totalWealth: number;
      safetyMonths: number;
      engagementRate: number;
  };
  freeCashFlow: number; 
  diagnosis?: DeepAnalysis; 
}

// ============================================================================
// 3. OBJETS COMPLEXES
// ============================================================================

export const PERSONA_PRESETS: Record<string, { id: string, label: string, description: string, rules: PersonaRules }> = {
  STUDENT:    { id: 'student',    label: 'Étudiant(e)',           description: 'Budget serré, flexible.',       rules: { safetyMonths: 1, maxDebt: 40, minLiving: 100 } },
  SALARIED:   { id: 'salaried',   label: 'Salarié / Stable',      description: 'Revenus réguliers.',            rules: { safetyMonths: 3, maxDebt: 35, minLiving: 300 } },
  FREELANCE:  { id: 'freelance',  label: 'Indépendant',           description: 'Revenus variables, risque.',    rules: { safetyMonths: 6, maxDebt: 30, minLiving: 500 } },
  RETIRED:    { id: 'retired',    label: 'Retraité(e)',           description: 'Revenus fixes, préservation.',  rules: { safetyMonths: 6, maxDebt: 25, minLiving: 400 } },
  UNEMPLOYED: { id: 'unemployed', label: 'En recherche',          description: 'Revenus précaires, prudence.',  rules: { safetyMonths: 6, maxDebt: 0, minLiving: 200 } }
};

export const INITIAL_PROFILE: Profile = {
  firstName: '', mode: 'beginner', persona: 'salaried', household: { adults: 1, children: 0 },
  savings: 0, investments: 0, investmentYield: 5, currentBalance: 0, variableCosts: 0, monthlyIncome: 0,
  incomes: [], fixedCosts: [], subscriptions: [], credits: [], savingsContributions: [], annualExpenses: [], goals: [], 
};

// ============================================================================
// 4. UTILITAIRES
// ============================================================================

export const generateId = (): string => Math.random().toString(36).substr(2, 9);

export const safeFloat = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = String(val).replace(/[\s\u00A0]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCurrency = (amount: number | string): string => {
  const num = safeFloat(amount);
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
};

export const calculateFutureValue = (principal: number, rate: number, years: number): number => {
  return principal * Math.pow((1 + rate), years);
};

export const calculateListTotal = (items: FinancialItem[]): number => {
  return (items || []).reduce((acc, item) => {
    let amount = Math.abs(safeFloat(item.amount));
    if (item.frequency === 'annuel') amount = amount / 12;
    return acc + amount;
  }, 0);
};