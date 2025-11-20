'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import {
  calculateFinancials,
  formatCurrency,
  generateId,
} from '@/app/lib/logic';
// 1. IMPORT NAVIGATION
import Navigation from '@/app/components/Navigation';

import {
  Trash2,
  Plus,
  Shield,
  ArrowLeft,
  Save,
  Wallet,
  Home,
  Tv,
  Landmark,
  Calendar,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

// --- COMPOSANTS UI ---

const Card = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}
  >
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = '' }) => {
  const baseStyle =
    'px-4 py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95';
  const variants = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200',
    secondary:
      'bg-white text-indigo-700 border border-indigo-100 hover:bg-indigo-50',
    ghost:
      'bg-transparent text-slate-500 hover:text-indigo-600 hover:bg-indigo-50',
  };
  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// Section unifiée
const ProfileSection = ({
  title,
  icon: Icon,
  items = [],
  onItemChange,
  onItemAdd,
  onItemRemove,
  type = 'standard',
  colorClass = 'text-slate-800',
}) => {
  const subTotal = items.reduce((acc, item) => {
    let val = parseFloat(item.amount) || 0;
    if (item.frequency === 'annuel') val = val / 12;
    return acc + val;
  }, 0);

  return (
    <Card className="overflow-hidden mb-6 animate-fade-in">
      <div className="p-4 md:p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-white shadow-sm ${colorClass}`}>
            {Icon && <Icon size={20} />}
          </div>
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
        </div>
        {subTotal > 0 && (
          <div className="text-sm font-medium text-slate-500">
            ~{formatCurrency(subTotal)}
            <span className="text-xs">/mois</span>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col sm:flex-row gap-3 items-start sm:items-center pb-4 sm:pb-0 border-b border-dashed border-slate-100 sm:border-none last:pb-0"
          >
            <div className="w-full sm:flex-1">
              <label className="block sm:hidden text-xs font-bold text-slate-400 mb-1">
                Nom
              </label>
              <input
                type="text"
                placeholder="Ex: Loyer, Salaire..."
                value={item.name}
                onChange={(e) => onItemChange(item.id, 'name', e.target.value)}
                className="w-full p-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-sm font-medium transition-colors outline-none"
              />
            </div>

            <div className="flex w-full sm:w-auto gap-2">
              <div className="flex-1 sm:w-32 relative">
                <label className="block sm:hidden text-xs font-bold text-slate-400 mb-1">
                  Montant
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={item.amount}
                  onChange={(e) =>
                    onItemChange(item.id, 'amount', e.target.value)
                  }
                  className="w-full p-2.5 pl-3 pr-8 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-sm font-bold text-slate-800 transition-colors outline-none text-right sm:text-left"
                />
                <span className="absolute right-3 top-1/2 sm:top-1/2 -translate-y-1/2 sm:-translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                  €
                </span>
              </div>

              {type === 'standard' && (
                <div className="w-28 sm:w-auto">
                  <label className="block sm:hidden text-xs font-bold text-slate-400 mb-1">
                    Fréq.
                  </label>
                  <select
                    value={item.frequency || 'mensuel'}
                    onChange={(e) =>
                      onItemChange(item.id, 'frequency', e.target.value)
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:border-indigo-500 outline-none"
                  >
                    <option value="mensuel">/mois</option>
                    <option value="annuel">/an</option>
                  </select>
                </div>
              )}

              <div className="flex items-end">
                <button
                  onClick={() => onItemRemove(item.id)}
                  className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer la ligne"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={onItemAdd}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-semibold text-sm flex items-center justify-center gap-2 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
        >
          <Plus size={16} /> Ajouter une ligne
        </button>
      </div>
    </Card>
  );
};

// --- PAGE PRINCIPALE ---

export default function ProfilePage() {
  const { profile, saveProfile, isLoaded } = useFinancialData();
  const router = useRouter();
  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  if (!isLoaded)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
          <div className="h-4 w-32 bg-slate-200 rounded"></div>
        </div>
      </div>
    );

  const updateItem = (listName, id, field, value) => {
    const list = profile[listName] || [];
    const newList = list.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    saveProfile({ ...profile, [listName]: newList });
  };

  const addItem = (listName) => {
    const newItem = {
      id: generateId(),
      name: '',
      amount: '',
      frequency: 'mensuel',
    };
    const currentList = profile[listName] || [];
    saveProfile({ ...profile, [listName]: [...currentList, newItem] });
  };

  const removeItem = (listName, id) => {
    const list = profile[listName] || [];
    const newList = list.filter((item) => item.id !== id);
    saveProfile({ ...profile, [listName]: newList });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-32 md:pb-12">
      {/* NAVIGATION AJOUTÉE */}
      <Navigation />

      <div className="md:pl-64 transition-all duration-300">
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="md:hidden flex items-center gap-2 text-slate-600 hover:text-indigo-700 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Retour</span>
            </button>
            {/* Sur Desktop, on centre le titre ou on l'aligne à gauche car il n'y a pas de bouton retour */}
            <h1 className="text-lg font-bold text-slate-800 flex-1 text-center md:text-left md:pl-4">
              Mon Profil Financier
            </h1>
            <div className="w-8 md:hidden"></div> {/* Spacer Mobile */}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 md:pt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* SIDEBAR (Résumé) */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-indigo-200/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10 pointer-events-none"></div>

                <h2 className="text-sm font-bold text-indigo-200 uppercase tracking-wider mb-6">
                  Situation Mensuelle
                </h2>

                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-emerald-300 text-sm">
                      <TrendingUp size={16} /> Revenus
                    </div>
                    <span className="font-bold text-lg">
                      {formatCurrency(stats.monthlyIncome)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-orange-300 text-sm">
                      <TrendingDown size={16} /> Charges Fixes
                    </div>
                    <span className="font-bold text-lg text-orange-100">
                      - {formatCurrency(stats.totalRecurring)}
                    </span>
                  </div>

                  <div className="h-px bg-white/10 my-2"></div>

                  <div className="flex justify-between items-end">
                    <div className="text-sm text-slate-400">Reste à vivre</div>
                    <div className="text-3xl font-bold text-white tracking-tight">
                      {formatCurrency(stats.remainingToLive)}
                    </div>
                  </div>
                </div>
              </div>

              <Card className="p-6 border-t-4 border-t-emerald-500">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Shield size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800">
                    Matelas de Sécurité
                  </h3>
                </div>

                <div className="space-y-3">
                  <label className="text-sm text-slate-500 font-medium">
                    Combien as-tu de côté ?
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={profile.savings}
                      onChange={(e) =>
                        saveProfile({ ...profile, savings: e.target.value })
                      }
                      className="w-full text-2xl font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 pl-4 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      €
                    </span>
                  </div>

                  <div
                    className={`text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2 ${
                      stats.safetyMonths < 3
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {stats.safetyMonths < 3 ? '⚠️' : '✅'} Tu as{' '}
                    <strong>{stats.safetyMonths.toFixed(1)} mois</strong>{' '}
                    d&apos;avance.
                  </div>
                </div>
              </Card>

              <div className="hidden lg:block">
                <Button onClick={() => router.push('/')} className="w-full">
                  <Save size={18} /> Enregistrer et Terminer
                </Button>
              </div>
            </div>

            {/* FORMS */}
            <div className="lg:col-span-8">
              <div className="space-y-8">
                <ProfileSection
                  title="Revenus"
                  icon={Wallet}
                  colorClass="text-emerald-600"
                  items={profile.incomes}
                  onItemChange={(id, f, v) => updateItem('incomes', id, f, v)}
                  onItemAdd={() => addItem('incomes')}
                  onItemRemove={(id) => removeItem('incomes', id)}
                />

                <ProfileSection
                  title="Charges Fixes (Logement, Assurances...)"
                  icon={Home}
                  colorClass="text-blue-600"
                  items={profile.fixedCosts}
                  onItemChange={(id, f, v) =>
                    updateItem('fixedCosts', id, f, v)
                  }
                  onItemAdd={() => addItem('fixedCosts')}
                  onItemRemove={(id) => removeItem('fixedCosts', id)}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProfileSection
                    title="Abonnements"
                    icon={Tv}
                    colorClass="text-purple-600"
                    type="simple"
                    items={profile.subscriptions}
                    onItemChange={(id, f, v) =>
                      updateItem('subscriptions', id, f, v)
                    }
                    onItemAdd={() => addItem('subscriptions')}
                    onItemRemove={(id) => removeItem('subscriptions', id)}
                  />

                  <ProfileSection
                    title="Crédits en cours"
                    icon={Landmark}
                    colorClass="text-orange-600"
                    type="simple"
                    items={profile.credits}
                    onItemChange={(id, f, v) => updateItem('credits', id, f, v)}
                    onItemAdd={() => addItem('credits')}
                    onItemRemove={(id) => removeItem('credits', id)}
                  />
                </div>

                <ProfileSection
                  title="Dépenses Annuelles (lissées)"
                  icon={Calendar}
                  colorClass="text-pink-600"
                  items={profile.annualExpenses}
                  onItemChange={(id, f, v) =>
                    updateItem('annualExpenses', id, f, v)
                  }
                  onItemAdd={() => addItem('annualExpenses')}
                  onItemRemove={(id) => removeItem('annualExpenses', id)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
