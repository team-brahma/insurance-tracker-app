import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@utils/Cn.js';

interface SurfaceCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  eyebrow?: string;
  description?: string;
  aside?: ReactNode;
}

export default function SurfaceCard({
  title,
  eyebrow,
  description,
  aside,
  className,
  children,
  ...props
}: SurfaceCardProps) {
  const hasCustomPadding = className?.includes('p-0') || className?.includes('!p-') || className?.includes('p-');
  return (
    <section
      className={cn(
        'group/surface rounded-2xl border border-line bg-surface/92 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-300',
        !hasCustomPadding && 'p-5 sm:p-6 lg:p-7',
        'hover:border-line-strong/60 hover:shadow-[0_16px_50px_rgba(15,23,42,0.10)]',
        className,
      )}
      {...props}
    >
      {(title ?? eyebrow ?? description ?? aside) ? (
        <div className="mb-5 flex items-start justify-between gap-4 lg:mb-6">
          <div className="text-left">
            {eyebrow ? (
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-ink-faint">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h3 className="text-base font-bold tracking-tight text-ink lg:text-lg">{title}</h3>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-ink-faint lg:text-[15px]">{description}</p>
            ) : null}
          </div>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}
