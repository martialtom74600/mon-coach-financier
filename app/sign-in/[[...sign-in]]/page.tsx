import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    // Centrage parfait sur mobile et PC
    <div className="flex items-center justify-center min-h-screen w-full bg-slate-50">
      <SignIn />
    </div>
  );
}