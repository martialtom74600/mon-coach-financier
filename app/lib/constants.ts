import { Profile, PersonaRules } from './types';

export const STORAGE_KEY = 'financial_coach_data_v1';

export const CONSTANTS = {
  AVG_WORK_DAYS_MONTH: 21.6, 
  SAFE_SAVINGS_RATE: 0.03,
  INVESTMENT_RATE: 0.07,
  INFLATION_RATE: 0.02,
  WEALTHY_THRESHOLD: 12,
};

// --- CONFIGURATION DES PERSONAS ---
interface PersonaDefinition {
  id: string;
  label: string;
  description: string;
  rules: PersonaRules; // Utilise le type officiel
}

export const PERSONA_PRESETS: Record<string, PersonaDefinition> = {
  STUDENT: { 
    id: 'student', 
    label: 'Étudiant(e)', 
    description: 'Budget serré, études, besoins flexibles.', 
    rules: { safetyMonths: 1, maxDebt: 40, minLiving: 100 } 
  },
  SALARIED: { 
    id: 'salaried', 
    label: 'Salarié / Stable', 
    description: 'Revenus réguliers (CDI, Fonctionnaire).', 
    rules: { safetyMonths: 3, maxDebt: 35, minLiving: 300 } 
  },
  FREELANCE: { 
    id: 'freelance', 
    label: 'Indépendant / Freelance', 
    description: 'Revenus variables, risque plus élevé.', 
    rules: { safetyMonths: 6, maxDebt: 30, minLiving: 500 } 
  },
  RETIRED: { 
    id: 'retired', 
    label: 'Retraité(e)', 
    description: 'Revenus fixes, préservation du capital.', 
    rules: { safetyMonths: 6, maxDebt: 25, minLiving: 400 } 
  },
  UNEMPLOYED: { 
    id: 'unemployed', 
    label: 'En recherche / Transition', 
    description: 'Revenus précaires, prudence maximale.', 
    rules: { safetyMonths: 6, maxDebt: 0, minLiving: 200 } 
  }
};

// --- PROFIL PAR DÉFAUT (Sécurisé par le type Profile) ---
export const INITIAL_PROFILE: Profile = {
  firstName: '',
  mode: 'beginner',
  persona: 'salaried',
  household: { adults: 1, children: 0 },
  
  // STOCKS (Patrimoine)
  savings: 0,       // Épargne Dispo (Livret A)
  investments: 0,   // Épargne Bloquée (PEA, Immo)
  investmentYield: 5, 
  currentBalance: 0, 
  
  // FLUX (Budget)
  variableCosts: 0, 
  
  // LISTES DÉTAILLÉES (Initialisées vides mais typées)
  incomes: [],
  fixedCosts: [],
  subscriptions: [],
  credits: [],
  savingsContributions: [], 
  annualExpenses: [],
  
  // OBJECTIFS
  goals: [], 
};

// --- CONFIGURATION DES TYPES D'ACHAT ---
interface PurchaseTypeConfig {
  id: string;
  label: string;
  description: string;
  color: string;
}

export const PURCHASE_TYPES: Record<string, PurchaseTypeConfig> = {
  NEED: { id: 'need', label: 'Besoin Vital', description: 'Nourriture, Santé, Réparation indispensable', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  USEFUL: { id: 'useful', label: 'Confort / Utile', description: 'Gain de temps, Travail, Sport', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  DESIRE: { id: 'desire', label: 'Envie / Plaisir', description: 'Gadget, Mode, Sortie, Déco', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

// --- CONFIGURATION DES MODES DE PAIEMENT ---
export const PAYMENT_MODES: Record<string, string> = {
  CASH_SAVINGS: 'Épargne (Je tape dans le stock)',
  CASH_ACCOUNT: 'Compte Courant (Je paie avec le salaire)',
  SPLIT: 'Paiement 3x/4x (Dette court terme)',
  CREDIT: 'Crédit / LOA (Dette long terme)',
  SUBSCRIPTION: 'Abonnement (Charge fixe)',
};

// --- CONFIGURATION DES CATÉGORIES D'OBJECTIFS ---
interface GoalCategoryConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const GOAL_CATEGORIES: Record<string, GoalCategoryConfig> = {
  REAL_ESTATE: { id: 'REAL_ESTATE', label: 'Immobilier', icon: '🏠', description: 'Achat résidence, Investissement locatif' },
  VEHICLE: { id: 'VEHICLE', label: 'Véhicule', icon: '🚗', description: 'Voiture, Moto (Achat cash ou apport)' },
  TRAVEL: { id: 'TRAVEL', label: 'Voyage / Plaisir', icon: '✈️', description: 'Vacances, Tour du monde' },
  WEDDING: { id: 'WEDDING', label: 'Mariage / Fête', icon: '💍', description: 'Grand événement prévu' },
  EMERGENCY: { id: 'EMERGENCY', label: 'Matelas de Sécurité', icon: '🛡️', description: 'Constitution de l\'épargne de précaution' },
  OTHER: { id: 'OTHER', label: 'Autre Projet', icon: '🎯', description: 'Toute autre dépense importante' },
};