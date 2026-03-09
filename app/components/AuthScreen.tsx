'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { clerkAppearanceHybrid } from '@/app/config/clerk-theme';
import { Target, Zap, ShieldCheck } from 'lucide-react';

const SignIn = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.SignIn),
  { ssr: false, loading: () => <div className="h-12 animate-pulse bg-slate-200 rounded" /> }
);
const SignUp = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.SignUp),
  { ssr: false, loading: () => <div className="h-12 animate-pulse bg-slate-200 rounded" /> }
);

export default function AuthScreen() {
    const searchParams = useSearchParams();
    const isSignUpMode = searchParams.get('mode') === 'signup';
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const switchToSignIn = () => { router.replace('/?mode=login'); };
    const switchToSignUp = () => { router.replace('/?mode=signup'); };

    if (!mounted) {
      return (
        <div className="min-h-screen w-full bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      );
    }
    
    return (
      <div className="min-h-screen w-full bg-white flex md:grid md:grid-cols-2">
        <div className="hidden md:flex flex-col justify-between p-12 lg:p-20 bg-slate-900 text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 animate-pulse"></div>
           <div className="relative z-10">
             <div className="h-14 w-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-8 shadow-2xl">
                <Target size={28} className="text-white"/>
             </div>
             <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">Finance<br/>OS 2.0</h1>
             <p className="text-slate-400 text-xl max-w-md leading-relaxed">L&apos;intelligence artificielle qui transforme vos revenus en patrimoine. 100% Automatisé.</p>
           </div>
           <div className="relative z-10 flex gap-8 text-xs font-bold text-slate-500 uppercase tracking-widest">
               <span className="flex items-center gap-2"><Zap size={14} className="text-indigo-500"/> IA Active</span>
               <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-500"/> Chiffré</span>
           </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="md:hidden text-center mb-8">
                  <h1 className="text-3xl font-black text-slate-900">Finance OS</h1>
              </div>
              {isSignUpMode ? (
                <SignUp key="signup" routing="virtual" appearance={{ variables: clerkAppearanceHybrid.variables, layout: { socialButtonsPlacement: 'bottom' }, elements: { ...clerkAppearanceHybrid.elements, card: "shadow-none p-0", formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 py-3 text-base shadow-lg shadow-indigo-200", footerActionLink: "hidden", headerTitle: "text-2xl font-bold", headerSubtitle: "text-slate-500" } }} signInUrl="/?mode=login" afterSignInUrl="/" />
              ) : (
                <SignIn key="login" routing="virtual" appearance={{ variables: clerkAppearanceHybrid.variables, layout: { socialButtonsPlacement: 'bottom' }, elements: { ...clerkAppearanceHybrid.elements, card: "shadow-none p-0", formButtonPrimary: "bg-slate-900 hover:bg-slate-800 py-3 text-base shadow-lg shadow-slate-200", footerActionLink: "hidden", headerTitle: "text-2xl font-bold", headerSubtitle: "text-slate-500" } }} signUpUrl="/?mode=signup" afterSignUpUrl="/" />
              )}
              <div className="text-center text-sm pt-4 border-t border-slate-100">
                  {isSignUpMode ? (<p className="text-slate-500">Déjà membre ? <button onClick={switchToSignIn} className="font-bold text-indigo-600 hover:underline ml-1">Connexion</button></p>) : (<p className="text-slate-500">Nouveau ici ? <button onClick={switchToSignUp} className="font-bold text-indigo-600 hover:underline ml-1">Créer un compte</button></p>)}
              </div>
          </div>
        </div>
      </div>
    );
}
