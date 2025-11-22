'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import {
  calculateFinancials,
  formatCurrency,
  generateId,
  PERSONA_PRESETS
} from '@/app/lib/logic';

import {
  Trash2,
  Plus,
  Shield,
  Save,
  Wallet,
  Home,
  Tv,
  Landmark,
  Calendar,
  TrendingDown,
  TrendingUp,
  Download,
  Upload,
  FileJson,
  User,
  Briefcase,
  GraduationCap,
  Armchair,
  Baby,
  Target,
  Minus,
  CheckCircle,
  AlertTriangle,
  Search // Pour le statut "En recherche"
} from 'lucide-react';

// --- COMPOSANTS UI ---

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '' }: any) => {
  const baseStyle = 'px-4 py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95';
  const variants: any = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200',
    secondary: 'bg-white text-indigo-700 border border-indigo-100 hover:bg-indigo-50',
    ghost: 'bg-transparent text-slate-500 hover:text-indigo-600 hover:bg-indigo-50',
    danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50',
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- COMPOSANT SÉLECTEUR DE PERSONA (CORRIGÉ) ---
const PersonaSelector = ({ currentPersona, onChange }: any) => {
  const icons: any = {
    salaried: Briefcase,
    student: GraduationCap,
    freelance: Target,
    retired: Armchair,
    unemployed: Search
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {Object.entries(PERSONA_PRESETS).map(([key, persona]: any) => {
        const Icon = icons[persona.id] || User;
        const isSelected = currentPersona === persona.id;
        
        return (
          <button
            key={key}
            onClick={() => onChange(persona.id)}
            className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col gap-2 h-full ${
              isSelected 
                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' 
                : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'
            }`}
          >
            <div className={`p-2 rounded-lg w-fit ${isSelected ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
              <Icon size={20} />
            </div>
            <div>
              <div className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                {persona.label}
              </div>
              <div className="text-xs text-slate-500 mt-1 leading-snug">
                {persona.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// --- COMPOSANT COMPTEUR FAMILLE ---
const HouseholdCounter = ({ label, value, onChange, icon: Icon }: any) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white rounded-lg text-slate-500 shadow-sm">
        <Icon size={18} />
      </div>
      <span className="font-medium text-slate-700 text-sm">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      <button 
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="font-bold text-slate-800 w-4 text-center">{value}</span>
      <button 
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  </div>
);

// --- SECTION LISTE ---
const ProfileSection = ({ title, icon: Icon, items = [], onItemChange, onItemAdd, onItemRemove, type = 'standard', colorClass = 'text-slate-800' }: any) => {
  const subTotal = items.reduce((acc: number, item: any) => {
    let val = parseFloat(item.amount) || 0;
    if (item.frequency === 'annuel') val = val / 12;
    return acc + val;
  }, 0);

  return (
    <Card className="overflow-hidden mb-6 animate-fade-in">
      <div className="p-4 md:p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white shadow-sm ${colorClass}`}>{Icon && <Icon size={20} />}</div>
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        </div>
        {subTotal > 0 && <div className="text-sm font-medium text-slate-500">~{formatCurrency(subTotal)}<span className="text-xs">/mois</span></div>}
      </div>
      <div className="p-4 md:p-6 space-y-4">
        {items.map((item: any) => (
          <div key={item.id} className="group flex flex-col sm:flex-row gap-3 items-start sm:items-center pb-4 sm:pb-0 border-b border-dashed border-slate-100 sm:border-none last:pb-0">
            <div className="w-full sm:flex-1">
              <input type="text" placeholder="Ex: Loyer, Salaire..." value={item.name} onChange={(e) => onItemChange(item.id, 'name', e.target.value)} className="w-full p-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-sm font-medium transition-colors outline-none" />
            </div>
            <div className="flex w-full sm:w-auto gap-2">
              <div className="flex-1 sm:w-32 relative">
                <input type="number" placeholder="0" value={item.amount} onChange={(e) => onItemChange(item.id, 'amount', e.target.value)} className="w-full p-2.5 pl-3 pr-8 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-sm font-bold text-slate-800 transition-colors outline-none text-right sm:text-left" />
                <span className="absolute right-3 top-1/2 sm:top-1/2 -translate-y-1/2 sm:-translate-y-1/2 text-slate-400 text-sm pointer-events-none">€</span>
              </div>
              {type === 'standard' && (
                <div className="w-28 sm:w-auto">
                  <select value={item.frequency || 'mensuel'} onChange={(e) => onItemChange(item.id, 'frequency', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:border-indigo-500 outline-none">
                    <option value="mensuel">/mois</option>
                    <option value="annuel">/an</option>
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <button onClick={() => onItemRemove(item.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          </div>
        ))}
        <button onClick={onItemAdd} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-semibold text-sm flex items-center justify-center gap-2 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"><Plus size={16} /> Ajouter une ligne</button>
      </div>
    </Card>
  );
};

// --- PAGE PRINCIPALE ---

export default function ProfilePage() {
  const { profile, saveProfile, isLoaded } = useFinancialData();
  const router = useRouter();
  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  // --- LOGIQUE ---
  const updateItem = (listName: string, id: string, field: string, value: string) => {
    const list = (profile as any)[listName] || [];
    const newList = list.map((item: any) => item.id === id ? { ...item, [field]: value } : item);
    saveProfile({ ...profile, [listName]: newList });
  };

  const addItem = (listName: string) => {
    const newItem = { id: generateId(), name: '', amount: '', frequency: 'mensuel' };
    const currentList = (profile as any)[listName] || [];
    saveProfile({ ...profile, [listName]: [...currentList, newItem] });
  };

  const removeItem = (listName: string, id: string) => {
    const list = (profile as any)[listName] || [];
    const newList = list.filter((item: any) => item.id !== id);
    saveProfile({ ...profile, [listName]: newList });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      
      {/* --- SIDEBAR DROITE (RESUMÉ & OBJECTIFS) --- */}
      <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-indigo-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 pointer-events-none"></div>
          <h2 className="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-6">Santé Mensuelle</h2>
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-emerald-300 text-sm"><TrendingUp size={16} /> Revenus</div>
              <span className="font-bold text-lg">{formatCurrency(stats.monthlyIncome)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-orange-300 text-sm"><TrendingDown size={16} /> Charges Fixes</div>
              <span className="font-bold text-lg text-orange-100">- {formatCurrency(stats.totalRecurring)}</span>
            </div>
            <div className="h-px bg-white/10 my-2"></div>
            <div className="flex justify-between items-end">
              <div className="text-sm text-slate-400">Reste à vivre</div>
              <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(stats.remainingToLive)}</div>
            </div>
          </div>
        </div>

        {/* CARTE OBJECTIFS DYNAMIQUES (Selon Persona) */}
        <Card className="p-6 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Target size={20} /></div>
            <h3 className="font-bold text-slate-800">Tes Objectifs</h3>
          </div>
          
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center">
                <span className="text-slate-500">Sécurité visée</span>
                <span className="font-bold text-indigo-700">{stats.rules.safetyMonths} mois</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-slate-500">Dette Max</span>
                <span className="font-bold text-indigo-700">{stats.rules.maxDebt}%</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-slate-500">Seuil Survie</span>
                <span className="font-bold text-indigo-700">{formatCurrency(stats.rules.minLiving)}</span>
            </div>
            <div className="pt-3 border-t border-slate-100">
                <div className={`text-xs font-medium p-2 rounded-lg flex gap-2 items-center ${stats.safetyMonths >= stats.rules.safetyMonths ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                    {stats.safetyMonths >= stats.rules.safetyMonths ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                    Actuellement : {stats.safetyMonths.toFixed(1)} mois d&apos;avance
                </div>
            </div>
          </div>
        </Card>

        <div className="hidden lg:block">
          <Button onClick={() => router.push('/')} className="w-full"><Save size={18} /> Enregistrer et Terminer</Button>
        </div>
      </div>

      {/* --- COLONNE GAUCHE (FORMULAIRES) --- */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* SECTION 1 : IDENTITÉ & PERSONA (GAMIFICATION) */}
        <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">1</div>
                <h2 className="text-xl font-bold text-slate-800">À propos de toi</h2>
            </div>
            
            <Card className="p-6">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Ton Prénom</label>
                        <input 
                            type="text" 
                            placeholder="Comment doit-on t'appeler ?" 
                            value={profile.firstName || ''} 
                            onChange={(e) => saveProfile({ ...profile, firstName: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Ta situation (Le Coach adapte ses conseils)</label>
                        <PersonaSelector 
                            currentPersona={profile.persona || 'salaried'} 
                            onChange={(id: string) => saveProfile({ ...profile, persona: id })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Ton foyer</label>
                        <div className="grid grid-cols-2 gap-4">
                            <HouseholdCounter 
                                label="Adultes" 
                                icon={User}
                                value={parseInt(profile.household?.adults) || 1} 
                                onChange={(v: number) => saveProfile({ ...profile, household: { ...profile.household, adults: v } })}
                            />
                            <HouseholdCounter 
                                label="Enfants" 
                                icon={Baby}
                                value={parseInt(profile.household?.children) || 0} 
                                onChange={(v: number) => saveProfile({ ...profile, household: { ...profile.household, children: v } })}
                            />
                        </div>
                    </div>
                </div>
            </Card>
        </section>

        {/* SECTION 2 : FINANCES (CHIFFRES) */}
        <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">2</div>
                <h2 className="text-xl font-bold text-slate-800">Ta Santé Financière</h2>
            </div>

            {/* MATELAS DE SÉCURITÉ */}
            <Card className="p-6 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Shield size={20} /></div>
                <h3 className="font-bold text-slate-800">Ton Épargne Disponible</h3>
              </div>
              <div className="relative">
                  <input
                    type="number"
                    value={profile.savings}
                    onChange={(e) => saveProfile({ ...profile, savings: e.target.value })}
                    className="w-full text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 focus:border-emerald-500 outline-none transition-all"
                    placeholder="0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Uniquement l&apos;argent accessible immédiatement (Livret A, Compte courant...).</p>
            </Card>

            <ProfileSection title="Revenus (Net Mensuel)" icon={Wallet} colorClass="text-emerald-600" items={profile.incomes} onItemChange={(id: any, f: any, v: any) => updateItem('incomes', id, f, v)} onItemAdd={() => addItem('incomes')} onItemRemove={(id: any) => removeItem('incomes', id)} />
            <ProfileSection title="Charges Fixes (Logement, Factures...)" icon={Home} colorClass="text-blue-600" items={profile.fixedCosts} onItemChange={(id: any, f: any, v: any) => updateItem('fixedCosts', id, f, v)} onItemAdd={() => addItem('fixedCosts')} onItemRemove={(id: any) => removeItem('fixedCosts', id)} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProfileSection title="Abonnements" icon={Tv} colorClass="text-purple-600" type="simple" items={profile.subscriptions} onItemChange={(id: any, f: any, v: any) => updateItem('subscriptions', id, f, v)} onItemAdd={() => addItem('subscriptions')} onItemRemove={(id: any) => removeItem('subscriptions', id)} />
                <ProfileSection title="Crédits en cours" icon={Landmark} colorClass="text-orange-600" type="simple" items={profile.credits} onItemChange={(id: any, f: any, v: any) => updateItem('credits', id, f, v)} onItemAdd={() => addItem('credits')} onItemRemove={(id: any) => removeItem('credits', id)} />
            </div>
            <ProfileSection title="Dépenses Annuelles (lissées)" icon={Calendar} colorClass="text-pink-600" items={profile.annualExpenses} onItemChange={(id: any, f: any, v: any) => updateItem('annualExpenses', id, f, v)} onItemAdd={() => addItem('annualExpenses')} onItemRemove={(id: any) => removeItem('annualExpenses', id)} />
        </section>
      </div>
    </div>
  );
}