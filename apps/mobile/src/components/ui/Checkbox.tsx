import { Check } from 'lucide-react';
import { cn } from '@utils/Cn.js';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
  id?: string;
  className?: string;
}

export default function Checkbox({
  checked,
  onCheckedChange,
  label,
  id,
  className,
  disabled,
  ...props
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex items-center gap-2.5 cursor-pointer select-none group',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200 shadow-sm',
            'border-line-strong bg-surface group-hover:border-purple-500/50',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500/40 peer-focus-visible:ring-offset-2',
            checked
              ? 'border-purple-600 bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-purple-500/25 shadow-md scale-105'
              : 'group-hover:bg-paper/80',
          )}
        >
          <Check
            size={12}
            strokeWidth={3}
            className={cn(
              'transition-all duration-200 transform',
              checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
            )}
          />
        </div>
      </div>
      {label && <span className="text-sm font-semibold text-ink group-hover:text-ink transition-colors">{label}</span>}
    </label>
  );
}
