import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-slate-50 p-4">
      <SignIn
        routing="path"
        path="/sign-in"      

        // IMPORTANT : On dit au composant où se trouve la page d'inscription locale
        signUpUrl="/sign-up"
        
        appearance={{
          variables: {
            colorPrimary: '#4f46e5',
            colorText: '#0f172a',
            colorBackground: '#ffffff',
            borderRadius: '0.75rem',
            fontFamily: 'inherit',
          },
          elements: {
            card: "bg-white rounded-2xl shadow-sm border border-slate-100 p-8",
            formButtonPrimary: 
              "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 " + 
              "rounded-xl font-bold py-3 px-4 transition-all duration-200 active:scale-95",
            formFieldInput: 
              "rounded-xl border-slate-200 focus:border-indigo-600 focus:ring-indigo-600 transition-all duration-200",
            footerActionLink: "text-indigo-600 hover:text-indigo-700 font-medium",
            headerTitle: "text-slate-900 font-bold",
            headerSubtitle: "text-slate-500",
          }
        }}
      />
    </div>
  );
}