import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@utils/Cn.js';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** If true renders as a bottom sheet on mobile, centered modal on desktop */
  sheet?: boolean;
}

export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  sheet = false,
}: DialogProps) {
  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <RadixDialog.Portal>
        {/* Backdrop */}
        <RadixDialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-[rgba(6,18,32,0.55)] backdrop-blur-[6px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />

        {/* Panel */}
        <RadixDialog.Content
          className={cn(
            'fixed z-50 bg-surface shadow-[0_32px_80px_rgba(8,19,31,0.26)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:duration-200 data-[state=open]:duration-250',
            'focus:outline-none',
            // Mobile bottom-sheet behavior with sheet=true, otherwise centered
            sheet
              ? 'bottom-0 left-0 right-0 rounded-t-2xl max-h-[92dvh] overflow-y-auto data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:w-[480px] sm:max-h-[85vh]'
              : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl w-[calc(100%-2rem)] max-w-md data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out-0',
            'border border-line',
            className,
          )}
          style={sheet ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : undefined}
        >
          {/* Handle for sheet */}
          {sheet && (
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-line-strong" />
            </div>
          )}

          {/* Header */}
          {(title ?? description) && (
            <div className="flex items-start justify-between gap-4 p-6 pb-4">
              <div>
                {title && (
                  <RadixDialog.Title className="text-lg font-bold text-ink leading-tight">
                    {title}
                  </RadixDialog.Title>
                )}
                {description && (
                  <RadixDialog.Description className="mt-1 text-sm text-ink-faint">
                    {description}
                  </RadixDialog.Description>
                )}
              </div>
              <RadixDialog.Close asChild>
                <button
                  className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-ink-faint hover:bg-paper hover:text-ink transition-colors"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </RadixDialog.Close>
            </div>
          )}

          {/* Body */}
          <div className={cn('px-6 pb-6', (title ?? description) ? '' : 'pt-6')}>{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
