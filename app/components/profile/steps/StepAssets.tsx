'use client';

import {
  ShieldCheck,
  ArrowRight,
  Trash2,
  Loader2,
  TrendingUp,
  Wallet,
  Landmark,
  Key,
  Briefcase,
  Building2,
  Building,
  Coins,
  Gem,
  PiggyBank,
} from 'lucide-react';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import AssetChart from '@/app/components/AssetChart';
import { WizardLayout } from '../ProfileWizardLayout';
import { ASSET_TYPES, formatCurrency } from '@/app/lib/definitions';
import { AssetType } from '@/app/lib/definitions';
import { generateIdHelper } from '../ProfileWizard.mappers';
import type { StepProps } from '../ProfileWizard.types';
import type { LucideIcon } from 'lucide-react';

const ICON_MAPPING: Record<string, LucideIcon> = {
  [AssetType.CC]: Wallet,
  [AssetType.PEA]: TrendingUp,
  [AssetType.AV]: ShieldCheck,
  [AssetType.CTO]: TrendingUp,
  [AssetType.PER]: PiggyBank,
  [AssetType.LIVRET]: Landmark,
  lep: Landmark,
  pel: Key,
  [AssetType.PEE]: Briefcase,
  immo_paper: Building2,
  immo_phys: Building,
  [AssetType.CRYPTO]: Coins,
  [AssetType.GOLD]: Gem,
};

export function StepAssets({
  formData,
  updateForm,
  addItem,
  removeItem,
  updateItem,
  onNext,
  onPrev,
  error,
  editMode,
  onSave,
  isSaving,
  hideFooter,
}: StepProps) {
  const hasAsset = (labelSubString: string) => {
    return formData.assetsUi.some((i) =>
      i.name.toLowerCase().includes(labelSubString.toLowerCase().split('/')[0].trim())
    );
  };

  const toggleAsset = (type: (typeof ASSET_TYPES)[number]) => {
    if (hasAsset(type.label)) return;
    const newList = [
      ...formData.assetsUi,
      { id: generateIdHelper(), name: type.label, type: type.id, stock: 0, monthlyFlow: 0, transferDay: 1 },
    ];
    updateForm({ ...formData, assetsUi: newList });
  };

  const updateAssetRow = (id: string, field: 'stock' | 'monthlyFlow' | 'transferDay' | 'name', value: string | number) => {
    const newList = formData.assetsUi.map((a) => (a.id === id ? { ...a, [field]: value } : a));
    updateForm({ ...formData, assetsUi: newList });
  };

  const removeAssetRow = (id: string) => {
    updateForm({ ...formData, assetsUi: formData.assetsUi.filter((a) => a.id !== id) });
  };

  const totalAssets = formData.assetsUi.reduce((acc, item) => acc + (item.stock || 0), 0);

  return (
    <WizardLayout
      title="Ton argent"
      subtitle="Tes comptes et investissements."
      icon={ShieldCheck}
      error={error}
      compact={editMode}
      footer={
        hideFooter
          ? undefined
          : editMode && onSave
            ? (
                <Button onClick={() => onSave?.()} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="animate-spin" /> : 'C\'est bon'}
                </Button>
              )
            : (
                <>
                  <Button variant="ghost" onClick={onPrev}>
                    Retour
                  </Button>
                  <Button onClick={onNext} className="w-full sm:w-auto" size="lg">
                    Voir où t&apos;en es <ArrowRight className="ml-2" size={18} />
                  </Button>
                </>
              )
      }
    >
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
            Qu&apos;est-ce que tu as de côté ?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ASSET_TYPES.map((type) => {
              const isSelected = hasAsset(type.label);
              const Icon = ICON_MAPPING[type.id] || ICON_MAPPING[type.id.toUpperCase()] || TrendingUp;
              return (
                <button
                  key={type.id}
                  onClick={() => toggleAsset(type)}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all duration-200 group ${isSelected ? `${type.bg} ${type.border} ring-1 ring-offset-1 ring-indigo-100` : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/80' : 'bg-slate-50'} ${type.color}`}>
                      <Icon size={18} />
                    </div>
                    {isSelected && (
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white ${type.color}`}>
                        Ajouté !
                      </div>
                    )}
                  </div>
                  <div className={`font-bold text-sm ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                    {type.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {formData.assetsUi.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-white rounded-md shadow-sm text-slate-500">
                <TrendingUp size={16} />
              </div>
              <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Détail de tes comptes
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {formData.assetsUi.map((item) => {
                const isCC =
                  item.type === 'CC' || item.type === 'cc' || item.name.toLowerCase().includes('courant');
                return (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${isCC ? 'bg-slate-400' : 'bg-indigo-500'}`}
                        />
                        {item.name}
                      </div>
                      {!isCC && (
                        <button
                          onClick={() => removeAssetRow(item.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div className={`grid ${isCC ? 'grid-cols-1' : 'grid-cols-12'} gap-4`}>
                      <div className={isCC ? 'col-span-1' : 'col-span-5'}>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Solde actuel
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            className="block w-full rounded-lg border-slate-200 bg-slate-50 p-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="0"
                            value={item.stock || ''}
                            onChange={(e) =>
                              updateAssetRow(item.id, 'stock', parseFloat(e.target.value) || 0)
                            }
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-slate-400 text-xs">€</span>
                          </div>
                        </div>
                      </div>
                      {!isCC && (
                        <>
                          <div className="col-span-4">
                            <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">
                              Versement / mois
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                className="block w-full rounded-lg border-indigo-100 bg-indigo-50/50 p-2 text-sm font-bold text-indigo-900 focus:border-indigo-500 focus:ring-indigo-500"
                                placeholder="0"
                                value={item.monthlyFlow || ''}
                                onChange={(e) =>
                                  updateAssetRow(item.id, 'monthlyFlow', parseFloat(e.target.value) || 0)
                                }
                              />
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-indigo-400 text-xs">€</span>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              Jour du mois
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={31}
                                className="block w-full rounded-lg border-slate-200 bg-white p-2 text-sm font-medium text-slate-700 text-center"
                                placeholder="1"
                                value={item.transferDay || ''}
                                onChange={(e) =>
                                  updateAssetRow(item.id, 'transferDay', parseFloat(e.target.value) || 1)
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <AssetChart
                      assetId={item.id}
                      assetName={item.name}
                      className="mt-3 pt-3 border-t border-slate-100"
                    />
                  </div>
                );
              })}
            </div>

            <Card className="p-4 bg-slate-900 text-white flex justify-between items-center rounded-xl shadow-lg shadow-slate-200/50">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Total estimé
                </span>
                <span className="text-xs text-slate-500">Cash + investissements</span>
              </div>
              <span className="text-2xl font-black">{formatCurrency(totalAssets)}</span>
            </Card>
          </div>
        )}
      </div>
    </WizardLayout>
  );
}
