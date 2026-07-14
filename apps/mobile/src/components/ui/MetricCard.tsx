import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@utils/Cn.js';

interface MetricCardProps {
  label: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  tone?: 'default' | 'critical' | 'warning' | 'success' | 'accent';
  onClick?: () => void;
  footer?: ReactNode;
}

const toneClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'from-white to-paper/60 border-line/70 dark:from-paper/30 dark:to-surface/40',
  critical:
    'from-red-bg/30 to-surface/80 border-red-edge/10 dark:from-red-bg/15 dark:to-surface/40',
  warning:
    'from-amber-bg/30 to-surface/80 border-amber-edge/10 dark:from-amber-bg/15 dark:to-surface/40',
  success:
    'from-green-bg/30 to-surface/80 border-green-edge/10 dark:from-green-bg/15 dark:to-surface/40',
  accent: 'from-slate/5 to-surface/80 border-slate/10 dark:from-slate/10 dark:to-surface/40',
};

const valueToneClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'text-ink',
  critical: 'text-red-fg dark:text-red-fg',
  warning: 'text-amber-fg dark:text-amber-fg',
  success: 'text-green-fg dark:text-green-fg',
  accent: 'text-slate dark:text-slate',
};

const iconToneClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'bg-paper text-ink-soft dark:bg-paper/40',
  critical: 'bg-red-bg text-red-fg dark:bg-red-bg/30',
  warning: 'bg-amber-bg text-amber-fg dark:bg-amber-bg/30',
  success: 'bg-green-bg text-green-fg dark:bg-green-bg/30',
  accent: 'bg-slate/10 text-slate dark:bg-slate/20',
};

export default function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'default',
  onClick,
  footer,
}: MetricCardProps) {
  const clickable = typeof onClick === 'function';

  return (
    <motion.div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      whileHover={clickable ? { y: -3, scale: 1.01 } : {}}
      whileTap={clickable ? { scale: 0.98 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'group flex flex-col rounded-[22px] sm:rounded-[26px] border border-line bg-gradient-to-br p-4 sm:p-5 lg:p-6 text-left w-full h-full select-none outline-none focus-visible:ring-2 focus-visible:ring-slate/50',
        'shadow-[0_4px_24px_rgba(15,23,42,0.07)] transition-shadow duration-200',
        toneClasses[tone],
        clickable
          ? 'hover:shadow-[0_12px_40px_rgba(15,23,42,0.12)] hover:border-line-strong cursor-pointer'
          : 'cursor-default',
      )}
    >
      <div className="flex flex-1 items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] sm:text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.22em] sm:tracking-[0.24em] text-ink-faint">
            {label}
          </p>
          <p
            className={cn(
              'mt-1.5 sm:mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight font-sans',
              valueToneClasses[tone],
            )}
          >
            {value}
          </p>
          <p className="mt-1 text-[11px] sm:text-xs lg:text-[13px] text-ink-soft/90 leading-normal line-clamp-2">
            {description}
          </p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 sm:h-10 sm:w-11 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-xl shadow-inner border border-transparent transition-all',
            iconToneClasses[tone],
          )}
        >
          <Icon size={16} strokeWidth={2} className="sm:hidden" />
          <Icon size={18} strokeWidth={2} className="hidden sm:block lg:hidden" />
          <Icon size={20} strokeWidth={2} className="hidden lg:block" />
        </div>
      </div>
      {footer ? (
        <div className="mt-4 border-t border-line/70 pt-4 lg:mt-5 lg:pt-5">{footer}</div>
      ) : null}
    </motion.div>
  );
}
