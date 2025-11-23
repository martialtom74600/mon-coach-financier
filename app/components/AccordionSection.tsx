'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  Trash2, 
  Plus, 
  Info, 
  LucideIcon 
} from 'lucide-react';
import { calculateListTotal, formatCurrency } from '@/app/lib/logic';

// --- TYPES ---

export interface FinancialItem {
  id: string;
  name: string;
  amount: number | string;
  dayOfMonth?: number;
  frequency?: string;
  [key: string]: any; // Pour permettre d'autres propriétés si nécessaire
}

interface AccordionSectionProps {
  title: string;
  icon?: LucideIcon;
  items: FinancialItem[];
  onItemChange: (id: string, field: keyof FinancialItem, value: any) => void;
  onItemAdd: () => void;
  onItemRemove: (id: string) => void;
  type?: 'standard' | 'simple';
  colorClass?: string;
  defaultOpen?: boolean;
  mode?: 'beginner' | 'expert';
  description?: React.ReactNode; // Peut être du texte ou un composant
  unit?: string;
}

// --- SOUS-COMPOSANT INTERNE (Pour le style des info-bulles) ---
const InfoBox = ({ children, className = "mb-6" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex gap-3 text-xs text-indigo-800 ${className}`}>
    <Info size={16} className="shrink-0 mt-0.5 text-indigo-500" />
    <div className="leading-relaxed opacity-90 font-medium">{children}</div>
  </div>
);

// --- COMPOSANT PRINCIPAL ---

const AccordionSection: React.FC<AccordionSectionProps> = ({ 
  title, 
  icon: Icon, 
  items = [], 
  onItemChange, 
  onItemAdd, 
  onItemRemove, 
  colorClass = 'text-slate-800', 
  defaultOpen = false, 
  description = null,
  unit = 'mois' 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // Utilisation de useMemo pour optimiser le calcul si la liste est longue
  const subTotal = useMemo(() => calculateListTotal(items), [items]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
      {/* HEADER DE L'ACCORDÉON */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors focus:outline-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl bg-slate-50 ${colorClass}`}>
            {Icon && <Icon size={20} />}
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-800 text-base">{title}</h3>
            {!isOpen && (
              <div className="text-xs text-slate-500 mt-0.5">
                {items.length} ligne{items.length > 1 ? 's' : ''} • Total : <strong>{formatCurrency(subTotal)}</strong>/mois
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className={`text-sm font-bold ${isOpen ? 'opacity-100' : 'opacity-0 md:opacity-100'} transition-opacity text-right`}>
                {formatCurrency(subTotal)}
                <span className="text-[10px] font-normal text-slate-400 block">/mois</span>
            </div>
            <div className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                <ChevronDown size={20} />
            </div>
        </div>
      </button>
      
      {/* CONTENU DÉPLIABLE */}
      {isOpen && (
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 space-y-3 animate-fade-in">
            {description && (
                <InfoBox className="mb-4 bg-white border-indigo-100 shadow-sm">
                    {description}
                </InfoBox>
            )}
            
            {items.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-4 italic">
                    Aucune ligne ajoutée.
                </p>
            )}
            
            {items.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                {/* NOM */}
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
                    
                    {/* MONTANT */}
                    <div className="relative w-32">
                        <input 
                            type="number" 
                            placeholder="0" 
                            value={item.amount} 
                            onChange={(e) => onItemChange(item.id, 'amount', e.target.value)} 
                            className="w-full p-2 pl-3 pr-10 bg-slate-50 rounded-lg text-sm font-bold text-slate-800 text-right outline-none focus:ring-2 focus:ring-indigo-100 appearance-none" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-medium pointer-events-none">
                            €/{unit}
                        </span>
                    </div>
                    
                    {/* DATE DE PRÉLÈVEMENT (Conditionnelle) */}
                    {unit !== 'an' && (
                        <div className="relative w-16" title="Jour du mois (ex: 5)">
                            <input 
                                type="number" 
                                min="1" max="31" 
                                placeholder="J" 
                                value={item.dayOfMonth || ''} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) {
                                        onItemChange(item.id, 'dayOfMonth', Math.min(31, Math.max(1, val)));
                                    } else {
                                        onItemChange(item.id, 'dayOfMonth', '');
                                    }
                                }} 
                                className="w-full p-2 pl-2 pr-1 bg-slate-50 rounded-lg text-sm text-center text-slate-500 outline-none focus:ring-2 focus:ring-indigo-100" 
                            />
                        </div>
                    )}
                    
                    {/* SUPPRESSION */}
                    <button 
                        onClick={() => onItemRemove(item.id)} 
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        aria-label="Supprimer la ligne"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            ))}

            {/* BOUTON AJOUTER */}
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

export default AccordionSection;