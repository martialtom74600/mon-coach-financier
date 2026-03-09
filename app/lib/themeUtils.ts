import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Target,
  History,
  type LucideIcon,
} from 'lucide-react';

export type VerdictColor = 'green' | 'red' | 'orange' | 'black' | 'default';

export interface VerdictTheme {
  bg: string;
  bgDark: string;
  border: string;
  text: string;
  bar: string;
  badge: string;
  icon: LucideIcon;
}

const THEMES: Record<VerdictColor, VerdictTheme> = {
  green: {
    bg: 'bg-emerald-50',
    bgDark: 'bg-emerald-600',
    border: 'border-emerald-100',
    text: 'text-emerald-700',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle,
  },
  red: {
    bg: 'bg-rose-50',
    bgDark: 'bg-rose-600',
    border: 'border-rose-100',
    text: 'text-rose-700',
    bar: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700',
    icon: XCircle,
  },
  orange: {
    bg: 'bg-amber-50',
    bgDark: 'bg-amber-500',
    border: 'border-amber-100',
    text: 'text-amber-700',
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle,
  },
  black: {
    bg: 'bg-slate-50',
    bgDark: 'bg-slate-600',
    border: 'border-slate-200',
    text: 'text-slate-700',
    bar: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-600',
    icon: AlertTriangle,
  },
  default: {
    bg: 'bg-slate-50',
    bgDark: 'bg-slate-600',
    border: 'border-slate-100',
    text: 'text-slate-500',
    bar: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-600',
    icon: History,
  },
};

const DEFAULT_THEME: VerdictTheme = {
  bg: 'bg-slate-50',
  bgDark: 'bg-slate-600',
  border: 'border-slate-100',
  text: 'text-slate-700',
  bar: 'bg-slate-400',
  badge: 'bg-slate-100 text-slate-600',
  icon: Target,
};

/**
 * Retourne le thème visuel associé à un verdict/couleur.
 */
export function getVerdictTheme(verdict: string): VerdictTheme {
  const key = verdict as VerdictColor;
  return THEMES[key] ?? DEFAULT_THEME;
}
