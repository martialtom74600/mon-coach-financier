import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/app/config/clerk-theme"; // On importe ton thème

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-slate-50 p-4">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        appearance={clerkAppearance} // Et hop, tout le style est appliqué ici !
      />
    </div>
  );
}