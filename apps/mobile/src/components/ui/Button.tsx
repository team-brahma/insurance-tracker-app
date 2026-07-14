import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@utils/Cn.js';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-slate text-white shadow-[0_4px_20px_rgba(15,118,110,0.30)] hover:brightness-105 active:scale-[0.98] border-transparent',
  secondary:
    'bg-paper text-ink border-line hover:bg-surface hover:border-line-strong active:scale-[0.98]',
  ghost:
    'bg-transparent text-ink-soft border-transparent hover:bg-paper hover:text-ink active:scale-[0.98]',
  destructive:
    'bg-red-edge text-white shadow-[0_4px_16px_rgba(244,63,94,0.28)] hover:brightness-105 active:scale-[0.98] border-transparent',
  outline: 'bg-surface text-ink border-line-strong hover:bg-paper active:scale-[0.98]',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs rounded-xl gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-sm rounded-2xl gap-2',
  icon: 'h-9 w-9 rounded-xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    children,
    className,
    disabled,
    ...props
  },
  ref,
) {
  const isDisabled = disabled ? true : loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-semibold border transition-all duration-150 cursor-pointer select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate/50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin shrink-0" size={size === 'sm' ? 13 : 15} />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      {size !== 'icon' && children}
      {!loading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </button>
  );
});

export default Button;
