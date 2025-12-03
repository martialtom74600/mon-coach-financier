import { FinancialItem } from './types';

// ============================================================================
// UTILITAIRES GÉNÉRAUX
// ============================================================================

// Génère un ID unique pour tes listes (ex: "kq29f8s")
export const generateId = (): string => Math.random().toString(36).substr(2, 9);

/**
 * Nettoie une valeur numérique (string ou number) pour éviter les NaN.
 * Gère les virgules, les espaces et les formats bizarres.
 * Ex: "1 200,50" -> 1200.5
 */
export const safeFloat = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  
  // Nettoyage : on enlève les espaces (insécables ou non) et on remplace virgule par point
  const clean = String(val).replace(/[\s\u00A0]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  
  return isNaN(parsed) ? 0 : parsed;
};

// Formate un nombre en Euro propre (ex: 1 200 €)
export const formatCurrency = (amount: number | string): string => {
  // On sécurise l'entrée avec safeFloat pour être sûr d'avoir un nombre
  const num = safeFloat(amount);
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(num);
};

// ============================================================================
// MOTEURS DE CALCUL SIMPLES
// ============================================================================

// Calcul d'intérêts composés (utilisé pour les projections d'investissement)
export const calculateFutureValue = (principal: number, rate: number, years: number): number => {
  return principal * Math.pow((1 + rate), years);
};

// --- CALCULATEUR DE LISTE (ESSENTIEL) ---
// C'est lui qui permet à tes accordéons de calculer leur total automatiquement
// en gérant la différence Mensuel / Annuel
export const calculateListTotal = (items: FinancialItem[]): number => {
  return (items || []).reduce((acc, item) => {
    // 1. Parsing sécurisé via notre nouvelle fonction (plus robuste que parseFloat seul)
    let amount = Math.abs(safeFloat(item.amount));

    // 2. Règle métier : Si c'est une dépense annuelle, on la ramène au mois
    if (item.frequency === 'annuel') {
        amount = amount / 12;
    }
    
    return acc + amount;
  }, 0);
};