'use client';

import { X, BookOpen, CheckSquare, Lightbulb } from 'lucide-react';
import type { ActionGuide } from '@/app/lib/definitions';

const Badge = ({
  children,
  color = 'indigo',
}: {
  children: React.ReactNode;
  color?: 'indigo' | 'emerald' | 'rose' | 'amber';
}) => {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${colors[color]}`}
    >
      {children}
    </span>
  );
};

interface EducationalModalProps {
  guide: ActionGuide | null;
  onClose: () => void;
}

export function EducationalModal({ guide, onClose }: EducationalModalProps) {
  if (!guide) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex gap-5">
            <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-md shrink-0 border border-white/10 shadow-inner">
              <BookOpen size={28} className="text-indigo-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold leading-tight mb-2">{guide.title}</h3>
              <p className="text-slate-300 text-sm leading-relaxed max-w-sm">{guide.definition}</p>
              <div className="flex gap-2 mt-4">
                {guide.difficulty && <Badge color="indigo">{guide.difficulty}</Badge>}
                {guide.impact && <Badge color="emerald">{guide.impact}</Badge>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
          >
            <X size={24} />
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar p-8 space-y-8 bg-slate-50/50">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckSquare size={16} className="text-indigo-600" /> Plan d&apos;action
            </h4>
            <div className="space-y-3">
              {guide.steps?.map((step: string, i: number) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm group hover:border-indigo-100 transition-colors"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {i + 1}
                  </span>
                  <span className="text-sm text-slate-700 font-medium leading-relaxed pt-0.5">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {guide.tips && guide.tips.length > 0 && (
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Lightbulb size={16} /> Le Conseil Pro
              </h4>
              <ul className="space-y-3">
                {guide.tips.map((tip: string, i: number) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-100 bg-white flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-8 py-3.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            C&apos;est noté, je m&apos;y mets
          </button>
        </div>
      </div>
    </div>
  );
}
