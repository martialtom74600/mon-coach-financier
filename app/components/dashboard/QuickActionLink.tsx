import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/** Équivalent serveur de QuickActionCard : navigation sans îlot client dédié. */
export default function QuickActionLink({
  href,
  label,
  icon: Icon,
  color = 'indigo',
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald';
}) {
  const borderHover =
    color === 'indigo' ? 'hover:border-indigo-200' : 'hover:border-emerald-200';
  const iconBg =
    color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600';

  return (
    <Link
      href={href}
      className={`group p-4 bg-white border border-slate-100 rounded-[20px] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-3 h-32 text-center ${borderHover}`}
    >
      <div className={`p-3 rounded-full group-hover:scale-110 transition-transform ${iconBg}`}>
        <Icon size={24} aria-hidden />
      </div>
      <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</span>
    </Link>
  );
}
