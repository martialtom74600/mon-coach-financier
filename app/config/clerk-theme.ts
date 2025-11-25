// Thème de base
export const clerkAppearance = {
  variables: {
    colorPrimary: '#4f46e5', // Indigo-600
    colorText: '#0f172a',    // Slate-900
    colorBackground: '#ffffff',
    borderRadius: '0.75rem', // rounded-xl
    fontFamily: 'inherit',
  },
  elements: {
    card: "bg-white rounded-2xl shadow-xl border border-slate-100 p-8",
    formButtonPrimary: 
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 " + 
      "rounded-xl font-bold py-3 px-4 transition-all duration-200 active:scale-95",
    formFieldInput: 
      "rounded-xl border-slate-200 focus:border-indigo-600 focus:ring-indigo-600 transition-all duration-200",
    footerActionLink: "text-indigo-600 hover:text-indigo-700 font-medium",
    headerTitle: "text-slate-900 font-bold",
    headerSubtitle: "text-slate-500",
  }
};

// NOUVEAU : Thème Hybride (Magique pour PWA)
// -> Sur Mobile : Transparent et sans bordure (se fond dans l'app)
// -> Sur PC (md:) : Carte blanche avec ombre (ressort bien sur le fond)
export const clerkAppearanceHybrid = {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    card: "shadow-none border-0 bg-transparent p-0 md:shadow-2xl md:border md:border-slate-200 md:bg-white md:p-10", 
  }
};