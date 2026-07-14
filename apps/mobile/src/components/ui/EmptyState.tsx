import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@utils/Cn.js';

type EmptyVariant = 'default' | 'search' | 'filter' | 'error';

type EmptySize = 'sm' | 'md' | 'lg';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  tip?: string;
  variant?: EmptyVariant;
  size?: EmptySize;
  className?: string;
}

const variantMeta: Record<EmptyVariant, { iconBg: string; iconColor: string }> = {
  default: { iconBg: 'bg-paper text-slate border border-line', iconColor: 'text-slate' },
  search: {
    iconBg: 'bg-amber-bg text-amber-edge border border-amber-edge/30',
    iconColor: 'text-amber-fg',
  },
  filter: {
    iconBg: 'bg-surface text-slate-soft border border-slate-soft/30',
    iconColor: 'text-slate-soft',
  },
  error: { iconBg: 'bg-red-bg text-red-edge border border-red-edge/30', iconColor: 'text-red-fg' },
};

const sizeMap: Record<
  EmptySize,
  {
    container: string;
    iconWrapper: string;
    iconSize: number;
    title: string;
    desc: string;
    gap: string;
  }
> = {
  sm: {
    container: 'px-5 py-10',
    iconWrapper: 'h-12 w-12 rounded-xl',
    iconSize: 22,
    title: 'text-sm',
    desc: 'text-xs',
    gap: 'gap-3',
  },
  md: {
    container: 'px-6 py-14 sm:px-8 sm:py-16',
    iconWrapper: 'h-14 w-14 rounded-2xl',
    iconSize: 26,
    title: 'text-base sm:text-lg',
    desc: 'text-sm',
    gap: 'gap-4',
  },
  lg: {
    container: 'px-8 py-20 sm:px-12 sm:py-24 lg:px-16 lg:py-28',
    iconWrapper: 'h-16 w-16 sm:h-20 sm:w-20 rounded-2xl sm:rounded-3xl',
    iconSize: 30,
    title: 'text-lg sm:text-xl lg:text-2xl',
    desc: 'text-sm sm:text-base',
    gap: 'gap-5 sm:gap-6',
  },
};

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const, staggerChildren: 0.08 },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  tip,
  variant = 'default',
  size = 'md',
  className,
}: EmptyStateProps) {
  const meta = variantMeta[variant];
  const s = sizeMap[size];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="status"
      aria-live="polite"
      className={cn(
        'rounded-[28px] border border-dashed border-line-strong bg-surface/90',
        'shadow-[0_4px_24px_rgba(12,23,44,0.06)]',
        s.container,
        className,
      )}
    >
      <div className={cn('mx-auto flex flex-col items-center text-center', s.gap)}>
        <motion.div
          variants={childVariants}
          className={cn('flex items-center justify-center', meta.iconBg, s.iconWrapper)}
        >
          <Icon size={s.iconSize} strokeWidth={1.5} className={meta.iconColor} />
        </motion.div>

        <motion.div variants={childVariants} className="flex flex-col items-center gap-1.5">
          <h3 className={cn('font-bold tracking-tight text-ink', s.title)}>{title}</h3>
          <p className={cn('mx-auto max-w-md leading-6 text-ink-faint', s.desc)}>{description}</p>
        </motion.div>

        {tip && (
          <motion.div
            variants={childVariants}
            className="flex items-start gap-2 rounded-xl bg-paper border border-line px-4 py-3 max-w-sm text-left"
          >
            <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-fg" />
            <p className="text-xs leading-5 text-ink-soft">{tip}</p>
          </motion.div>
        )}

        {(action || secondaryAction) && (
          <motion.div
            variants={childVariants}
            className="flex flex-col sm:flex-row items-center gap-3 mt-1"
          >
            {action}
            {secondaryAction}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
