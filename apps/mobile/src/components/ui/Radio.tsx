import { cn } from '@utils/Cn.js';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
  id?: string;
  className?: string;
  name?: string;
  value?: string;
}

export default function Radio({
  checked,
  onCheckedChange,
  label,
  id,
  className,
  disabled,
  name,
  value,
  ...props
}: RadioProps) {
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
          type="radio"
          id={id}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.checked) onCheckedChange(true);
          }}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 shadow-sm',
            'border-line-strong bg-surface group-hover:border-slate/50',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-slate/40 peer-focus-visible:ring-offset-2',
            checked
              ? 'border-slate bg-surface shadow-slate/20 shadow-md ring-2 ring-slate/30'
              : 'group-hover:bg-paper/80',
          )}
        >
          <div
            className={cn(
              'h-2.5 w-2.5 rounded-full bg-gradient-to-br from-slate to-slate-soft transition-all duration-200 transform',
              checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
            )}
          />
        </div>
      </div>
      {label && <span className="text-sm font-semibold text-ink group-hover:text-ink transition-colors">{label}</span>}
    </label>
  );
}
