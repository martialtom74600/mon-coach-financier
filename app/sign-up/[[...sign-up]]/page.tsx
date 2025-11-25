import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/app/config/clerk-theme"; // On importe le thème

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-slate-50 p-4">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={clerkAppearance} // Tout le style est appliqué ici !
      />
    </div>
  );
}