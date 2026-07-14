import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '@utils/Cn.js';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export default function Switch({ checked, onCheckedChange, disabled, id, className }: SwitchProps) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
        'border-2 border-transparent transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate/50 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-slate' : 'bg-line-strong',
        className,
      )}
    >
      <RadixSwitch.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md',
          'ring-0 transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </RadixSwitch.Root>
  );
}
