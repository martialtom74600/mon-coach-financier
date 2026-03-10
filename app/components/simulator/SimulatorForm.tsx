'use client';

import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import InputGroup from '@/app/components/ui/InputGroup';
import ContextToggle from '@/app/components/ui/ContextToggle';
import { PURCHASE_TYPES, PAYMENT_MODES } from '@/app/lib/definitions';
import type { PurchaseType, PaymentMode } from '@/app/lib/definitions';
import { RefreshCw, Briefcase, CalendarDays, ShoppingBag } from 'lucide-react';

export interface PurchaseFormState {
  name: string;
  type: PurchaseType;
  amount: string;
  date: string;
  paymentMode: PaymentMode;
  duration: string;
  rate: string;
  isReimbursable: boolean;
  isPro: boolean;
}

interface SimulatorFormProps {
  purchase: PurchaseFormState;
  setPurchase: React.Dispatch<React.SetStateAction<PurchaseFormState>>;
  onAnalyze: () => void;
}

export function SimulatorForm({ purchase, setPurchase, onAnalyze }: SimulatorFormProps) {
  const dateLabel =
    purchase.paymentMode === 'SPLIT' || purchase.paymentMode === 'CREDIT'
      ? "Date de la 1ère échéance"
      : "Date de l'achat";

  return (
    <>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShoppingBag className="text-indigo-600" /> Simulateur d&apos;achat
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Cet achat, il rentre dans ton budget sans casser tes objectifs ?
        </p>
      </div>
      <Card className="p-6 md:p-8">
        <div className="space-y-6">
          <InputGroup
            label="C'est quoi ?"
            placeholder="iPhone, Réparation..."
            value={purchase.name}
            onChange={(v: string) => setPurchase({ ...purchase, name: v })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Quel type d&apos;achat ?</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.values(PURCHASE_TYPES).map((type) => (
                <button
                  key={type.id}
                  onClick={() => setPurchase({ ...purchase, type: type.id as PurchaseType })}
                  className={`p-3 rounded-lg text-sm font-medium border-2 transition-all text-left sm:text-center group ${purchase.type === type.id ? type.color : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                >
                  <div className="font-bold mb-1">{type.label}</div>
                  <div className="text-xs opacity-70 font-normal hidden sm:block">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup
              label="Montant total"
              type="number"
              placeholder="0"
              suffix="€"
              value={purchase.amount}
              onChange={(v: string) => setPurchase({ ...purchase, amount: v })}
            />
            <InputGroup
              label={dateLabel}
              type="date"
              value={purchase.date}
              onChange={(v: string) => setPurchase({ ...purchase, date: v })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Comment tu paies ?</label>
            <select
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              value={purchase.paymentMode}
              onChange={(e) => setPurchase({ ...purchase, paymentMode: e.target.value as PaymentMode })}
            >
              {Object.entries(PAYMENT_MODES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {(purchase.paymentMode === 'SPLIT' || purchase.paymentMode === 'CREDIT') && (
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-4 animate-fade-in">
              <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                <CalendarDays size={16} /> Détails de l&apos;échéancier
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup
                  label="Durée (mois)"
                  type="number"
                  value={purchase.duration}
                  onChange={(v: string) => setPurchase({ ...purchase, duration: v })}
                />
                {purchase.paymentMode === 'CREDIT' && (
                  <InputGroup
                    label="Taux (%)"
                    type="number"
                    value={purchase.rate}
                    onChange={(v: string) => setPurchase({ ...purchase, rate: v })}
                  />
                )}
              </div>
            </div>
          )}

          <div className="pt-2 space-y-3">
            <label className="block text-sm font-medium text-slate-600">
              Contexte particulier (optionnel)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ContextToggle
                label="Avance / Remboursable"
                subLabel="Je serai remboursé"
                icon={RefreshCw}
                checked={purchase.isReimbursable}
                onChange={(v: boolean) => setPurchase({ ...purchase, isReimbursable: v })}
              />
              <ContextToggle
                label="Investissement / Pro"
                subLabel="Ça va me rapporter de l'argent"
                icon={Briefcase}
                checked={purchase.isPro}
                onChange={(v: boolean) => setPurchase({ ...purchase, isPro: v })}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={onAnalyze}
              className="w-full md:w-auto md:px-8"
              disabled={!purchase.amount || !purchase.name}
            >
              Analyser l&apos;achat
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
