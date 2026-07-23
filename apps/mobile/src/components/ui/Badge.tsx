import type { ReactNode } from 'react';
import { cn } from '@utils/Cn.js';

interface BadgeProps {
  children: ReactNode;
  tone?:
    | 'neutral'
    | 'accent'
    | 'overdue'
    | 'due7'
    | 'due30'
    | 'future'
    | 'pending'
    | 'reminded'
    | 'renewed'
    | 'notRenewed'
    | 'lapsed'
    | 'inactive';
  dot?: boolean;
  className?: string;
}

const toneMap: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-paper text-ink-soft border-line',
  accent: 'bg-sky-50 text-slate border-sky-200/60 dark:bg-sky-950/35 dark:border-sky-900/60',
  overdue: 'bg-red-bg text-red-fg border-red-edge/20',
  due7: 'bg-amber-bg text-amber-fg border-amber-edge/20',
  due30: 'bg-green-bg text-green-fg border-green-edge/20',
  future: 'bg-gray-bg text-gray-fg border-gray-edge/25',
  pending: 'bg-amber-bg text-amber-fg border-amber-edge/20',
  reminded: 'bg-sky-50 text-slate border-sky-200/60 dark:bg-sky-950/35 dark:border-sky-900/60',
  renewed: 'bg-green-bg text-green-fg border-green-edge/20',
  notRenewed: 'bg-red-bg text-red-fg border-red-edge/20',
  lapsed: 'bg-gray-bg text-gray-fg border-gray-edge/25',
  inactive: 'bg-slate-100 text-slate-700 border-slate-200/60 dark:bg-slate-900/40 dark:text-slate-300',
};

const dotToneMap: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-gray-edge',
  accent: 'bg-slate',
  overdue: 'bg-red-edge',
  due7: 'bg-amber-edge',
  due30: 'bg-green-edge',
  future: 'bg-gray-edge',
  pending: 'bg-amber-edge',
  reminded: 'bg-slate',
  renewed: 'bg-green-edge',
  notRenewed: 'bg-red-edge',
  lapsed: 'bg-gray-edge',
  inactive: 'bg-slate-400',
};

export default function Badge({ children, tone = 'neutral', dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]',
        toneMap[tone],
        className,
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotToneMap[tone])} />}
      {children}
    </span>
  );
}
