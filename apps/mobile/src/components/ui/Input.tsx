import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { cn } from '@utils/Cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
  helperText?: string | undefined;
  leftElement?: ReactNode;
  rightElement?: ReactNode;
  onClear?: (() => void) | undefined;
  containerClassName?: string;
  showPasswordToggle?: boolean;
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
    showPasswordToggle,
    className,
    id,
    type,
    ...props
  },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const hasValue = props.value !== undefined && String(props.value).length > 0;

  const isPasswordType = type === 'password';
  const enablePasswordToggle = showPasswordToggle ?? isPasswordType;
  const actualType = enablePasswordToggle ? (showPassword ? 'text' : 'password') : type;

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
          <span className="absolute left-3 flex items-center text-ink-faint pointer-events-none">{leftElement}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          {...props}
          type={actualType}
          className={cn(
            'w-full h-11 rounded-xl border bg-surface font-sans text-sm text-ink',
            'placeholder:text-ink-faint outline-none transition-all',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            'focus:border-slate focus:shadow-[0_0_0_3px_rgba(15,118,110,0.15)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            /* date / time: override bg-surface in dark mode so the native picker
               icon is visible and the field matches the dark paper colour */
            'dark:[&[type=date]]:bg-paper dark:[&[type=time]]:bg-paper',
            'dark:[&[type=datetime-local]]:bg-paper dark:[&[type=month]]:bg-paper',
            error
              ? 'border-red-edge focus:border-red-edge focus:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]'
              : 'border-line-strong',
            leftElement ? 'pl-9' : 'px-3',
            (onClear && hasValue) || enablePasswordToggle || rightElement ? 'pr-10' : 'pr-3',
            className,
          )}
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
        ) : enablePasswordToggle ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setShowPassword((prev) => !prev);
            }}
            className="absolute right-2.5 flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:bg-paper hover:text-ink active:scale-95 transition-all cursor-pointer focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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

