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

// ✅ NOUVELLE LISTE OFFICIELLE DES ACTIFS (Single Source of Truth)
// app/lib/definitions.ts

// ... (Le début du fichier ne change pas)

// ✅ NOUVELLE LISTE OFFICIELLE DES ACTIFS (Single Source of Truth)
export const ASSET_TYPES = [
  // --- LIQUIDITÉS ---
  { id: 'cc',         label: 'Compte Courant',      category: 'LIQUIDITY', color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-300' },

  // --- BOURSE & RETRAITE ---
  { id: 'pea',        label: 'PEA / PEA-PME',       category: 'BOURSE', color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { id: 'av',         label: 'Assurance Vie',       category: 'BOURSE', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'cto',        label: 'Compte Titres (CTO)', category: 'BOURSE', color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-200' },
  { id: 'per',        label: 'PER (Retraite)',      category: 'BOURSE', color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  
  // --- ÉPARGNE ---
  { id: 'livret',     label: 'Livrets (A/LDDS)',    category: 'CASH',   color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  // ✅ AJOUT DU LEP ICI
  { id: 'lep',        label: 'LEP (Épargne Pop.)',  category: 'CASH',   color: 'text-pink-600',    bg: 'bg-pink-50',    border: 'border-pink-200' },
  { id: 'pel',        label: 'PEL / CEL',           category: 'CASH',   color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-300' },
  { id: 'pee',        label: 'Épargne Salariale',   category: 'CASH',   color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },

  // --- IMMOBILIER ---
  { id: 'immo_paper', label: 'SCPI / SIIC',         category: 'IMMO',   color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  { id: 'crowd',      label: 'Crowdfunding',        category: 'IMMO',   color: 'text-lime-600',    bg: 'bg-lime-50',    border: 'border-lime-200' },
  { id: 'immo_phys',  label: 'Immo. Locatif',       category: 'IMMO',   color: 'text-amber-700',   bg: 'bg-amber-100',  border: 'border-amber-300' },

  // --- ALTERNATIF ---
  { id: 'crypto',     label: 'Crypto / Web3',       category: 'EXOTIC', color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  { id: 'gold',       label: 'Or / Montres / Art',  category: 'EXOTIC', color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200' },
] as const;

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
// 2. TYPES DE BASE
// ============================================================================

export type GoalCategoryKey = keyof typeof GOAL_CATEGORIES;

export interface FinancialItem {
  id: string;
  name: string;
  amount: number | string;
  frequency?: 'mensuel' | 'annuel';
  dayOfMonth?: number | string;
}

// ✅ TYPAGE STRONGLY TYPED BASÉ SUR LA CONSTANTE
export interface Investment {
  id: string;
  // On autorise les IDs définis ci-dessus, ou une string libre pour la flexibilité
  type: typeof ASSET_TYPES[number]['id'] | string;
  name: string;
  amount: number | string;
  performance?: number;
}

export interface Housing {
  status: 'tenant' | 'owner_loan' | 'owner_paid' | 'free';
  monthlyCost: number; 
  marketValue?: number;
}

export interface GoalStrategy {
  type: 'TIME' | 'BUDGET' | 'HYBRID' | 'INCOME';
  title: string;
  description?: string; // Optionnel car parfois c'est 'message'
  message?: string;
  value?: number | Date | string;
  painLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
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

// ============================================================================
// 3. PROFIL UTILISATEUR
// ============================================================================

export interface Profile {
  firstName?: string;
  age?: number | string;
  mode: 'beginner' | 'expert';
  persona: string;
  
  household: Household;
  housing?: Housing;
  
  updatedAt?: string;
  balanceDate?: string;
  
  // Stock (Patrimoine)
  savings: number | string; 
  investments: Investment[]; 
  investedAmount?: number | string;
  currentBalance: number | string;
  
  // Flux (Budget)
  investmentYield: number | string; 
  monthlyIncome?: number; 
  variableCosts: FinancialItem[]; // Corrigé : c'est bien un tableau
  
  // Listes
  incomes: FinancialItem[];
  fixedCosts: FinancialItem[];
  subscriptions: FinancialItem[];
  credits: FinancialItem[];
  savingsContributions: FinancialItem[];
  annualExpenses: FinancialItem[];
  goals?: Goal[];
  
  // Budget Split
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

// ============================================================================
// 4. TYPES D'ANALYSE (Docteur Financier)
// ============================================================================

export type OpportunityLevel = 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
export type OpportunityType = 'SAVINGS' | 'DEBT' | 'INVESTMENT' | 'BUDGET';

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
  potentialGain?: number;
  actionLabel?: string;
  link?: string;       
  guide?: ActionGuide;  
}

export interface DeepAnalysis {
  globalScore: number;
  tags: string[];
  ratios: { needs: number; wants: number; savings: number; };
  opportunities: OptimizationOpportunity[];
  projections: { 
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
      message?: string; // message est optionnel
  }[];
  budget: { 
      income: number; 
      fixed: number; 
      
      // AJOUTS POUR LOGIC.TS COMPATIBILITÉ
      variable: number; 
      variableExpenses: number;

      capacity: number; 
      remainingToLive: number; 
      totalRecurring: number; 
      monthlyIncome: number; 
      mandatoryExpenses: number; 
      discretionaryExpenses: number; 
      
      capacityToSave: number; 
      
      // [CRITIQUE 1] La vraie capacité (Revenus - Charges)
      rawCapacity: number; 
      
      // [CRITIQUE 2 - CELUI QU'IL MANQUAIT] Le Solde après investissement
      endOfMonthBalance: number;

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
      currentBalance: number; 
  };
  freeCashFlow: number; 
  diagnosis?: DeepAnalysis;
  usedRates?: any; 
}

// ============================================================================
// 5. OBJETS INITIAUX (PRESETS & DEFAULT)
// ============================================================================

export const PERSONA_PRESETS: Record<string, { id: string, label: string, description: string, rules: PersonaRules }> = {
  STUDENT:    { id: 'student',    label: 'Étudiant(e)',         description: 'Budget serré, flexible.',     rules: { safetyMonths: 1, maxDebt: 40, minLiving: 100 } },
  SALARIED:   { id: 'salaried',   label: 'Salarié / Stable',      description: 'Revenus réguliers.',          rules: { safetyMonths: 3, maxDebt: 35, minLiving: 300 } },
  FREELANCE:  { id: 'freelance',  label: 'Indépendant',          description: 'Revenus variables, risque.',    rules: { safetyMonths: 6, maxDebt: 30, minLiving: 500 } },
  RETIIRED:   { id: 'retired',    label: 'Retraité(e)',          description: 'Revenus fixes, préservation.',  rules: { safetyMonths: 6, maxDebt: 25, minLiving: 400 } },
  UNEMPLOYED: { id: 'unemployed', label: 'En recherche',          description: 'Revenus précaires, prudence.',  rules: { safetyMonths: 6, maxDebt: 0, minLiving: 200 } }
};

export const INITIAL_PROFILE: Profile = {
  firstName: '', 
  age: 0, 
  mode: 'beginner', 
  persona: 'salaried', 
  household: { adults: 1, children: 0 },
  housing: { status: 'tenant', monthlyCost: 0, marketValue: 0 }, 
  
  savings: 0, 
  investments: [], 
  investedAmount: 0, 
  investmentYield: 5, 
  currentBalance: 0, 
  
  // [CORRECTION] Initialisé comme tableau vide, pas "0"
  variableCosts: [], 
  
  monthlyIncome: 0,
  
  incomes: [], 
  fixedCosts: [], 
  subscriptions: [], 
  credits: [], 
  savingsContributions: [], 
  annualExpenses: [], 
  goals: [], 
};

// ============================================================================
// 6. UTILITAIRES
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
  if (!Array.isArray(items)) return 0; 
  
  return items.reduce((acc, item) => {
    let amount = Math.abs(safeFloat(item.amount));
    if (item.frequency === 'annuel') amount = amount / 12;
    return acc + amount;
  }, 0);
};