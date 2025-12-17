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
  PaymentMode
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

// ✅ CONFIGURATION VISUELLE DES CATÉGORIES
// On utilise les clés de l'Enum Prisma 'GoalCategory' pour garantir la cohérence
export const GOAL_CATEGORIES: Record<GoalCategory, { id: GoalCategory, priority: number, label: string, icon: string, description: string }> = {
  EMERGENCY:   { id: 'EMERGENCY',   priority: 1, label: 'Matelas de Sécurité', icon: '🛡️', description: 'Épargne de précaution' },
  REAL_ESTATE: { id: 'REAL_ESTATE', priority: 2, label: 'Immobilier',          icon: '🏠', description: 'Achat résidence' },
  // Note : Si 'DEBT' n'est pas dans l'Enum Prisma, on le mappe sur 'OTHER' ou on ajoute l'Enum en BDD. Ici je le mappe sur OTHER pour l'instant.
  OTHER:       { id: 'OTHER',       priority: 3, label: 'Autre / Dette',       icon: '💳', description: 'Divers / Remboursement' },
  VEHICLE:     { id: 'VEHICLE',     priority: 3, label: 'Véhicule',            icon: '🚗', description: 'Voiture, Moto' },
  TRAVEL:      { id: 'TRAVEL',      priority: 3, label: 'Voyage',              icon: '✈️', description: 'Vacances' },
  WEDDING:     { id: 'WEDDING',     priority: 3, label: 'Événement',           icon: '💍', description: 'Mariage' },
  PROJECT:     { id: 'PROJECT',     priority: 4, label: 'Projet / Bourse',     icon: '📈', description: 'Investissement' }, 
  RETIREMENT:  { id: 'RETIREMENT',  priority: 4, label: 'Retraite',            icon: '🌴', description: 'Long terme' },
};

// ✅ CONFIGURATION VISUELLE DES ACTIFS
// Les IDs correspondent (en minuscule pour l'UI, conversion nécessaire vers Enum Majuscule pour l'API)
export const ASSET_TYPES = [
  { id: 'cc',         label: 'Compte Courant',      category: 'LIQUIDITY', color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-300' },
  { id: 'pea',        label: 'PEA / PEA-PME',       category: 'BOURSE',    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { id: 'av',         label: 'Assurance Vie',       category: 'BOURSE',    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'cto',        label: 'Compte Titres (CTO)', category: 'BOURSE',    color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-200' },
  { id: 'per',        label: 'PER (Retraite)',      category: 'BOURSE',    color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  { id: 'livret',     label: 'Livrets (A/LDDS)',    category: 'CASH',      color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  { id: 'lep',        label: 'LEP (Épargne Pop.)',  category: 'CASH',      color: 'text-pink-600',    bg: 'bg-pink-50',    border: 'border-pink-200' },
  { id: 'pel',        label: 'PEL / CEL',           category: 'CASH',      color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-300' },
  { id: 'pee',        label: 'Épargne Salariale',   category: 'CASH',      color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
  { id: 'immo_paper', label: 'SCPI / SIIC',         category: 'IMMO',      color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  { id: 'crowd',      label: 'Crowdfunding',        category: 'IMMO',      color: 'text-lime-600',    bg: 'bg-lime-50',    border: 'border-lime-200' },
  { id: 'immo_phys',  label: 'Immo. Locatif',       category: 'IMMO',      color: 'text-amber-700',   bg: 'bg-amber-100',  border: 'border-amber-300' },
  { id: 'crypto',     label: 'Crypto / Web3',       category: 'EXOTIC',    color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  { id: 'gold',       label: 'Or / Montres / Art',  category: 'EXOTIC',    color: 'text-yellow-600',  bg: 'bg-yellow-50',  border: 'border-yellow-200' },
] as const;

export const PURCHASE_TYPES = {
  NEED:   { id: 'NEED',   label: 'Besoin Vital',    description: 'Nourriture, Santé', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  USEFUL: { id: 'OPPORTUNITY', label: 'Confort / Utile', description: 'Gain de temps',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  DESIRE: { id: 'PLEASURE', label: 'Envie / Plaisir', description: 'Loisirs, Mode',     color: 'bg-purple-100 text-purple-700 border-purple-200' },
  // Mapping pour le cas PROBLEM si besoin dans l'UI
  PROBLEM: { id: 'PROBLEM', label: 'Imprévu / Galère', description: 'Réparations, Amende', color: 'bg-red-100 text-red-700 border-red-200' }
};

export const PAYMENT_MODES = {
  CASH_SAVINGS: 'Épargne (Je tape dans le stock)',
  CASH_CURRENT: 'Compte Courant (Je paie avec le salaire)',
  SPLIT:        'Paiement 3x/4x (Dette court terme)',
  CREDIT:       'Crédit / LOA (Dette long terme)',
};

// ============================================================================
// 2. MAPPING BDD -> TYPES APP (SOURCE DE VÉRITÉ)
// ============================================================================

// On réexporte les types Prisma pour les utiliser partout dans l'app
export type { UserPersona, HousingStatus, ItemCategory, AssetType, GoalCategory, PurchaseType, PaymentMode };

// 🔹 Financial Item (Flux)
// On utilise directement le type Prisma
export type FinancialItem = PrismaItem;

// 🔹 Asset (Patrimoine)
export type Asset = PrismaAsset;
// L'interface "Investment" étend Asset pour ajouter des champs UI calculés (ex: performance)
export interface Investment extends PrismaAsset {
  performance?: number;
}

// 🔹 Decision (Historique)
export type PurchaseDecision = PurchaseDecision; // Type Prisma direct

// 🔹 Goal (Objectifs)
// On étend le type Prisma car le moteur de calcul (Logic.ts) ajoute des champs temporaires
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
  // Ces champs sont calculés par le moteur, ils ne sont pas persistés en base
  isInvested?: boolean; 
  monthlyNeed?: number;
  diagnosis?: GoalDiagnosis;
};

// ============================================================================
// 3. PROFIL UTILISATEUR (AGRÉGATION)
// ============================================================================

export interface Household { adults: number; children: number; }
export interface Housing { status: HousingStatus; monthlyCost: number; paymentDay?: number; }
export interface PersonaRules { safetyMonths: number; maxDebt: number; minLiving: number; }

// Le Profil "Application" est l'objet hydraté qui contient tout l'arbre
export interface Profile extends Omit<FinancialProfile, 'createdAt' | 'updatedAt'> {
  // Champs DB aplatis ou transformés pour l'UI (ex: household object vs 2 champs int)
  email?: string;
  firstName?: string;
  household: Household; 
  housing: Housing;     
  
  // ✅ LES LISTES COMPLÈTES (Relations Prisma)
  items: FinancialItem[]; 
  assets: Asset[];        
  goals: Goal[];          
  decisions: PurchaseDecision[];

  // --- Champs Calculés / Helpers pour l'UI (peuplés par les mappers du GET) ---
  incomes: FinancialItem[];
  fixedCosts: FinancialItem[];
  variableCosts: FinancialItem[];
  subscriptions: FinancialItem[];
  credits: FinancialItem[];
  annualExpenses: FinancialItem[];
  
  savingsContributions: { id: string; name: string; amount: number; dayOfMonth: number }[]; 
  investments: Investment[]; 

  // Champs calculés par le moteur (non présents en base)
  savings?: number; 
  investedAmount?: number;
  currentBalance?: number;
  monthlyIncome?: number;
  investmentYield?: number;
  
  updatedAt?: Date | string;
}

// Type utilisé pour le formulaire de simulation (avant sauvegarde)
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
// 4. TYPES D'ANALYSE (Docteur Financier & Simulation)
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
  // Champs simples
  firstName: '', 
  age: 0, 
  persona: 'SALARIED', // Utilisation de la string par défaut, le mapper gérera l'Enum
  mode: 'beginner',
  household: { adults: 1, children: 0 },
  housing: { status: 'TENANT', monthlyCost: 0 }, 
  
  // Valeurs calculées par défaut
  savings: 0, 
  investedAmount: 0, 
  investmentYield: 5, 
  currentBalance: 0, 
  monthlyIncome: 0,
  
  // Tableaux (Relations)
  items: [],
  assets: [],
  goals: [],
  decisions: [],

  // Tableaux Helper
  variableCosts: [], 
  incomes: [], 
  fixedCosts: [], 
  subscriptions: [], 
  credits: [], 
  savingsContributions: [], 
  annualExpenses: [], 
  investments: [],
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