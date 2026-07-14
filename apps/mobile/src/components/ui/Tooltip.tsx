import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn } from '@utils/Cn.js';

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
}

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={100}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export default function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration,
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration ?? 400}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            'z-[9999] max-w-xs rounded-lg border border-line bg-ink dark:bg-paper px-2.5 py-1.5',
            'text-[11px] font-semibold text-white dark:text-ink shadow-lg',
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0',
            'data-[state=delayed-open]:zoom-in-95 duration-100',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[side=bottom]:slide-in-from-top-1',
            'data-[side=top]:slide-in-from-bottom-1',
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink dark:fill-paper" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
