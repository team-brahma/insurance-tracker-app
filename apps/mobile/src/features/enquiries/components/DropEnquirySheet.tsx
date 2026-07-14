import { useState } from 'react';
import { XCircle } from 'lucide-react';
import Dialog from '@components/ui/Dialog.js';
import Button from '@components/ui/Button.js';
import { DROP_REASON_LABELS } from '@repo/constants';
import { cn } from '@utils/Cn.js';

const DROP_REASONS = Object.entries(DROP_REASON_LABELS);

interface DropEnquirySheetProps {
  open: boolean;
  enquiryName: string;
  isPending?: boolean;
  onClose: () => void;
  onConfirm: (dropReason: string, dropNote?: string) => void;
}

export default function DropEnquirySheet({
  open,
  enquiryName,
  isPending = false,
  onClose,
  onConfirm,
}: DropEnquirySheetProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherNote, setOtherNote] = useState('');

  const handleClose = () => {
    setSelectedReason(null);
    setOtherNote('');
    onClose();
  };

  const canConfirm =
    !!selectedReason && (selectedReason !== 'OTHER' || otherNote.trim().length >= 10);

  const handleConfirm = () => {
    if (!selectedReason) return;
    const note = selectedReason === 'OTHER' && otherNote.trim() ? otherNote.trim() : undefined;
    onConfirm(selectedReason, note);
    setSelectedReason(null);
    setOtherNote('');
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Drop Enquiry"
      description={`Why are you dropping the enquiry for ${enquiryName}?`}
      sheet
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {DROP_REASONS.map(([key, label]) => {
            const isSelected = selectedReason === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedReason(key);
                  if (key !== 'OTHER') setOtherNote('');
                }}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-xs font-bold transition-all active:scale-95',
                  isSelected
                    ? 'border-red-edge bg-red-bg text-red-fg shadow-sm'
                    : 'border-line-strong bg-surface text-ink-soft hover:bg-paper hover:text-ink',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {selectedReason === 'OTHER' && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-ink-faint uppercase tracking-[0.15em]">
              Please specify
            </label>
            <textarea
              value={otherNote}
              onChange={(e) => {
                if (e.target.value.length <= 500) setOtherNote(e.target.value);
              }}
              placeholder="Briefly describe the reason..."
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-line-strong transition"
            />
            <div className="flex items-center justify-between">
              {otherNote.trim().length === 0 ? (
                <p className="text-xs text-red-fg font-semibold">
                  Please describe the reason before dropping.
                </p>
              ) : otherNote.trim().length < 10 ? (
                <p className="text-xs text-amber-fg font-semibold">
                  Describe in a bit more detail (min 10 characters).
                </p>
              ) : (
                <p className="text-xs text-green-fg font-semibold">Note looks good.</p>
              )}
              <span className="text-[10px] text-ink-faint">{otherNote.length}/500</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="flex-1 flex items-center justify-center gap-1.5"
            disabled={!canConfirm}
            loading={isPending}
            onClick={handleConfirm}
          >
            <XCircle size={15} />
            <span>Drop Enquiry</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
