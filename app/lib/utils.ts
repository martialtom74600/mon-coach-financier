// Génère un ID unique pour tes listes (ex: "kq29f8s")
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Formate un nombre en Euro propre (ex: 1 200 €)
export const formatCurrency = (amount: any) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(num);
};

// Calcul d'intérêts composés (utilisé pour les projections d'investissement)
export const calculateFutureValue = (principal: number, rate: number, years: number) => {
  return principal * Math.pow((1 + rate), years);
};

// --- CALCULATEUR DE LISTE (ESSENTIEL) ---
// C'est lui qui permet à tes accordéons de calculer leur total automatiquement
// en gérant la différence Mensuel / Annuel
export const calculateListTotal = (items: any[]) => {
  return (items || []).reduce((acc, item) => {
    let amount = Math.abs(parseFloat(item.amount) || 0);
    // Si c'est une dépense annuelle, on la ramène au mois pour le budget
    if (item.frequency === 'annuel') amount = amount / 12;
    return acc + amount;
  }, 0);
};