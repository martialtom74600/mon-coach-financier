import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    // Centrage parfait sur mobile et PC
    <div className="flex items-center justify-center min-h-screen w-full bg-slate-50">
      <SignUp
        appearance={{
          // 1. Les variables globales (Couleurs, Polices, Arrondis)
          variables: {
            colorPrimary: '#4f46e5', // Le "Indigo-600" de ton thème Tailwind
            colorText: '#0f172a',    // Le "Slate-900" (Texte sombre)
            colorBackground: '#ffffff',
            borderRadius: '0.75rem', // Coins arrondis (rounded-xl)
            fontFamily: 'inherit',   // Utilise la même police que ton site (Inter)
          },
          // 2. Le style des éléments précis (Si tu veux aller plus loin)
          elements: {
            card: "shadow-xl border border-slate-200", // Une belle ombre
            formButtonPrimary: "normal-case text-base font-medium hover:bg-indigo-700 transition-colors", // Bouton principal
            footerActionLink: "text-indigo-600 hover:text-indigo-700", // Lien "Se connecter"
          }
        }}
      />
    </div>
  );
}