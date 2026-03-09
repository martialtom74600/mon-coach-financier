// app/lib/definitions.ts
import { 
  FinancialGoal as PrismaGoal, 
  PurchaseDecision as PrismaDecision, 
  FinancialItem as PrismaItem, 
  Asset as PrismaAsset,
  Prisma,
  UserPersona,
  HousingStatus,
  ItemCategory,
  AssetType,
  GoalCategory,
  PurchaseType,
  PaymentMode,
  Frequency
} from '@prisma/client';

// ============================================================================
// 0. UTILITAIRE DECIMAL → NUMBER (Migration Float → Decimal)
// ============================================================================

// Convertit les champs Prisma.Decimal en number au niveau des types
type SerializedDecimal<T> = {
  [K in keyof T]: T[K] extends Prisma.Decimal
    ? number
    : T[K] extends Prisma.Decimal | null
    ? number | null
    : T[K];
};

// Convertit récursivement les instances Prisma.Decimal en number à l'exécution
export function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Prisma.Decimal) return obj.toNumber() as unknown as T;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(item => serializeDecimals(item)) as unknown as T;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeDecimals(val);
    }
    return result as T;
  }
  return obj;
}

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
  BUFFER_RATIO: 0.10, 
};

// ✅ CONFIGURATION VISUELLE DES CATÉGORIES (Basé sur Enum Prisma)
export const GOAL_CATEGORIES: Record<GoalCategory, { id: GoalCategory, priority: number, label: string, icon: string, description: string }> = {
  EMERGENCY:   { id: 'EMERGENCY',   priority: 1, label: 'Matelas de Sécurité', icon: '🛡️', description: 'Épargne de précaution' },
  REAL_ESTATE: { id: 'REAL_ESTATE', priority: 2, label: 'Immobilier',          icon: '🏠', description: 'Achat résidence' },
  OTHER:       { id: 'OTHER',       priority: 3, label: 'Autre / Dette',       icon: '💳', description: 'Divers / Remboursement' },
  VEHICLE:     { id: 'VEHICLE',     priority: 3, label: 'Véhicule',            icon: '🚗', description: 'Voiture, Moto' },
  TRAVEL:      { id: 'TRAVEL',      priority: 3, label: 'Voyage',              icon: '✈️', description: 'Vacances' },
  WEDDING:     { id: 'WEDDING',     priority: 3, label: 'Événement',           icon: '💍', description: 'Mariage' },
  PROJECT:     { id: 'PROJECT',     priority: 4, label: 'Projet / Bourse',     icon: '📈', description: 'Investissement' }, 
  RETIREMENT:  { id: 'RETIREMENT',  priority: 4, label: 'Retraite',            icon: '🌴', description: 'Long terme' },
};

// ✅ CONFIGURATION VISUELLE DES ACTIFS (STRICTE & COMPLÈTE)
// On utilise DIRECTEMENT l'Enum AssetType. Plus de strings en dur.
export const ASSET_TYPES = [
  { id: AssetType.CC,          label: 'Compte Courant',      category: 'LIQUIDITY', color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-300' },
  
  // Épargne sécurisée
  { id: AssetType.LIVRET,      label: 'Livret A / LDDS',     category: 'CASH',      color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  { id: AssetType.LDDS,       label: 'LDDS',                category: 'CASH',      color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  { id: AssetType.LEP,         label: 'LEP (Épargne Pop.)',  category: 'CASH',      color: 'text-pink-600',    bg: 'bg-pink-50',    border: 'border-pink-200' },
  { id: AssetType.PEL,         label: 'PEL / CEL',           category: 'CASH',      color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-300' },
  { id: AssetType.PEE,         label: 'Épargne Salariale',   category: 'CASH',      color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  
  // Bourse
  { id: AssetType.PEA,         label: 'PEA / PEA-PME',       category: 'BOURSE',    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { id: AssetType.CTO,         label: 'Compte Titres (CTO)', category: 'BOURSE',    color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-200' },
  { id: AssetType.AV,          label: 'Assurance Vie',       category: 'BOURSE',    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: AssetType.PER,         label: 'PER (Retraite)',      category: 'BOURSE',    color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  
  // Immo & Exotique
  { id: AssetType.SCPI,        label: 'SCPI (Pierre-Papier)',category: 'IMMO',      color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  { id: AssetType.REAL_ESTATE, label: 'Immo. Locatif',       category: 'IMMO',      color: 'text-amber-700',   bg: 'bg-amber-100',  border: 'border-amber-300' },
  { id: AssetType.CROWD,       label: 'Crowdfunding',        category: 'IMMO',      color: 'text-lime-600',    bg: 'bg-lime-50',    border: 'border-lime-200' },
  
  { id: AssetType.CRYPTO,      label: 'Crypto / Web3',       category: 'EXOTIC',    color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  { id: AssetType.GOLD,        label: 'Or / Montres / Art',  category: 'EXOTIC',    color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  { id: AssetType.OTHER,       label: 'Autre',               category: 'EXOTIC',    color: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-200' },
] as const;

export const PURCHASE_TYPES: Record<PurchaseType, { id: string; label: string; description: string; color: string }> = {
  NEED:    { id: 'NEED',        label: 'Besoin Vital',     description: 'Nourriture, Santé', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  PLEASURE:{ id: 'PLEASURE',    label: 'Envie / Plaisir',  description: 'Loisirs, Mode',     color: 'bg-purple-100 text-purple-700 border-purple-200' },
  OPPORTUNITY:{ id: 'OPPORTUNITY', label: 'Confort / Utile', description: 'Gain de temps',    color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  PROBLEM: { id: 'PROBLEM',     label: 'Imprévu / Galère', description: 'Réparations',       color: 'bg-red-100 text-red-700 border-red-200' }
};

export const PAYMENT_MODES: Record<PaymentMode, string> = {
  CASH_SAVINGS: 'Épargne (Je tape dans le stock)',
  CASH_CURRENT: 'Compte Courant (Je paie avec le salaire)',
  SPLIT:        'Paiement 3x/4x (Dette court terme)',
  CREDIT:       'Crédit / LOA (Dette long terme)',
};

// ============================================================================
// 2. MAPPING BDD -> TYPES APP (SOURCE DE VÉRITÉ)
// ============================================================================

// ✅ IMPORT CRITIQUE : Export des Enums en tant que Valeurs
export { 
  UserPersona, 
  HousingStatus, 
  ItemCategory, 
  AssetType, 
  GoalCategory, 
  PurchaseType, 
  PaymentMode, 
  Frequency 
};

// 🔹 Financial Item (Flux) — Decimal → number via SerializedDecimal
export type FinancialItem = SerializedDecimal<PrismaItem>;

// 🔹 Asset (Patrimoine) — Decimal → number via SerializedDecimal
export type Asset = SerializedDecimal<PrismaAsset>;
export type Investment = Asset & {
  performance?: number;
};

// 🔹 Goal (Objectifs)
export interface GoalStrategy {
  type: 'TIME' | 'BUDGET' | 'HYBRID' | 'INCOME';
  title: string;
  message?: string;
  value?: number | Date | string;
  painLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  disabled?: boolean;
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

// 🔹 Goal & Decision — Decimal → number via SerializedDecimal
export type FinancialGoal = SerializedDecimal<PrismaGoal>;
export type PurchaseDecision = SerializedDecimal<PrismaDecision>;

export type Goal = FinancialGoal & {
  isInvested?: boolean; 
  monthlyNeed?: number;
  diagnosis?: GoalDiagnosis;
};

// 🔹 Goal Scenario (entrée/sortie de simulateGoalScenario)
export type GoalScenarioInput = Pick<Goal,
  'name' | 'category' | 'targetAmount' | 'currentSaved' | 'deadline' | 'projectedYield' | 'isInvested'
>;

export type GoalScenarioContext = Pick<SimulationResult['budget'],
  'availableForProjects' | 'monthlyIncome' | 'matelas'
>;

export interface GoalProjectionPoint {
  date: string;
  balance: number;
  contributed: number;
}

export interface GoalScenarioResult {
  tempGoal: GoalScenarioInput & { id: string };
  monthlyEffort: number;
  projectionData: {
    projection: GoalProjectionPoint[];
    summary: { finalAmount: number; totalInterests: number; totalPocket: number };
  };
  diagnosis: GoalDiagnosis;
}

// 🔹 Decision & Goal Prisma (définitions ci-dessus via SerializedDecimal)

// 🔹 Purchase (entrée du simulateur d'achat — distinct de PurchaseDecision qui est le modèle Prisma)
export interface Purchase {
  name: string;
  amount: number | string;
  date?: Date | string;
  type?: PurchaseType;
  paymentMode: PaymentMode | string;
  duration?: number | string;
  rate?: number | string;
  isReimbursable?: boolean;
  isPro?: boolean;
}

// 🔹 AnalysisResult (sortie de analyzePurchaseImpact)
export interface AnalysisTip {
  text: string;
}

export interface AnalysisIssue {
  text: string;
  level: 'red' | 'orange';
}

export interface AnalysisResult {
  verdict: 'green' | 'orange' | 'red';
  score: number;
  isBudgetOk: boolean;
  isCashflowOk: boolean;
  smartTitle: string;
  smartMessage: string;
  issues: AnalysisIssue[];
  tips: AnalysisTip[];
  newMatelas: number;
  newRV: number;
  newSafetyMonths: number;
  newEngagementRate: number;
  realCost: number;
  creditCost: number;
  opportunityCost: number;
  timeToWork: number;
  lowestProjectedBalance: number;
  projectedCurve: { date: string; value: number }[];
}

// ============================================================================
// 3. PROFIL UTILISATEUR (AGRÉGATION)
// ============================================================================

export interface Household { adults: number; children: number; }
export interface Housing { status: HousingStatus; monthlyCost: number; paymentDay?: number; }
export interface PersonaRules { safetyMonths: number; maxDebt: number; minLiving: number; }

// 🔹 ProfileDB — Shape base de données (validable par Zod end-to-end)
export interface ProfileDB {
  id: string;
  profileId?: string; // FinancialProfile.id (pour insights, etc.)
  userId: string;
  email?: string;
  firstName?: string;

  age: number | null;
  persona: UserPersona | null;
  housingStatus: HousingStatus | null;
  housingCost: number;
  housingPaymentDay: number | null;
  adults: number;
  children: number;
  funBudget: number;

  items: FinancialItem[];
  assets: Asset[];
  goals: FinancialGoal[];
  decisions: PurchaseDecision[];

  lastBudgetSnapshot?: BudgetResult | null;

  updatedAt?: Date | string;
}

// 🔹 ProfileUI — Version enrichie pour le frontend (dérivés + calculés)
export interface ProfileUI extends ProfileDB {
  mode?: string;

  household: Household;
  housing: Housing;

  incomes: FinancialItem[];
  fixedCosts: FinancialItem[];
  variableCosts: FinancialItem[];
  subscriptions: FinancialItem[];
  credits: FinancialItem[];
  annualExpenses: FinancialItem[];

  savingsContributions: { id: string; name: string; amount: number; dayOfMonth: number }[];
  investments: Investment[];

  savings?: number;
  investedAmount?: number;
  currentBalance?: number;
  monthlyIncome?: number;
  investmentYield?: number;

  goals: Goal[];
}

// Alias backward-compatible
export type Profile = ProfileUI;

// ============================================================================
// 4. TYPES D'ANALYSE
// ============================================================================

export interface ActionGuide {
  title: string;
  definition: string;
  steps: string[];
  tips: string[];
  difficulty?: 'Facile' | 'Moyen' | 'Difficile';
  impact?: 'Immédiat' | 'Long terme';
}

export type OpportunityLevel = 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
export type OpportunityType = 'SAVINGS' | 'DEBT' | 'INVESTMENT' | 'BUDGET';

export interface OptimizationOpportunity {
  id: string;
  type: OpportunityType;
  level: OpportunityLevel;
  title: string;
  message: string;
  potentialGain?: number;
  actionLabel?: string;
  guide?: ActionGuide;
  link?: string;
}

export interface DeepAnalysis {
  globalScore: number;
  tags: string[];
  ratios: { needs: number; wants: number; savings: number };
  projections: { wealth10y: number; wealth20y: number; fireYear: number };
  opportunities: OptimizationOpportunity[];
}

export interface GoalAllocation {
  id: string;
  name: string;
  tier: string;
  requestedEffort: number;
  allocatedEffort: number;
  status: 'FULL' | 'PARTIAL';
  fillRate: number;
}

export interface BudgetResult {
  income: number;
  fixed: number;
  variable: number;
  variableExpenses: number;
  monthlyIncome: number;
  mandatoryExpenses: number;
  discretionaryExpenses: number;
  capacityToSave: number;
  rawCapacity: number;
  endOfMonthBalance: number;
  profitableExpenses: number;
  totalRecurring: number;
  remainingToLive: number;
  realCashflow: number;
  matelas: number;
  investments: number;
  totalWealth: number;
  safetyMonths: number;
  engagementRate: number;
  rules: PersonaRules;
  securityBuffer: number;
  availableForProjects: number;
  currentBalance: number;
  capacity: number;
  totalGoalsEffort: number;
}

/** BudgetResult vide pour fallback (ex: profil non chargé) */
export const EMPTY_BUDGET_RESULT: BudgetResult = {
  income: 0, fixed: 0, variable: 0, variableExpenses: 0, monthlyIncome: 0,
  mandatoryExpenses: 0, discretionaryExpenses: 0, capacityToSave: 0, rawCapacity: 0,
  endOfMonthBalance: 0, profitableExpenses: 0, totalRecurring: 0, remainingToLive: 0,
  realCashflow: 0, matelas: 0, investments: 0, totalWealth: 0, safetyMonths: 0,
  engagementRate: 0, rules: { safetyMonths: 3, maxDebt: 35, minLiving: 300 },
  securityBuffer: 0, availableForProjects: 0, currentBalance: 0, capacity: 0, totalGoalsEffort: 0,
};

export interface SimulationResult {
  allocations: GoalAllocation[];
  budget: BudgetResult;
  freeCashFlow: number;
  diagnosis?: DeepAnalysis;
  usedRates?: Record<string, number>;
}

// ============================================================================
// 5. OBJETS INITIAUX
// ============================================================================

// ✅ Utilisation des Enums en clé
export const PERSONA_PRESETS: Record<UserPersona, { id: UserPersona, label: string, description: string, rules: PersonaRules }> = {
  [UserPersona.STUDENT]:    { id: 'STUDENT',    label: 'Étudiant(e)',         description: 'Budget serré, flexible.',     rules: { safetyMonths: 1, maxDebt: 40, minLiving: 100 } },
  [UserPersona.SALARIED]:   { id: 'SALARIED',   label: 'Salarié / Stable',    description: 'Revenus réguliers.',          rules: { safetyMonths: 3, maxDebt: 35, minLiving: 300 } },
  [UserPersona.FREELANCE]:  { id: 'FREELANCE',  label: 'Indépendant',         description: 'Revenus variables, risque.',  rules: { safetyMonths: 6, maxDebt: 30, minLiving: 500 } },
  [UserPersona.RETIRED]:    { id: 'RETIRED',    label: 'Retraité(e)',         description: 'Revenus fixes, préservation.',rules: { safetyMonths: 6, maxDebt: 25, minLiving: 400 } },
  [UserPersona.UNEMPLOYED]: { id: 'UNEMPLOYED', label: 'En recherche',        description: 'Budget de transition.',       rules: { safetyMonths: 6, maxDebt: 10, minLiving: 100 } },
};

export const INITIAL_PROFILE: Profile = {
  id: 'temp',
  userId: 'temp',
  firstName: '', 
  age: 0, 
  persona: UserPersona.SALARIED, 
  mode: 'beginner',
  household: { adults: 1, children: 0 },
  housing: { status: HousingStatus.TENANT, monthlyCost: 0, paymentDay: 5 }, 
  housingCost: 0,
  housingPaymentDay: 5,
  adults: 1,
  children: 0,
  housingStatus: HousingStatus.TENANT,
  funBudget: 0,
  
  savings: 0, 
  investedAmount: 0, 
  investmentYield: 5, 
  currentBalance: 0, 
  monthlyIncome: 0,
  
  items: [],
  assets: [],
  goals: [],
  decisions: [],

  variableCosts: [], incomes: [], fixedCosts: [], subscriptions: [], credits: [], savingsContributions: [], annualExpenses: [], investments: [],
};

// ============================================================================
// 6. UTILITAIRES DE CALCUL
// ============================================================================

export const generateId = (): string => Math.random().toString(36).substr(2, 9);

export const safeFloat = (val: unknown): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (val instanceof Prisma.Decimal) return val.toNumber();
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

// ✅ UTILITAIRE MAJEUR : Utilisation de l'Enum Frequency
export const calculateListTotal = (items: { amount: number | string; frequency?: Frequency | string }[]): number => {
  if (!Array.isArray(items)) return 0; 
  
  return items.reduce((acc, item) => {
    let amount = Math.abs(safeFloat(item.amount));
    
    if (item.frequency === Frequency.YEARLY) amount = amount / 12;
    if (item.frequency === Frequency.QUARTERLY) amount = amount / 3;
    if (item.frequency === Frequency.WEEKLY) amount = amount * 4.33;
    if (item.frequency === Frequency.DAILY) amount = amount * 30;
    if (item.frequency === Frequency.ONCE) amount = 0;

    return acc + amount;
  }, 0);
};