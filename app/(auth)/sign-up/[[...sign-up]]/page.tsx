import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import AuthLayout from '@/app/components/AuthLayout';
import { clerkAppearanceHybrid } from '@/app/config/clerk-theme';

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/"
        appearance={{
          variables: clerkAppearanceHybrid.variables,
          layout: { socialButtonsPlacement: 'bottom' },
          elements: {
            ...clerkAppearanceHybrid.elements,
            card: 'shadow-none p-4 sm:p-6',
            formButtonPrimary:
              'bg-indigo-600 hover:bg-indigo-700 py-3 text-base shadow-lg shadow-indigo-200',
            footerActionLink: 'hidden',
            headerTitle: 'text-2xl font-bold',
            headerSubtitle: 'text-slate-500',
          },
        }}
      />
      <div className="text-center text-sm pt-4 border-t border-slate-100">
        <p className="text-slate-500">
          Déjà membre ?{' '}
          <Link href="/sign-in" className="font-bold text-indigo-600 hover:underline ml-1">
            Connexion
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
