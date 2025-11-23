'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import {
  calculateFinancials,
  formatCurrency,
  generateId,
  PERSONA_PRESETS
} from '@/app/lib/logic';

// Imports Icones
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
  TrendingUp,
  User,
  Briefcase,
  GraduationCap,
  Armchair,
  Baby,
  Target,
  Minus,
  CheckCircle,
  AlertTriangle,
  Search,
  Info,
  CreditCard,
  ShoppingCart,
  PiggyBank,
  ChevronDown,
} from 'lucide-react';

// --- IMPORTS UI KIT ---
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup';
import Badge from '@/app/components/ui/Badge';
import Tooltip from '@/app/components/ui/Tooltip';

// --- NOUVEAU COMPOSANT : SÉLECTEUR DE NIVEAU (INTEGRÉ AU FORMULAIRE) ---
const LevelSelector = ({ mode, onChange }: any) => {
  return (
    <div className="space-y-3 animate-fade-in">
        <label className="block text-sm font-medium text-slate-600">
            Ton mode de pilotage
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* OPTION 1 : ESSENTIEL */}
            <button 
                type="button"
                onClick={() => onChange('simple')}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${
                    mode === 'simple' 
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' 
                    : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'
                }`}
            >
                <div className="flex items-center gap-3 mb-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-colors ${
                        mode === 'simple' ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-400 group-hover:text-emerald-500'
                    }`}>
                        🌱
                    </div>
                    <div className={`font-bold text-sm ${mode === 'simple' ? 'text-emerald-900' : 'text-slate-700'}`}>
                        Aller à l'essentiel
                    </div>
                </div>
                <p className={`text-xs ml-11 ${mode === 'simple' ? 'text-emerald-700/80' : 'text-slate-400'}`}>
                    Je laisse le coach gérer les dates et taux par défaut.
                </p>
            </button>

            {/* OPTION 2 : EXPERT */}
            <button 
                type="button"
                onClick={() => onChange('expert')}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group ${
                    mode === 'expert' 
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' 
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'
                }`}
            >
                <div className="flex items-center gap-3 mb-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-colors ${
                        mode === 'expert' ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-400 group-hover:text-indigo-500'
                    }`}>
                        🦁
                    </div>
                    <div className={`font-bold text-sm ${mode === 'expert' ? 'text-indigo-900' : 'text-slate-700'}`}>
                        Mode Expert
                    </div>
                </div>
                <p className={`text-xs ml-11 ${mode === 'expert' ? 'text-indigo-700/80' : 'text-slate-400'}`}>
                    Je veux définir mes dates de prélèvement et rendements précis.
                </p>
            </button>

        </div>
    </div>
  );
};

// --- COMPOSANT ACCORDÉON (MISE À JOUR UX) ---

const AccordionSection = ({ 
  title, 
  icon: Icon, 
  items = [], 
  onItemChange, 
  onItemAdd, 
  onItemRemove, 
  type = 'standard', 
  colorClass = 'text-slate-800', 
  defaultOpen = false,
  mode = 'simple', // Nouveau
  canBeDisabled = false // Nouveau
}: any) => {
  
  // Si on a des items, la section est active, sinon elle dépend de l'action utilisateur
  const [isEnabled, setIsEnabled] = useState(!canBeDisabled || items.length > 0);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const subTotal = items.reduce((acc: number, item: any) => {
    let val = parseFloat(item.amount) || 0;
    if (item.frequency === 'annuel') val = val / 12;
    return acc + val;
  }, 0);

  // --- ÉTAT DÉSACTIVÉ (GHOST) ---
  if (canBeDisabled && !isEnabled) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between opacity-60 hover:opacity-100 transition-all group">
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl bg-slate-50 text-slate-400 group-hover:text-slate-600 grayscale transition-all`}>
            {Icon && <Icon size={20} />}
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-600 text-base">{title}</div>
            <div className="text-xs text-slate-400">Non concerné</div>
          </div>
        </div>
        <button 
          onClick={() => { setIsEnabled(true); setIsOpen(true); onItemAdd(); }} 
          className="text-xs font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          + Ajouter
        </button>
      </div>
    );
  }

  // --- ÉTAT ACTIVÉ ---
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
      <div className="flex items-center justify-between pr-2 bg-white hover:bg-slate-50 transition-colors">
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className="flex-1 p-4 flex items-center justify-between"
        >
            <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-slate-50 ${colorClass}`}>
                {Icon && <Icon size={20} />}
            </div>
            <div className="text-left">
                <h3 className="font-bold text-slate-800 text-base">{title}</h3>
                {!isOpen && (
                    <div className="text-xs text-slate-500 mt-0.5">
                        {items.length} ligne{items.length > 1 ? 's' : ''} • Total : <strong>{formatCurrency(subTotal)}</strong>
                    </div>
                )}
            </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className={`text-sm font-bold ${isOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'} transition-opacity text-right`}>
                    {formatCurrency(subTotal)}<span className="text-[10px] font-normal text-slate-400 block">/mois</span>
                </div>
                <div className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </div>
        </button>
        
        {canBeDisabled && isOpen && (
             <button onClick={() => setIsEnabled(false)} className="p-2 mr-2 text-slate-300 hover:text-slate-500" title="Je n'ai pas ça">
                <Minus size={16} />
            </button>
        )}
      </div>

      {isOpen && (
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 space-y-3 animate-fade-in">
            {items.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-4 italic">Aucune ligne ajoutée.</p>
            )}
            
            {items.map((item: any) => (
            <div key={item.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex-1 w-full">
                    <input 
                        type="text" 
                        placeholder="Nom (ex: Loyer)" 
                        value={item.name} 
                        onChange={(e) => onItemChange(item.id, 'name', e.target.value)} 
                        className="w-full p-2 bg-transparent font-medium text-sm text-slate-700 placeholder:text-slate-300 outline-none" 
                    />
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <div className="relative w-24">
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={item.amount} 
                            onChange={(e) => onItemChange(item.id, 'amount', e.target.value)} 
                            className="w-full p-2 pl-3 pr-6 bg-slate-50 rounded-lg text-sm font-bold text-slate-800 text-right outline-none focus:ring-2 focus:ring-indigo-100" 
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">€</span>
                    </div>

                    {/* UX : MASQUER LA COMPLEXITÉ EN MODE SIMPLE */}
                    {mode === 'expert' && type !== 'annuel' && (
                        <div className="relative w-16" title="Jour du prélèvement">
                            <input 
                                type="number" 
                                min="1" max="31" placeholder="J" 
                                value={item.dayOfMonth || ''} 
                                onChange={(e) => onItemChange(item.id, 'dayOfMonth', Math.min(31, Math.max(1, parseInt(e.target.value))))} 
                                className="w-full p-2 pl-2 pr-1 bg-slate-50 rounded-lg text-sm text-center text-slate-500 outline-none focus:ring-2 focus:ring-indigo-100" 
                            />
                        </div>
                    )}

                    {mode === 'expert' && type === 'standard' && (
                        <select 
                            value={item.frequency || 'mensuel'} 
                            onChange={(e) => onItemChange(item.id, 'frequency', e.target.value)} 
                            className="p-2 bg-slate-50 rounded-lg text-xs text-slate-500 outline-none"
                        >
                            <option value="mensuel">/mois</option>
                            <option value="annuel">/an</option>
                        </select>
                    )}
                    
                    <button onClick={() => onItemRemove(item.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            ))}
            
            <button 
                onClick={onItemAdd} 
                className="w-full py-3 mt-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
            >
                <Plus size={14} /> Ajouter une ligne
            </button>
        </div>
      )}
    </div>
  );
};

const PersonaSelector = ({ currentPersona, onChange }: any) => {
  const icons: any = { salaried: Briefcase, student: GraduationCap, freelance: Target, retired: Armchair, unemployed: Search };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Object.entries(PERSONA_PRESETS).map(([key, persona]: any) => {
        const Icon = icons[persona.id] || User;
        const isSelected = currentPersona === persona.id;
        return (
          <button key={key} onClick={() => onChange(persona.id)} className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
            <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}><Icon size={18} /></div>
            <div><div className={`font-bold text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{persona.label}</div></div>
          </button>
        );
      })}
    </div>
  );
};

const HouseholdCounter = ({ label, value, onChange, icon: Icon }: any) => (
  <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
    <div className="flex items-center gap-2 ml-2"><Icon size={16} className="text-slate-400" /><span className="font-medium text-slate-700 text-sm">{label}</span></div>
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><Minus size={12} /></button>
      <span className="font-bold text-slate-800 w-4 text-center text-sm">{value}</span>
      <button onClick={() => onChange(value + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><Plus size={12} /></button>
    </div>
  </div>
);

// --- PAGE PRINCIPALE ---

export default function ProfilePage() {
  const { profile, saveProfile, isLoaded } = useFinancialData();
  const router = useRouter();
  const [mode, setMode] = useState('simple'); // 'simple' | 'expert'
  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  // Helpers de mise à jour
  const updateItem = (listName: string, id: string, field: string, value: any) => {
    const list = (profile as any)[listName] || [];
    const newList = list.map((item: any) => item.id === id ? { ...item, [field]: value } : item);
    saveProfile({ ...profile, [listName]: newList });
  };

  const addItem = (listName: string) => {
    // On insère des valeurs par défaut valides pour que les calculs fonctionnent même si masqués
    const newItem = { id: generateId(), name: '', amount: '', frequency: 'mensuel', dayOfMonth: 5 };
    const currentList = (profile as any)[listName] || [];
    saveProfile({ ...profile, [listName]: [...currentList, newItem] });
  };

  const removeItem = (listName: string, id: string) => {
    const list = (profile as any)[listName] || [];
    const newList = list.filter((item: any) => item.id !== id);
    saveProfile({ ...profile, [listName]: newList });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-24">
      
      {/* --- COLONNE DROITE (RÉSUMÉ STRATÉGIQUE) --- */}
      <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6 order-first lg:order-last">
        
        {/* 1. CARTE SANTÉ MENSUELLE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">Répartition Mensuelle</h2>
          
          <div className="space-y-4 relative z-10">
            
            {/* REVENUS */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold"><Wallet size={18} /> Revenus</div>
              <span className="font-bold text-lg text-emerald-600">{formatCurrency(stats.monthlyIncome)}</span>
            </div>

            <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                {/* OBLIGATOIRE */}
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-slate-500">Charges Contraintes <Tooltip text="Loyer, factures, crédits..." /></div>
                    <span className="font-medium text-slate-700">- {formatCurrency(stats.mandatoryExpenses)}</span>
                </div>

                {/* CHOIX (Variable) */}
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-slate-500">Dépenses Choisies <Tooltip text="Budget vie courante (courses, loisirs)." /></div>
                    <span className="font-medium text-slate-700">- {formatCurrency(stats.discretionaryExpenses)}</span>
                </div>

                {/* RENTABLE (Investissements) */}
                <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-purple-600 font-bold">Épargne Active <Tooltip text="Argent investi pour l'avenir." /></div>
                    <span className="font-bold text-purple-600">- {formatCurrency(stats.profitableExpenses)}</span>
                </div>
            </div>

            <div className="h-px bg-slate-100 my-4"></div>
            
            {/* RÉSULTAT FINAL */}
            <div className="flex justify-between items-end">
                <div className="text-sm text-slate-400">Cashflow Réel</div>
                <div className={`text-2xl font-black tracking-tight ${stats.realCashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {stats.realCashflow > 0 ? '+' : ''}{formatCurrency(stats.realCashflow)}
                </div>
            </div>

            {/* PROJECTION GAINS */}
            {stats.projectedAnnualYield > 0 && (
                <div className="mt-4 bg-purple-50 p-3 rounded-xl text-xs text-purple-800 flex gap-2 items-center">
                    <TrendingUp size={16} className="shrink-0" />
                    <span>
                        Tes investissements mensuels pourraient te rapporter <strong>+{formatCurrency(stats.projectedAnnualYield)}</strong> / an.
                    </span>
                </div>
            )}
          </div>
        </div>
        
        {/* 2. CARTE OBJECTIFS */}
        <Card className="p-6 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2 mb-4"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Target size={20} /></div><h3 className="font-bold text-slate-800">Objectifs</h3></div>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center"><span className="text-slate-500">Sécurité visée</span><span className="font-bold text-indigo-700">{stats.rules.safetyMonths} mois</span></div>
            <div className="flex justify-between items-center"><span className="text-slate-500">Dette Max</span><span className="font-bold text-indigo-700">{stats.rules.maxDebt}%</span></div>
            <div className="pt-3 border-t border-slate-100">
                 {stats.safetyMonths >= stats.rules.safetyMonths ? (
                    <Badge color="bg-emerald-50 text-emerald-700 border border-emerald-100 flex w-full justify-center gap-2"><CheckCircle size={14}/> {stats.safetyMonths.toFixed(1)} mois d&apos;avance</Badge>
                 ) : (
                    <Badge color="bg-amber-50 text-amber-700 border border-amber-100 flex w-full justify-center gap-2"><AlertTriangle size={14}/> {stats.safetyMonths.toFixed(1)} mois d&apos;avance</Badge>
                 )}
            </div>
          </div>
        </Card>

        <div className="hidden lg:block"><Button onClick={() => router.push('/')} className="w-full"><Save size={18} /> Enregistrer et Terminer</Button></div>
      </div>

      {/* --- COLONNE GAUCHE (FORMULAIRE) --- */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* 1. IDENTITÉ */}
        <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs">1</div> Identité</h2>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                
                {/* Prénom */}
                <InputGroup label="Ton Prénom" placeholder="Tom" value={profile.firstName || ''} onChange={(val: string) => saveProfile({ ...profile, firstName: val })} />
                
                {/* --- NOUVEAU SELECTEUR DE NIVEAU --- */}
                <LevelSelector mode={mode} onChange={setMode} />
                
                <div className="w-full h-px bg-slate-100 my-2"></div>

                {/* Situation */}
                <div><label className="block text-sm font-medium text-slate-600 mb-2">Ta situation</label><PersonaSelector currentPersona={profile.persona || 'salaried'} onChange={(id: string) => saveProfile({ ...profile, persona: id })} /></div>
                
                {/* Foyer */}
                <div><label className="block text-sm font-medium text-slate-600 mb-2">Ton foyer</label><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><HouseholdCounter label="Adultes" icon={User} value={parseInt(profile.household?.adults) || 1} onChange={(v: number) => saveProfile({ ...profile, household: { ...profile.household, adults: v } })} /><HouseholdCounter label="Enfants" icon={Baby} value={parseInt(profile.household?.children) || 0} onChange={(v: number) => saveProfile({ ...profile, household: { ...profile.household, children: v } })} /></div></div>
            </div>
        </section>

        {/* 2. STOCKS (PATRIMOINE) */}
        <section>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</div> Tes Comptes (L'existant)</h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Compte Courant */}
                <div className="p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><CreditCard size={20} /></div>
                        <div><div className="font-bold text-slate-800">Compte Courant</div><div className="text-xs text-slate-500">Trésorerie active</div></div>
                    </div>
                    <div className="relative w-32">
                        <input type="number" value={profile.currentBalance || ''} onChange={(e) => saveProfile({ ...profile, currentBalance: parseFloat(e.target.value) || 0 })} className="w-full p-2 pl-3 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="0" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">€</span>
                    </div>
                </div>

                {/* Épargne Dispo */}
                <div className="p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Shield size={20} /></div>
                        <div><div className="font-bold text-slate-800">Épargne Dispo</div><div className="text-xs text-slate-500">Livret A, LDD (Sécurité)</div></div>
                    </div>
                    <div className="relative w-32">
                        <input type="number" value={profile.savings} onChange={(e) => saveProfile({ ...profile, savings: e.target.value })} className="w-full p-2 pl-3 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">€</span>
                    </div>
                </div>

                {/* Investissements (AVEC INPUT RENDEMENT CONDITIONNEL) */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 transition-colors group gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><PiggyBank size={20} /></div>
                        <div><div className="font-bold text-slate-800">Investissements</div><div className="text-xs text-slate-500">PEA, Crypto (Bloqué)</div></div>
                    </div>
                    
                    <div className="flex gap-2 items-center w-full sm:w-auto justify-end">
                        {/* Montant */}
                        <div className="relative flex-1 sm:w-32">
                            <input type="number" value={profile.investments || ''} onChange={(e) => saveProfile({ ...profile, investments: parseFloat(e.target.value) || 0 })} className="w-full p-2 pl-3 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-purple-700 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="0" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">€</span>
                        </div>
                        
                        {/* Rendement % (Visible uniquement en mode Expert) */}
                        {mode === 'expert' && (
                            <div className="relative w-20" title="Rendement moyen estimé">
                                <input type="number" value={profile.investmentYield || ''} onChange={(e) => saveProfile({ ...profile, investmentYield: parseFloat(e.target.value) || 0 })} className="w-full p-2 pl-2 pr-5 bg-slate-50 border border-slate-200 rounded-lg text-right text-xs font-bold text-slate-600 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="5" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">%</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>

        {/* 3. FLUX (BUDGET) */}
        <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2"><div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div><h2 className="text-xl font-bold text-slate-800">Tes Flux Mensuels</h2></div>
            
            {/* REVENUS - Toujours actifs */}
            <AccordionSection 
                mode={mode}
                defaultOpen={true} 
                title="Revenus (Net)" 
                icon={Wallet} 
                colorClass="text-emerald-600" 
                items={profile.incomes} 
                onItemChange={(id: any, f: any, v: any) => updateItem('incomes', id, f, v)} 
                onItemAdd={() => addItem('incomes')} 
                onItemRemove={(id: any) => removeItem('incomes', id)} 
            />
            
            {/* CHARGES FIXES - Toujours actives */}
            <AccordionSection 
                mode={mode}
                title="Charges Fixes (Obligatoire)" 
                icon={Home} 
                colorClass="text-blue-600" 
                items={profile.fixedCosts} 
                onItemChange={(id: any, f: any, v: any) => updateItem('fixedCosts', id, f, v)} 
                onItemAdd={() => addItem('fixedCosts')} 
                onItemRemove={(id: any) => removeItem('fixedCosts', id)} 
            />
            
            {/* INVESTISSEMENTS - Désactivable (pour les débutants) */}
            <AccordionSection 
                mode={mode}
                canBeDisabled={true}
                title="Investissements Mensuels" 
                icon={PiggyBank} 
                colorClass="text-purple-600" 
                items={profile.savingsContributions} 
                onItemChange={(id: any, f: any, v: any) => updateItem('savingsContributions', id, f, v)} 
                onItemAdd={() => addItem('savingsContributions')} 
                onItemRemove={(id: any) => removeItem('savingsContributions', id)} 
            />

            {/* BUDGET VARIABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><ShoppingCart size={20} /></div>
                        <div className="text-left">
                            <h3 className="font-bold text-slate-800 text-base">Budget Vie Courante</h3>
                            <div className="text-xs text-slate-500 mt-0.5">Courses, Loisirs, Essence...</div>
                        </div>
                    </div>
                    <div className="relative w-32">
                        <input 
                            type="number" 
                            value={profile.variableCosts || ''} 
                            onChange={(e) => saveProfile({ ...profile, variableCosts: parseFloat(e.target.value) || 0 })} 
                            className="w-full p-2 pl-3 pr-6 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none" 
                            placeholder="0" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">€</span>
                    </div>
                </div>
                {mode === 'expert' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400 animate-fade-in">
                        <Info size={14} className="text-indigo-400" />
                        <span>Ce montant sera lissé jour après jour dans ton calendrier.</span>
                    </div>
                )}
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase mt-6 mb-2 pl-2">Détails avancés</h3>
            <div className="grid grid-cols-1 gap-4">
                {/* CES SECTIONS SONT DÉSACTIVABLES ("J'ai pas") */}
                <AccordionSection mode={mode} canBeDisabled={true} title="Abonnements" icon={Tv} colorClass="text-purple-600" type="simple" items={profile.subscriptions} onItemChange={(id: any, f: any, v: any) => updateItem('subscriptions', id, f, v)} onItemAdd={() => addItem('subscriptions')} onItemRemove={(id: any) => removeItem('subscriptions', id)} />
                <AccordionSection mode={mode} canBeDisabled={true} title="Crédits en cours" icon={Landmark} colorClass="text-orange-600" type="simple" items={profile.credits} onItemChange={(id: any, f: any, v: any) => updateItem('credits', id, f, v)} onItemAdd={() => addItem('credits')} onItemRemove={(id: any) => removeItem('credits', id)} />
                
                {/* La section dépenses annuelles n'est affichée qu'en Expert pour ne pas surcharger */}
                {mode === 'expert' && (
                    <AccordionSection mode={mode} canBeDisabled={true} title="Dépenses Annuelles" icon={Calendar} colorClass="text-pink-600" items={profile.annualExpenses} onItemChange={(id: any, f: any, v: any) => updateItem('annualExpenses', id, f, v)} onItemAdd={() => addItem('annualExpenses')} onItemRemove={(id: any) => removeItem('annualExpenses', id)} />
                )}
            </div>
        </section>

        <div className="lg:hidden pb-8"><Button onClick={() => router.push('/')} className="w-full py-4 shadow-xl"><Save size={18} /> Enregistrer le Profil</Button></div>

      </div>
    </div>
  );
}