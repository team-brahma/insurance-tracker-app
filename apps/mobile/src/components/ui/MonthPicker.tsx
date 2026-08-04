import { useState, useMemo } from 'react';
import * as RadixPopover from '@radix-ui/react-popover';
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { cn } from '@utils/Cn.js';

export interface MonthPickerProps {
  value?: string | null; // Format: YYYY-MM
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const FULL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatMonthYearLabel(value?: string | null): string | null {
  if (!value) return null;
  const [yearStr, monthStr] = value.split('-');
  if (!yearStr || !monthStr) return null;
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return null;
  return `${MONTH_NAMES[monthIdx]} ${yearStr}`;
}

export default function MonthPicker({
  value,
  onChange,
  placeholder = 'Select Month',
  className,
  align = 'start',
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentMonthValue = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;

  const selectedParsed = useMemo(() => {
    if (!value) return null;
    const [yearStr, monthStr] = value.split('-');
    if (!yearStr || !monthStr) return null;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) return null;
    return { year, month };
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(() => selectedParsed?.year ?? currentYear);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setViewYear(selectedParsed?.year ?? currentYear);
    }
  };

  const handleSelectMonth = (monthIdx: number) => {
    const formatted = `${viewYear}-${String(monthIdx + 1).padStart(2, '0')}`;
    onChange(formatted);
    setOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(null);
  };

  const formattedLabel = formatMonthYearLabel(value);

  // Quick preset: Next Month
  const nextMonthValue = useMemo(() => {
    const nextDate = new Date(currentYear, currentMonthIdx + 1, 1);
    return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
  }, [currentYear, currentMonthIdx]);

  return (
    <RadixPopover.Root open={open} onOpenChange={handleOpenChange}>
      <RadixPopover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-11 items-center justify-between gap-2 rounded-2xl border px-3.5 text-xs font-bold transition-all cursor-pointer select-none',
            value
              ? 'border-slate/40 bg-slate/10 text-slate hover:bg-slate/20 dark:bg-slate/20 dark:text-slate-light dark:hover:bg-slate/30 shadow-xs'
              : 'border-line bg-paper/90 text-ink-soft hover:border-line-strong hover:bg-surface hover:text-ink',
            className,
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calendar
              size={15}
              className={cn('shrink-0 transition-colors', value ? 'text-slate' : 'text-ink-faint')}
            />
            <span className="truncate">{formattedLabel ?? placeholder}</span>
          </div>

          {value ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleClear();
              }}
              title="Clear month filter"
              className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-slate/70 hover:bg-slate/20 hover:text-slate transition"
            >
              <X size={13} className="stroke-[2.5]" />
            </span>
          ) : (
            <ChevronRight size={14} className="shrink-0 text-ink-faint rotate-90" />
          )}
        </button>
      </RadixPopover.Trigger>

      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={6}
          className={cn(
            'z-[9999] w-[300px] rounded-2xl border border-line bg-surface p-4 shadow-[0_20px_50px_rgba(8,19,31,0.24)] outline-none backdrop-blur-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-150',
          )}
        >
          {/* Header Year Navigator */}
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <button
              type="button"
              onClick={() => { setViewYear((y) => y - 1); }}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-paper text-ink-soft hover:bg-surface hover:text-ink active:scale-95 transition cursor-pointer"
              title="Previous Year"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={() => { setViewYear(currentYear); }}
              title="Click to reset to current year"
              className="text-sm font-extrabold text-ink hover:text-slate transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>{viewYear}</span>
              {viewYear !== currentYear && (
                <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">
                  (Reset)
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setViewYear((y) => y + 1); }}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-paper text-ink-soft hover:bg-surface hover:text-ink active:scale-95 transition cursor-pointer"
              title="Next Year"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Month 3x4 Grid */}
          <div className="grid grid-cols-3 gap-2 pt-3 pb-3">
            {MONTH_NAMES.map((name, idx) => {
              const isSelected =
                selectedParsed?.year === viewYear && selectedParsed?.month === idx;
              const isThisMonth = currentYear === viewYear && currentMonthIdx === idx;

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => { handleSelectMonth(idx); }}
                  title={`${FULL_MONTH_NAMES[idx]} ${viewYear}`}
                  className={cn(
                    'relative flex h-10 items-center justify-center rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer',
                    isSelected
                      ? 'border-slate bg-slate text-white shadow-md shadow-slate/25'
                      : 'border-line/60 bg-paper/50 text-ink-soft hover:border-line-strong hover:bg-paper hover:text-ink',
                    isThisMonth && !isSelected && 'border-slate/40 text-slate font-extrabold bg-slate/5',
                  )}
                >
                  <span>{name}</span>

                  {/* Indicator dot for current month */}
                  {isThisMonth && (
                    <span
                      className={cn(
                        'absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full',
                        isSelected ? 'bg-white' : 'bg-slate',
                      )}
                    />
                  )}

                  {isSelected && (
                    <span className="absolute bottom-1 right-1">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Presets Footer */}
          <div className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-line text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onChange(currentMonthValue);
                  setOpen(false);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg border transition cursor-pointer',
                  value === currentMonthValue
                    ? 'border-slate bg-slate/15 text-slate font-extrabold'
                    : 'border-line bg-paper text-ink-soft hover:text-ink hover:bg-surface',
                )}
              >
                This Month
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange(nextMonthValue);
                  setOpen(false);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg border transition cursor-pointer',
                  value === nextMonthValue
                    ? 'border-slate bg-slate/15 text-slate font-extrabold'
                    : 'border-line bg-paper text-ink-soft hover:text-ink hover:bg-surface',
                )}
              >
                Next Month
              </button>
            </div>

            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-red-fg hover:underline font-extrabold px-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
