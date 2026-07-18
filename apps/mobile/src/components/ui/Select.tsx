import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@utils/Cn.js';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
  error?: string | undefined;
}

export default function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  disabled,
  className,
  label,
  required,
  error,
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-ink-soft">
          {label}
          {required && <span className="ml-1 text-red-edge">*</span>}
        </label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled ?? false}>
        <RadixSelect.Trigger
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-xl border bg-surface px-3 text-sm text-ink outline-none',
            'transition-all hover:border-line-strong',
            'focus:border-slate focus:shadow-[0_0_0_3px_rgba(15,118,110,0.15)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'data-[placeholder]:text-ink-faint',
            error ? 'border-red-edge' : 'border-line-strong',
            className,
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={15} className="text-ink-faint shrink-0" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className={cn(
              'z-[9999] min-w-[var(--radix-select-trigger-width)] overflow-hidden',
              'rounded-xl border border-line bg-surface shadow-[0_16px_48px_rgba(10,20,36,0.18)]',
              'animate-in fade-in-0 zoom-in-95 duration-100',
            )}
            position="popper"
            sideOffset={6}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((opt) => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 pr-8',
                    'text-sm text-ink outline-none',
                    'data-[highlighted]:bg-paper data-[highlighted]:text-ink',
                    'data-[state=checked]:font-semibold data-[state=checked]:text-slate',
                    'transition-colors',
                  )}
                >
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-2.5">
                    <Check size={13} className="text-slate" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && <p className="text-[11px] font-semibold text-red-fg">{error}</p>}
    </div>
  );
}
