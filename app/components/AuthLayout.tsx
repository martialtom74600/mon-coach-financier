import { Target, Zap, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-white flex md:grid md:grid-cols-2">
      {/* Colonne gauche — Branding */}
      <div className="hidden md:flex flex-col justify-between p-12 lg:p-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 animate-pulse" />
        <div className="relative z-10">
          <div className="h-14 w-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-8 shadow-2xl">
            <Target size={28} className="text-white" />
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-6 leading-[1.1]">
            Finance
            <br />
            OS 2.0
          </h1>
          <p className="text-slate-400 text-xl max-w-md leading-relaxed">
            L&apos;intelligence artificielle qui transforme vos revenus en patrimoine. 100% Automatisé.
          </p>
        </div>
        <div className="relative z-10 flex gap-8 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <Zap size={14} className="text-indigo-500" /> IA Active
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" /> Chiffré
          </span>
        </div>
      </div>
      {/* Colonne droite — Formulaire */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="md:hidden text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900">Finance OS</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
