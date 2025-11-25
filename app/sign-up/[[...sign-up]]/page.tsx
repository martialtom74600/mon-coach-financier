import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    // Centrage parfait sur mobile et PC avec un padding
    <div className="flex items-center justify-center min-h-screen w-full bg-slate-50 p-4">
      <SignUp
        appearance={{
          // 1. VARIABLES GLOBALES
          variables: {
            colorPrimary: '#4f46e5', // Indigo-600
            colorText: '#0f172a',    // Slate-900
            colorBackground: '#ffffff',
            borderRadius: '0.75rem', // rounded-xl (12px)
            fontFamily: 'inherit',   // Utilise ta font Inter
          },
          
          // 2. ÉLÉMENTS PRÉCIS (Copiés de tes composants Button & Card)
          elements: {
            // -- Style de ta "Card" --
            card: "bg-white rounded-2xl shadow-sm border border-slate-100 p-8",
            
            // -- Style de ton "Button" (Primary) --
            // bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95
            formButtonPrimary: 
              "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 " + 
              "rounded-xl font-bold py-3 px-4 transition-all duration-200 active:scale-95",
            
            // -- Champs de texte (Inputs) --
            formFieldInput: 
              "rounded-xl border-slate-200 focus:border-indigo-600 focus:ring-indigo-600 transition-all duration-200",
            
            // -- Liens (Déjà un compte ?) --
            footerActionLink: "text-indigo-600 hover:text-indigo-700 font-medium",
            headerTitle: "text-slate-900 font-bold",
            headerSubtitle: "text-slate-500",
          }
        }}
      />
    </div>
  );
}