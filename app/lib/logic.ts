// app/lib/logic.ts

export const STORAGE_KEY = 'financial_coach_data_v1';

export const INITIAL_PROFILE = {
  savings: 0, // Matelas actuel
  incomes: [], // { id, name, amount, frequency }
  fixedCosts: [], // { id, name, amount, frequency }
  subscriptions: [], // { id, name, amount }
  credits: [], // { id, name, amount, monthsRemaining }
  savingsContributions: [], // { id, name, amount }
  annualExpenses: [], // { id, name, amount }
};

export const PURCHASE_TYPES = {
  NEED: {
    id: 'need',
    label: 'Besoin',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  USEFUL: {
    id: 'useful',
    label: 'Utile',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  DESIRE: {
    id: 'desire',
    label: 'Envie',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
};

export const PAYMENT_MODES = {
  CASH_SAVINGS: 'Cash (Épargne)',
  CASH_ACCOUNT: 'Cash (Compte Courant)',
  SPLIT: 'Paiement fractionné (3x, 4x...)',
  CREDIT: 'Crédit / LOA',
  SUBSCRIPTION: 'Abonnement',
};

// --- FONCTIONS UTILITAIRES ---

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const formatCurrency = (amount: any) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(num);
};

// Cœur de la logique financière
export const calculateFinancials = (profile: any) => {
  // Helper pour normaliser en mensuel
  const getMonthly = (items: any[]) =>
    items.reduce((acc, item) => {
      let amount = parseFloat(item.amount) || 0;
      if (item.frequency === 'annuel') amount = amount / 12;
      return acc + amount;
    }, 0);

  const monthlyIncome = getMonthly(profile.incomes);

  // Charges Fixes + Dépenses Annuelles lissées
  const monthlyFixed =
    getMonthly(profile.fixedCosts) + getMonthly(profile.annualExpenses);

  const monthlySubs = getMonthly(profile.subscriptions);
  const monthlyCredits = getMonthly(profile.credits);
  const monthlySavingsContrib = getMonthly(profile.savingsContributions);

  const essentialExpenses = monthlyFixed + getMonthly(profile.annualExpenses); // DE (Dépenses Essentielles)
  const totalRecurring =
    essentialExpenses + monthlySubs + monthlyCredits + monthlySavingsContrib; // DR

  const remainingToLive = monthlyIncome - totalRecurring; // RV
  const engagementRate =
    monthlyIncome > 0
      ? ((essentialExpenses + monthlySubs + monthlyCredits) / monthlyIncome) *
        100
      : 0; // TE

  const matelas = parseFloat(profile.savings) || 0;
  const safetyMonths = essentialExpenses > 0 ? matelas / essentialExpenses : 0;

  return {
    monthlyIncome,
    essentialExpenses, // DE
    monthlySubs, // AC
    monthlyCredits, // CR
    monthlySavingsContrib, // EP
    totalRecurring, // DR
    remainingToLive, // RV
    engagementRate, // TE
    matelas, // M
    safetyMonths, // MS
  };
};
