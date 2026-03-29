'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SignedIn } from '@clerk/nextjs';
import Navigation from '@/app/components/Navigation';
import Header from '@/app/components/Header';
import { isClerkAuthPath } from '@/app/lib/authRoutes';

const PushNotificationPrompt = dynamic(
  () => import('@/app/components/PushNotificationPrompt'),
  { ssr: false },
);

/**
 * Chrome (nav, header, marges) seulement hors flux sign-in / sign-up.
 * Évite l’écran hybride après connexion : session Clerk active encore sur `/sign-in`
 * avec Header (« Coach Fi ») + AuthLayout (« Finance OS »).
 */
export default function AppChromeFrame({
  children,
  isConnected,
}: {
  children: React.ReactNode;
  isConnected: boolean;
}) {
  const pathname = usePathname();
  const showAppChrome = isConnected && !isClerkAuthPath(pathname);

  return (
    <>
      <SignedIn>
        {showAppChrome ? (
          <>
            <Navigation />
            <PushNotificationPrompt />
          </>
        ) : null}
      </SignedIn>

      <main
        className={`min-h-screen transition-all duration-300 ${showAppChrome ? 'md:pl-64 pb-28 md:pb-0' : 'p-0'}`}
      >
        <div
          className={
            showAppChrome
              ? 'w-full max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10'
              : 'w-full h-full'
          }
        >
          <SignedIn>{showAppChrome ? <Header /> : null}</SignedIn>

          <div
            className={
              showAppChrome
                ? 'mt-6 min-h-[32dvh] md:min-h-[38dvh]'
                : ''
            }
          >
            {children}
          </div>
        </div>
      </main>
    </>
  );
}
