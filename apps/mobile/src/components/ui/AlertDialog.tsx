import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import type { ReactNode } from 'react';
import { cn } from '@utils/Cn.js';

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'warning';
  loading?: boolean;
  icon?: ReactNode;
}

export default function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  loading = false,
  icon,
}: AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-[rgba(6,18,32,0.55)] backdrop-blur-[6px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <AlertDialogPrimitive.Content
          className={cn(
            'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line',
            'bg-surface p-6 shadow-[0_32px_80px_rgba(8,19,31,0.28)]',
            'data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out-0',
            'duration-200 focus:outline-none text-center',
          )}
        >
          {icon && (
            <div
              className={cn(
                'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border',
                variant === 'destructive'
                  ? 'bg-red-bg text-red-fg border-red-edge/20'
                  : 'bg-amber-bg text-amber-fg border-amber-edge/20',
              )}
            >
              {icon}
            </div>
          )}

          <AlertDialogPrimitive.Title className="text-base font-bold text-ink">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="mt-2 text-sm text-ink-faint leading-relaxed">
            {description}
          </AlertDialogPrimitive.Description>

          <div className="mt-6 flex gap-3">
            <AlertDialogPrimitive.Cancel asChild>
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-xl border border-line-strong bg-surface text-sm font-semibold text-ink-soft hover:bg-paper transition-colors"
              >
                {cancelLabel}
              </button>
            </AlertDialogPrimitive.Cancel>

            <AlertDialogPrimitive.Action asChild>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={cn(
                  'flex-1 h-11 rounded-xl text-sm font-bold text-white transition-all',
                  'flex items-center justify-center gap-2',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  variant === 'destructive'
                    ? 'bg-red-edge hover:brightness-105 shadow-[0_4px_16px_rgba(244,63,94,0.28)]'
                    : 'bg-amber-edge hover:brightness-105 shadow-[0_4px_16px_rgba(245,158,11,0.28)]',
                )}
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  confirmLabel
                )}
              </button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
