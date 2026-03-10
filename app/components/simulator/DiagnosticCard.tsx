'use client';

import { CheckCircle, XCircle, Info } from 'lucide-react';
import Card from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { getVerdictTheme } from '@/app/lib/themeUtils';
import { formatCurrency } from '@/app/lib/definitions';
import type { AnalysisResult, AnalysisTip, AnalysisIssue } from '@/app/lib/definitions';

interface DiagnosticCardProps {
  result: AnalysisResult | null;
}

export function DiagnosticCard({ result }: DiagnosticCardProps) {
  if (!result) return null;

  const theme = getVerdictTheme(result.verdict);
  const headerTheme = result.verdict in { green: 1, orange: 1, red: 1 }
    ? theme
    : { ...theme, bgDark: 'bg-slate-600', icon: Info };
  const MainIcon = headerTheme.icon;

  return (
    <Card className="overflow-hidden shadow-xl border-slate-100 p-0 animate-fade-in">
      <div className={`${headerTheme.bgDark} p-6 text-white relative overflow-hidden`}>
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shrink-0">
            <MainIcon size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{result.smartTitle}</h2>
            <p className="text-white/90 text-sm font-medium opacity-95 leading-relaxed">
              {result.smartMessage}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
        <div className="p-5 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Budget mensuel
            </div>
            {result.isBudgetOk ? (
            <Badge color="emerald" className="inline-flex items-center gap-1 border border-emerald-200">
              <CheckCircle size={12} /> OK
            </Badge>
          ) : (
            <Badge color="rose" className="inline-flex items-center gap-1 border border-rose-200">
              <XCircle size={12} /> Risqué
            </Badge>
          )}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">Budget mensuel</div>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              {result.isBudgetOk
                ? 'Cet achat rentre dans ton budget.'
                : "Ce mois-ci, tu dépenses plus que tu gagnes."}
            </p>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Trésorerie
            </div>
            {result.isCashflowOk ? (
            <Badge color="emerald" className="inline-flex items-center gap-1 border border-emerald-200">
              <CheckCircle size={12} /> OK
            </Badge>
          ) : (
            <Badge color="rose" className="inline-flex items-center gap-1 border border-rose-200">
              <XCircle size={12} /> Risqué
            </Badge>
          )}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">Trésorerie J+45</div>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              {result.isCashflowOk
                ? 'Pas de découvert en vue sur 45 jours.'
                : `Découvert possible (min: ${formatCurrency(result.lowestProjectedBalance)}).`}
            </p>
          </div>
        </div>
      </div>

      {result.tips.length > 0 && (
        <div className="p-5 bg-white space-y-3">
          {result.tips.map((tip: AnalysisTip, i: number) => (
            <div key={i} className="flex gap-3 text-sm text-slate-600 items-start">
              <div className="mt-0.5 text-indigo-500 shrink-0">
                <Info size={16} />
              </div>
              <div className="leading-relaxed">{tip.text}</div>
            </div>
          ))}
        </div>
      )}

      {result.issues.length > 0 && (
        <div className="px-5 pb-4 bg-white">
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 mb-2">À garder en tête :</p>
            {result.issues.map((issue: AnalysisIssue, i: number) => (
              <div
                key={i}
                className="text-xs font-medium text-slate-500 flex gap-2 items-center mb-1"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${issue.level === 'red' ? 'bg-rose-500' : 'bg-amber-500'}`}
                ></div>
                {issue.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
