'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Wallet,
  TrendingDown,
} from 'lucide-react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import {
  calculateFinancials,
  formatCurrency,
  PURCHASE_TYPES,
  PAYMENT_MODES,
  generateId,
} from '@/app/lib/logic';

// PLUS DE NAVIGATION NI DE HEADER LOCAL ICI

// --- COMPOSANTS UI INTERNES ---

const Card = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}
  >
    {children}
  </div>
);

const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
}) => {
  const baseStyle =
    'px-4 py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary:
      'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200',
    secondary:
      'bg-white text-indigo-700 border border-indigo-100 hover:bg-indigo-50',
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const InputGroup = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  suffix,
}) => (
  <div>
    <label className="block text-sm font-medium text-slate-600 mb-2">
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white transition-colors"
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

// --- PAGE SIMULATEUR ---

export default function SimulatorPage() {
  const router = useRouter();
  const { profile, saveDecision, isLoaded } = useFinancialData();
  const stats = useMemo(() => calculateFinancials(profile), [profile]);

  const [step, setStep] = useState('input');
  const [purchase, setPurchase] = useState({
    name: '',
    type: 'need',
    amount: '',
    paymentMode: 'CASH_SAVINGS',
    duration: '',
    rate: '',
  });

  if (!isLoaded)
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div>
      </div>
    );

  // --- LOGIQUE DE DÉCISION ---
  const analyzePurchase = () => {
    const amount = parseFloat(purchase.amount) || 0;
    let newMatelas = stats.matelas;
    let newRecurring = stats.totalRecurring;
    let newRV = stats.remainingToLive;
    let monthlyCost = 0;

    // 1. Calcul Impacts
    if (purchase.paymentMode === 'CASH_SAVINGS') {
      newMatelas = Math.max(0, stats.matelas - amount);
    } else if (purchase.paymentMode === 'CASH_ACCOUNT') {
      newRV = stats.remainingToLive - amount;
    } else if (
      purchase.paymentMode === 'SPLIT' ||
      purchase.paymentMode === 'CREDIT'
    ) {
      const months = parseInt(purchase.duration) || 3;
      monthlyCost = amount / months;
      if (purchase.paymentMode === 'CREDIT') {
        const rate = parseFloat(purchase.rate) || 0;
        const totalCost = amount * (1 + rate / 100);
        monthlyCost = totalCost / months;
      }
      newRecurring += monthlyCost;
      newRV = stats.monthlyIncome - newRecurring;
    } else if (purchase.paymentMode === 'SUBSCRIPTION') {
      monthlyCost = amount;
      newRecurring += monthlyCost;
      newRV = stats.monthlyIncome - newRecurring;
    }

    const newSafetyMonths =
      stats.essentialExpenses > 0 ? newMatelas / stats.essentialExpenses : 0;

    const newEngagementRate =
      stats.monthlyIncome > 0
        ? ((stats.essentialExpenses +
            stats.monthlySubs +
            stats.monthlyCredits +
            monthlyCost) /
            stats.monthlyIncome) *
          100
        : 0;

    // 2. Règles & Verdict
    const issues = [];
    let score = 100;

    if (newSafetyMonths < 1.5) {
      issues.push({
        level: 'red',
        text: `Matelas en danger (${newSafetyMonths.toFixed(1)} mois).`,
      });
      score -= 50;
    } else if (newSafetyMonths < 3) {
      issues.push({
        level: 'orange',
        text: `Matelas sous les 3 mois de sécurité.`,
      });
      score -= 20;
    }

    if (newRV < 0) {
      issues.push({
        level: 'red',
        text: `Tu finis dans le rouge (${formatCurrency(newRV)}).`,
      });
      score -= 100;
    } else if (newRV < 200) {
      issues.push({
        level: 'orange',
        text: `Reste à vivre très faible (${formatCurrency(newRV)}).`,
      });
      score -= 30;
    }

    if (newEngagementRate > 45) {
      issues.push({
        level: 'red',
        text: `Endettement critique : ${newEngagementRate.toFixed(0)}%.`,
      });
      score -= 40;
    }

    if (purchase.type === 'desire' && score < 75) {
      issues.push({
        level: 'orange',
        text: "Pour une 'Envie', ta situation doit être solide.",
      });
      score -= 10;
    }

    let verdict = 'green';
    if (score < 50 || issues.some((i) => i.level === 'red')) verdict = 'red';
    else if (score < 80 || issues.some((i) => i.level === 'orange'))
      verdict = 'orange';

    return { verdict, score, issues, newMatelas, newRV, newSafetyMonths };
  };

  const result = step === 'result' ? analyzePurchase() : null;

  const handleSave = () => {
    const decision = {
      id: generateId(),
      date: new Date().toISOString(),
      purchase,
      result,
    };
    saveDecision(decision);
    setStep('input');
    setPurchase({
      name: '',
      type: 'need',
      amount: '',
      paymentMode: 'CASH_SAVINGS',
      duration: '',
      rate: '',
    });
    alert("Décision enregistrée dans l'historique !");
  };

  // --- VISUEL DU RÉSULTAT ---
  const theme = result
    ? {
        green: {
          bg: 'bg-emerald-500',
          icon: CheckCircle,
          title: 'Feu Vert',
          text: 'Achat raisonnable.',
        },
        orange: {
          bg: 'bg-amber-500',
          icon: AlertTriangle,
          title: 'À surveiller',
          text: "C'est limite, attention.",
        },
        red: {
          bg: 'bg-rose-500',
          icon: XCircle,
          title: 'Pas maintenant',
          text: 'Trop risqué pour ta situation.',
        },
      }[result.verdict]
    : {};

  const ResultIcon = theme?.icon;

  return (
    // On retourne directement la grille, le Layout s'occupe du cadre
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      
      {/* --- COLONNE PRINCIPALE (Formulaire / Résultat) --- */}
      <div className="lg:col-span-7 xl:col-span-8">
        {/* MODE SAISIE (INPUT) */}
        {step === 'input' && (
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              Décris ton achat
            </h2>

            <div className="space-y-6">
              <InputGroup
                label="C'est quoi ?"
                placeholder="iPhone, Réparation auto..."
                value={purchase.name}
                onChange={(v) => setPurchase({ ...purchase, name: v })}
              />

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Quel type d&apos;achat ?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(PURCHASE_TYPES).map((type) => (
                    <button
                      key={type.id}
                      onClick={() =>
                        setPurchase({ ...purchase, type: type.id })
                      }
                      className={`p-3 rounded-lg text-sm font-medium border-2 transition-all ${
                        purchase.type === type.id
                          ? type.color
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <InputGroup
                label="Montant total"
                type="number"
                placeholder="0"
                suffix="€"
                value={purchase.amount}
                onChange={(v) => setPurchase({ ...purchase, amount: v })}
              />

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Comment tu paies ?
                </label>
                <select
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                  value={purchase.paymentMode}
                  onChange={(e) =>
                    setPurchase({ ...purchase, paymentMode: e.target.value })
                  }
                >
                  {Object.entries(PAYMENT_MODES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {(purchase.paymentMode === 'SPLIT' ||
                purchase.paymentMode === 'CREDIT') && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <InputGroup
                    label="Durée (mois)"
                    type="number"
                    value={purchase.duration}
                    onChange={(v) =>
                      setPurchase({ ...purchase, duration: v })
                    }
                  />
                  {purchase.paymentMode === 'CREDIT' && (
                    <InputGroup
                      label="Taux (%)"
                      type="number"
                      value={purchase.rate}
                      onChange={(v) => setPurchase({ ...purchase, rate: v })}
                    />
                  )}
                </div>
              )}

              <div className="pt-4">
                <Button
                  onClick={() => setStep('result')}
                  className="w-full md:w-auto md:px-8"
                  disabled={!purchase.amount || !purchase.name}
                >
                  Analyser l&apos;achat
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODE RÉSULTAT */}
        {step === 'result' && result && (
          <div className="space-y-6 animate-fade-in">
            <button
              onClick={() => setStep('input')}
              className="text-slate-500 flex items-center gap-1 text-sm font-medium hover:text-indigo-600 transition-colors"
            >
              ← Modifier la saisie
            </button>

            <div
              className={`${theme.bg} text-white rounded-2xl p-8 shadow-lg text-center relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <ResultIcon size={56} className="mx-auto mb-4 relative z-10" />
              <h2 className="text-4xl font-bold relative z-10 mb-2">
                {theme.title}
              </h2>
              <p className="text-white/90 text-lg relative z-10">
                {theme.text}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-700 text-lg">
                Analyse détaillée
              </h3>
              {result.issues.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex gap-4 items-start">
                  <CheckCircle
                    className="text-emerald-600 shrink-0"
                    size={24}
                  />
                  <div>
                    <p className="font-bold text-emerald-900">
                      Tout est ok !
                    </p>
                    <p className="text-sm text-emerald-800 mt-1">
                      Ton budget permet cet achat sans mettre en danger ta
                      sécurité financière actuelle.
                    </p>
                  </div>
                </div>
              ) : (
                result.issues.map((issue, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl flex gap-3 border items-start ${
                      issue.level === 'red'
                        ? 'bg-rose-50 border-rose-100 text-rose-800'
                        : 'bg-amber-50 border-amber-100 text-amber-800'
                    }`}
                  >
                    <Info size={20} className="shrink-0 mt-0.5" />
                    <p className="font-medium">{issue.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- SIDEBAR DROITE (Contexte & Actions) --- */}
      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
        
        {/* Si Input : Affiche le contexte financier */}
        {step === 'input' && (
          <Card className="p-6 bg-slate-50/50 border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Wallet size={20} className="text-slate-400" />
              Situation Actuelle
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Reste à vivre</span>
                <span className="font-bold text-slate-700">
                  {formatCurrency(stats.remainingToLive)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Épargne dispo</span>
                <span className="font-bold text-slate-700">
                  {formatCurrency(stats.matelas)}
                </span>
              </div>
              <div className="h-px bg-slate-200 my-2"></div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Info size={16} />
                <p>Basé sur ton profil financier.</p>
              </div>
            </div>
          </Card>
        )}

        {/* Si Resultat : Affiche l'impact et les actions */}
        {step === 'result' && result && (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-6 border-indigo-100 shadow-md">
              <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <TrendingDown size={20} /> Impact immédiat
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">
                    Nouveau Matelas
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="font-bold text-slate-800 text-2xl">
                      {formatCurrency(result.newMatelas)}
                    </div>
                    <div
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        result.newSafetyMonths < 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {result.newSafetyMonths.toFixed(1)} mois sécu
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100"></div>

                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">
                    Nouveau Reste à Vivre
                  </div>
                  <div className="font-bold text-slate-800 text-2xl">
                    {formatCurrency(result.newRV)}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <Button onClick={handleSave} className="w-full shadow-xl">
                Enregistrer dans l&apos;historique
              </Button>
              <Button
                variant="secondary"
                onClick={() => setStep('input')}
                className="w-full"
              >
                Refaire un test
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}