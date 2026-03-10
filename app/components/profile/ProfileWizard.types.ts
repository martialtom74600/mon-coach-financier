import type { Profile } from '@/app/lib/definitions';
import type { LucideIcon } from 'lucide-react';
import type { UserPersona, HousingStatus, ItemCategory, Frequency } from '@/app/lib/definitions';

export interface AssetUiRow {
  id: string;
  type: string;
  name: string;
  stock: number;
  monthlyFlow: number;
  transferDay: number;
}

export interface FormItem {
  id: string;
  name: string;
  amount: number | string;
  dayOfMonth?: number;
  frequency?: Frequency | string;
  category?: ItemCategory;
  profileId?: string;
  createdAt?: Date;
  [key: string]: unknown;
}

export interface FormProfile extends Omit<Profile, 'investments' | 'savingsContributions' | 'persona' | 'housing' | 'incomes' | 'fixedCosts' | 'variableCosts' | 'credits' | 'subscriptions' | 'annualExpenses'> {
  persona: UserPersona | string;
  housing: {
    status: HousingStatus | string;
    monthlyCost: number;
    paymentDay?: number;
  };
  assetsUi: AssetUiRow[];
  incomes: FormItem[];
  fixedCosts: FormItem[];
  variableCosts: FormItem[];
  credits: FormItem[];
  subscriptions: FormItem[];
  annualExpenses: FormItem[];
}

export interface WizardLayoutProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
  error?: string | null;
  /** Mode compact : masque le header (pour édition par section, aligné Settings/ProfileView) */
  compact?: boolean;
}

export interface SelectionTileProps {
  selected: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface CounterControlProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
}

export interface LiveSummaryProps {
  formData: FormProfile;
  stats: { income: number; fixed: number; variable: number; investments: number; ratio: number; remaining: number };
  currentStep: number;
}

export interface StepProps {
  formData: FormProfile;
  updateForm: (data: FormProfile) => void;
  onNext?: () => void;
  onPrev?: () => void;
  addItem?: (list: keyof FormProfile) => void;
  removeItem?: (list: keyof FormProfile, id: string) => void;
  updateItem?: (list: keyof FormProfile, id: string, field: string, val: string | number) => void;
  onConfirm?: (lifestyle: number, savings: number) => void;
  isSaving?: boolean;
  stats?: { income: number; fixed: number; variable: number; investments: number; ratio: number; remaining: number } | null;
  error?: string | null;
  /** Mode édition par section (K.4) : affiche "Enregistrer" au lieu de "Continuer" */
  editMode?: boolean;
  /** Callback de sauvegarde. Pour StepStrategy, reçoit le funBudget (lifestyle). */
  onSave?: (lifestyle?: number) => void | Promise<void>;
}
