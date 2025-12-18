// app/lib/definitions.ts
import { 
  FinancialGoal, 
  PurchaseDecision, 
  FinancialProfile, 
  FinancialItem as PrismaItem, 
  Asset as PrismaAsset,
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

export const PURCHASE_TYPES = {
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

// 🔹 Financial Item (Flux)
export type FinancialItem = PrismaItem;

// 🔹 Asset (Patrimoine)
export interface Investment extends PrismaAsset {
  performance?: number; // Champ UI calculé
}
export type Asset = PrismaAsset;

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

export type Goal = FinancialGoal & {
  // Champs calculés UI
  isInvested?: boolean; 
  monthlyNeed?: number;
  diagnosis?: GoalDiagnosis;
};

// 🔹 Decision
export type { PurchaseDecision };

// ============================================================================
// 3. PROFIL UTILISATEUR (AGRÉGATION)
// ============================================================================

export interface Household { adults: number; children: number; }
export interface Housing { status: HousingStatus; monthlyCost: number; paymentDay?: number; }
export interface PersonaRules { safetyMonths: number; maxDebt: number; minLiving: number; }

export interface Profile extends Omit<FinancialProfile, 'createdAt' | 'updatedAt' | 'items' | 'assets' | 'goals' | 'decisions'> {
  // Champs Frontend spécifiques
  email?: string;
  firstName?: string;
  mode?: string; 

  household: Household; 
  housing: Housing;     
  
  // Relations complètes
  items: FinancialItem[]; 
  assets: Asset[];        
  goals: Goal[];          
  decisions: PurchaseDecision[];

  // --- Helpers UI (tableaux filtrés) ---
  incomes: FinancialItem[];
  fixedCosts: FinancialItem[];
  variableCosts: FinancialItem[];
  subscriptions: FinancialItem[];
  credits: FinancialItem[];
  annualExpenses: FinancialItem[];
  
  savingsContributions: { id: string; name: string; amount: number; dayOfMonth: number }[]; 
  investments: Investment[]; 

  // --- Totaux Calculés ---
  savings?: number; 
  investedAmount?: number;
  currentBalance?: number;
  monthlyIncome?: number;
  investmentYield?: number;
  
  updatedAt?: Date | string;
}

// ============================================================================
// 4. TYPES D'ANALYSE
// ============================================================================

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
}

export interface DeepAnalysis {
  globalScore: number;
  tags: string[];
  opportunities: OptimizationOpportunity[];
}

export interface SimulationResult {
  allocations: any[]; 
  budget: { 
      income: number; 
      fixed: number; 
      variable: number; 
      capacityToSave: number; 
      remainingToLive: number; 
      matelas: number; 
      securityBuffer: number; 
      availableForProjects: number;
      totalGoalsEffort: number;
      endOfMonthBalance: number;
      currentBalance: number;
      safetyMonths: number;
      monthlyIncome: number;      
      mandatoryExpenses: number;  
  };
  freeCashFlow: number; 
  diagnosis?: DeepAnalysis;
  usedRates?: any; 
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

// ✅ UTILITAIRE MAJEUR : Utilisation de l'Enum Frequency
export const calculateListTotal = (items: FinancialItem[]): number => {
  if (!Array.isArray(items)) return 0; 
  
  return items.reduce((acc, item) => {
    let amount = Math.abs(safeFloat(item.amount));
    
    // Si c'est Annuel ou Trimestriel, on mensualise
    if (item.frequency === Frequency.YEARLY) amount = amount / 12;
    if (item.frequency === Frequency.QUARTERLY) amount = amount / 3;
    if (item.frequency === Frequency.WEEKLY) amount = amount * 4.33;
    if (item.frequency === Frequency.DAILY) amount = amount * 30;
    if (item.frequency === Frequency.ONCE) amount = 0; // On ne compte pas le ponctuel dans le budget mensuel

    return acc + amount;
  }, 0);
};