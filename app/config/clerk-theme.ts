// Thème de base (partagé)
export const clerkAppearance = {
  variables: {
    colorPrimary: '#4f46e5', // Indigo-600
    colorText: '#0f172a',    // Slate-900
    colorBackground: '#ffffff',
    borderRadius: '0.75rem', // rounded-xl
    fontFamily: 'inherit',
  },
  elements: {
    // --- BOUTON PRINCIPAL (Continuer) ---
    formButtonPrimary: 
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 " + 
      "rounded-xl font-bold py-3.5 px-4 text-base transition-all duration-200 active:scale-95 w-full", 
    
    // --- BOUTON GOOGLE (Social) ---
    socialButtonsBlockButton: 
      "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 " +
      "rounded-xl py-3 px-4 font-medium shadow-sm transition-all duration-200 active:scale-95 w-full", // Ajout de w-full par sécurité
    
    // --- CHAMPS TEXTE ---
    formFieldInput: 
      "rounded-xl border-slate-200 focus:border-indigo-600 focus:ring-indigo-600 py-3 transition-all duration-200 bg-white",
    
    // --- TEXTES ---
    footerActionLink: "text-indigo-600 hover:text-indigo-700 font-bold",
    headerTitle: "text-slate-900 font-bold text-xl",
    headerSubtitle: "text-slate-500",
    dividerLine: "bg-slate-200",
    dividerText: "text-slate-400 font-medium",
    
    // On s'assure que le conteneur principal ne déborde pas
    rootBox: "w-full",
    card: "w-full max-w-full overflow-hidden",
  }
};

// Thème Hybride (Le secret du PWA : design split sur desktop, transparent sur mobile)
// NOTE TECHNIQUE : On assure que la propriété `elements` est bien fusionnée.
export const clerkAppearanceHybrid = {
  // Garde toutes les variables de couleur/fontes de base
  variables: clerkAppearance.variables, 
  
  elements: {
    // Commence par copier tous les styles de base
    ...clerkAppearance.elements,
    
    // Écrase spécifiquement la carte pour le comportement Hybride
    // Mobile (<md) : shadow-none, !bg-transparent, border-0, p-6
    // Desktop (md>) : !shadow-2xl, border, !bg-white, p-10 (carte traditionnelle)
    card: "shadow-none !bg-transparent border-0 p-6 md:!shadow-2xl md:border md:border-slate-200 md:!bg-white md:p-10 w-full", 
    
    // Cache les titres par défaut de Clerk sur mobile, car ils sont affichés
    // par le layout marketing dans page.tsx
    headerTitle: "hidden md:block text-slate-900 font-bold text-xl",
    headerSubtitle: "hidden md:block text-slate-500",
  }
};