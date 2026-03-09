import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import AuthLayout from '@/app/components/AuthLayout';
import { clerkAppearanceHybrid } from '@/app/config/clerk-theme';

export default function SignInPage() {
  return (
    <AuthLayout>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/"
        appearance={{
          variables: clerkAppearanceHybrid.variables,
          layout: { socialButtonsPlacement: 'bottom' },
          elements: {
            ...clerkAppearanceHybrid.elements,
            card: 'shadow-none p-0',
            formButtonPrimary:
              'bg-slate-900 hover:bg-slate-800 py-3 text-base shadow-lg shadow-slate-200',
            footerActionLink: 'hidden',
            headerTitle: 'text-2xl font-bold',
            headerSubtitle: 'text-slate-500',
          },
        }}
      />
      <div className="text-center text-sm pt-4 border-t border-slate-100">
        <p className="text-slate-500">
          Nouveau ici ?{' '}
          <Link href="/sign-up" className="font-bold text-indigo-600 hover:underline ml-1">
            Créer un compte
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
