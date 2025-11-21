'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Wallet,
  TrendingDown,
  ArrowLeft,
  Save,
  RefreshCcw,
  Clock,
  TrendingUp,
  PiggyBank,
  Lightbulb,
  Settings,
  Briefcase,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Brain,
  AlertOctagon,
  Target,
  ArrowRightCircle,
  Tag,
  CreditCard
} from 'lucide-react';
import { useFinancialData } from '@/app/hooks/useFinancialData';
import {
  calculateFinancials,
  analyzePurchaseImpact,
  formatCurrency,
  PURCHASE_TYPES,
  PAYMENT_MODES,
  generateId,
} from '@/app/lib/logic';

// --- COMPOSANTS UI INTERNES ---

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
}: any) => {
  const baseStyle =
    'px-4 py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed';
  
  const variants: any = {
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
}: any) => (
  <div>
    <label className="block text-sm font-medium text-slate-600 mb-2">
      {label}
    </label>
    <div className="relative">
      <input
        type={type}
        min="0"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
            const val = e.target.value;
            if (type === 'number' && parseFloat(val) < 0) return;
            onChange(val);
        }}
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

const ContextToggle = ({ label, subLabel, icon: Icon, checked, onChange }: any) => (
  <label className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 ${checked ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
    <div className={`p-2 rounded-lg ${checked ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <div className={`font-bold text-sm ${checked ? 'text-indigo-900' : 'text-slate-700'}`}>{label}</div>
      <div className="text-xs text-slate-500 mt-0.5">{subLabel}</div>
    </div>
    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${checked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
      {checked && <CheckCircle size={14} className="text-white" />}
    </div>
    <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
  </label>
);

// --- COMPOSANT RÉCAPITULATIF ACHAT (NOUVEAU) ---
const PurchaseRecap = ({ purchase }: { purchase: any }) => {
  // Mapping sécurisé pour retrouver les labels
  const typeKey = purchase.type.toUpperCase();
  // @ts-ignore
  const typeInfo = PURCHASE_TYPES[typeKey] || { label: purchase.type, color: 'bg-gray-100 text-gray-600' };
  // @ts-ignore
  const paymentLabel = PAYMENT_MODES[purchase.paymentMode] || purchase.paymentMode;

  return (
    <Card className="p-5 border-slate-200 bg-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-slate-800">{purchase.name}</h3>
            {purchase.isPro && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Pro
                </span>
            )}
            {purchase.isReimbursable && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Remboursable
                </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
                <Tag size={14} />
                <span>{typeInfo.label}</span>
            </div>
            <div className="w-px h-3 bg-slate-300 self-center"></div>
            <div className="flex items-center gap-1.5">
                <CreditCard size={14} />
                <span>{paymentLabel}</span>
            </div>
            {(purchase.paymentMode === 'CREDIT' || purchase.paymentMode === 'SPLIT') && (
                <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                    {purchase.duration} mois {purchase.rate ? `@ ${purchase.rate}%` : ''}
                </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
            <div className="text-3xl font-bold text-indigo-600 tracking-tight">
                {formatCurrency(purchase.amount)}
            </div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">
                Montant total
            </div>
        </div>
      </div>
    </Card>
  );
};

// --- CARTE DIAGNOSTIC V4 : MULTI-TIPS ---
const DiagnosticCard = ({ result }: { result: any }) => {
  const [showDetails, setShowDetails] = useState(true);

  const theme = {
    green: { bg: 'bg-emerald-600', icon: CheckCircle, title: 'Feu Vert' },
    orange: { bg: 'bg-amber-500', icon: AlertTriangle, title: 'À surveiller' },
    red: { bg: 'bg-rose-600', icon: XCircle, title: 'Pas maintenant' },
  }[result.verdict as 'green' | 'orange' | 'red'];

  const Icon = theme.icon;

  const tipStyles: any = {
    stop: { icon: AlertOctagon, bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-100' },
    warning: { icon: AlertTriangle, bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-100' },
    action: { icon: ArrowRightCircle, bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-100' },
    investor: { icon: TrendingUp, bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-100' },
    time: { icon: Clock, bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100' },
    psychology: { icon: Brain, bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-100' },
    success: { icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-100' },
    info: { icon: Info, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100' }
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-100 animate-fade-in">
      {/* EN-TÊTE */}
      <div className={`${theme.bg} p-6 text-white flex items-center gap-4 relative overflow-hidden`}>
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <Icon size={40} className="shrink-0 relative z-10" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">{theme.title}</h2>
          <p className="text-white/90 text-sm font-medium opacity-90">Analyse terminée</p>
        </div>
      </div>

      {/* CORPS : LISTE DES CONSEILS */}
      <div className="bg-white p-6 space-y-4">
        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide flex items-center gap-2">
            <Target size={16} /> L&apos;avis du Coach
        </h3>
        
        <div className="space-y-3">
            {result.tips.map((tip: any, i: number) => {
                const style = tipStyles[tip.type] || tipStyles.info;
                const TipIcon = style.icon;
                return (
                    <div key={i} className={`p-4 rounded-xl border flex gap-4 items-start ${style.bg} ${style.border}`}>
                        <div className={`p-2 bg-white rounded-full shrink-0 ${style.text} shadow-sm`}>
                            <TipIcon size={18} />
                        </div>
                        <div>
                            <h4 className={`font-bold text-sm mb-1 ${style.text}`}>{tip.title}</h4>
                            <p className={`text-sm leading-relaxed opacity-90 ${style.text}`}>{tip.text}</p>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* PIED : POINTS D'ATTENTION TECHNIQUES */}
        {result.issues.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mb-3"
            >
              <span>{result.issues.length} Indicateurs techniques</span>
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showDetails && (
              <div className="space-y-2 animate-slide-up">
                {result.issues.map((issue: any, i: number) => (
                  <div key={i} className="text-xs font-medium text-slate-500 flex gap-2 items-center ml-1">
                    <div className={`w-2 h-2 rounded-full ${issue.level === 'red' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                    {issue.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- PAGE SIMULATEUR ---

export default function SimulatorPage() {
  const router = useRouter();
  const { profile, saveDecision, isLoaded } = useFinancialData();
  
  const stats = useMemo(() => calculateFinancials(profile), [profile]);
  const isProfileEmpty = stats.monthlyIncome === 0 && stats.matelas === 0;

  const [step, setStep] = useState<'input' | 'result'>('input');
  const [isSaving, setIsSaving] = useState(false);
  
  const [purchase, setPurchase] = useState({
    name: '',
    type: 'need',
    amount: '',
    paymentMode: 'CASH_SAVINGS',
    duration: '',
    rate: '',
    isReimbursable: false,
    isPro: false,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const result = useMemo(() => {
    if (step === 'result') {
      return analyzePurchaseImpact(stats, purchase);
    }
    return null;
  }, [step, stats, purchase]);

  const handleSave = async () => {
    if (!result) return;
    
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 600));

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
      isReimbursable: false,
      isPro: false,
    });
    setIsSaving(false);
  };

  if (!isLoaded) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-pulse h-12 w-12 bg-slate-200 rounded-full"></div></div>;

  if (isProfileEmpty) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-6"><Settings size={48} /></div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Profil manquant</h2>
        <p className="text-slate-500 max-w-md mb-8">Pour analyser tes achats, configure d&apos;abord ton profil.</p>
        <Button onClick={() => router.push('/profile')}>Configurer mon Profil</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
      
      {/* --- COLONNE GAUCHE --- */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-6">
        
        {step === 'input' && (
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Décris ton achat</h2>
            <div className="space-y-6">
              <InputGroup label="C'est quoi ?" placeholder="iPhone, Réparation..." value={purchase.name} onChange={(v: string) => setPurchase({ ...purchase, name: v })} />
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Quel type d&apos;achat ?</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {Object.values(PURCHASE_TYPES).map((type) => (
                    <button key={type.id} onClick={() => setPurchase({ ...purchase, type: type.id })} className={`p-3 rounded-lg text-sm font-medium border-2 transition-all text-left sm:text-center group ${purchase.type === type.id ? type.color : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                      <div className="font-bold mb-1">{type.label}</div>
                      <div className="text-xs opacity-70 font-normal hidden sm:block">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>
              <InputGroup label="Montant total" type="number" placeholder="0" suffix="€" value={purchase.amount} onChange={(v: string) => setPurchase({ ...purchase, amount: v })} />
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Comment tu paies ?</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500" value={purchase.paymentMode} onChange={(e) => setPurchase({ ...purchase, paymentMode: e.target.value })}>
                  {Object.entries(PAYMENT_MODES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </div>
              {(purchase.paymentMode === 'SPLIT' || purchase.paymentMode === 'CREDIT') && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <InputGroup label="Durée (mois)" type="number" value={purchase.duration} onChange={(v: string) => setPurchase({ ...purchase, duration: v })} />
                  {purchase.paymentMode === 'CREDIT' && <InputGroup label="Taux (%)" type="number" value={purchase.rate} onChange={(v: string) => setPurchase({ ...purchase, rate: v })} />}
                </div>
              )}
              <div className="pt-2 space-y-3">
                <label className="block text-sm font-medium text-slate-600">Contexte particulier (optionnel)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ContextToggle label="Avance / Remboursable" subLabel="Je serai remboursé" icon={RefreshCw} checked={purchase.isReimbursable} onChange={(v: boolean) => setPurchase({ ...purchase, isReimbursable: v })} />
                    <ContextToggle label="Investissement / Pro" subLabel="Ça va me rapporter de l'argent" icon={Briefcase} checked={purchase.isPro} onChange={(v: boolean) => setPurchase({ ...purchase, isPro: v })} />
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={() => setStep('result')} className="w-full md:w-auto md:px-8" disabled={!purchase.amount || !purchase.name}>Analyser l&apos;achat</Button>
              </div>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-6 animate-fade-in">
            <button onClick={() => setStep('input')} className="text-slate-500 flex items-center gap-1 text-sm font-medium hover:text-indigo-600 transition-colors">
              <ArrowLeft size={16} /> Modifier la saisie
            </button>
            
            {/* NOUVEAU : RÉCAPITULATIF DE L'ACHAT */}
            <PurchaseRecap purchase={purchase} />

            {/* CARTE DIAGNOSTIC V4 */}
            <DiagnosticCard result={result} />
          </div>
        )}
      </div>

      {/* --- COLONNE DROITE --- */}
      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
        {step === 'input' ? (
          <Card className="p-6 bg-slate-50/50 border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Wallet size={20} className="text-slate-400" /> Situation Actuelle</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Reste à vivre</span><span className="font-bold text-slate-700">{formatCurrency(stats.remainingToLive)}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500 text-sm">Épargne dispo</span><span className="font-bold text-slate-700">{formatCurrency(stats.matelas)}</span></div>
            </div>
          </Card>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <Card className="p-6 border-indigo-100 shadow-md bg-white">
              <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2"><TrendingDown size={20} /> Impact Immédiat</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">Nouveau Matelas</div>
                  <div className="flex justify-between items-end">
                    <div className="font-bold text-slate-800 text-2xl">{formatCurrency(result.newMatelas)}</div>
                    <div className={`text-xs font-bold px-2 py-1 rounded ${result.newSafetyMonths < 3 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>{result.newSafetyMonths.toFixed(1)} mois sécu</div>
                  </div>
                </div>
                <div className="h-px bg-slate-100"></div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">Nouveau Reste à Vivre</div>
                  <div className="font-bold text-slate-800 text-2xl">{formatCurrency(result.newRV)}</div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-slate-200 bg-slate-50/50">
              <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">La réalité de cet achat</h3>
              <div className="space-y-4">
                {result.timeToWork > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-slate-500 shadow-sm"><Clock size={18} /></div>
                    <div><div className="text-xs text-slate-500 font-medium">Temps de travail</div><div className="font-bold text-slate-800">{result.timeToWork < 1 ? "Quelques heures" : `${Math.ceil(result.timeToWork)} jours`}</div></div>
                  </div>
                )}
                {result.opportunityCost > 10 && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-emerald-500 shadow-sm"><TrendingUp size={18} /></div>
                    <div><div className="text-xs text-slate-500 font-medium">Manque à gagner (10 ans)</div><div className="font-bold text-emerald-700">{formatCurrency(result.opportunityCost)}</div></div>
                  </div>
                )}
                 {result.creditCost > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg text-rose-500 shadow-sm"><PiggyBank size={18} /></div>
                    <div><div className="text-xs text-slate-500 font-medium">Coût du crédit</div><div className="font-bold text-rose-700">{formatCurrency(result.creditCost)}</div></div>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <Button onClick={handleSave} className="w-full shadow-xl" disabled={isSaving}>{isSaving ? "..." : <><Save size={18} /> Enregistrer</>}</Button>
              <Button variant="secondary" onClick={() => setStep('input')} className="w-full" disabled={isSaving}><RefreshCcw size={18} /> Refaire un test</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}