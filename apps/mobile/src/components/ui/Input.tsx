import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@utils/Cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
  helperText?: string | undefined;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  onClear?: (() => void) | undefined;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    leftElement,
    rightElement,
    onClear,
    containerClassName,
    className,
    id,
    ...props
  },
  ref,
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const hasValue = props.value !== undefined && props.value !== null && String(props.value).length > 0;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-ink-soft">
          {label}
          {props.required && <span className="ml-1 text-red-edge">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftElement && (
          <span className="absolute left-3 flex items-center text-ink-faint">{leftElement}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-11 rounded-xl border bg-surface font-sans text-sm text-ink',
            'placeholder:text-ink-faint outline-none transition-all',
            'focus:border-slate focus:shadow-[0_0_0_3px_rgba(15,118,110,0.15)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-red-edge focus:border-red-edge focus:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]'
              : 'border-line-strong',
            leftElement ? 'pl-9' : 'px-3',
            onClear && hasValue ? 'pr-9' : rightElement ? 'pr-9' : 'pr-3',
            className,
          )}
          {...props}
        />
        {onClear && hasValue ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full text-ink-faint hover:bg-paper hover:text-ink transition cursor-pointer"
            aria-label="Clear text"
          >
            <X size={13} />
          </button>
        ) : rightElement ? (
          <span className="absolute right-3 flex items-center text-ink-faint">{rightElement}</span>
        ) : null}
      </div>
      {error && <p className="text-[11px] font-semibold text-red-fg">{error}</p>}
      {!error && helperText && <p className="text-[11px] text-ink-faint">{helperText}</p>}
    </div>
  );
});

export default Input;
