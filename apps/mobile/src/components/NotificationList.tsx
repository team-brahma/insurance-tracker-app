import { useEffect, useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { Bell, AlertCircle, CalendarClock, Calendar, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInfiniteNotificationsQuery, useNotificationsQuery } from '@features/notifications/hooks/useNotificationsQuery.js';
import { cn } from '@utils/Cn.js';
import { formatDate, formatDateTime, initials } from '@repo/utils';
import type { NotificationItem } from '@features/notifications/types/index.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import Badge from '@components/ui/Badge.js';
import EmptyState from '@components/ui/EmptyState.js';

type NotificationVariant = 'compact' | 'full';
type TabFilter = 'all' | 'policies' | 'enquiries';

interface NotificationListProps {
  onNavigate?: () => void;
  variant?: NotificationVariant;
  filter?: TabFilter;
}

const initialsColors = [
  'bg-sky-100 text-sky-700 dark:bg-sky-950/45 dark:text-sky-300 border-sky-200/40',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300 border-emerald-200/40',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300 border-amber-200/40',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/45 dark:text-rose-300 border-rose-200/40',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/45 dark:text-violet-300 border-violet-200/40',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/45 dark:text-teal-300 border-teal-200/40',
];

function getInitialsColor(name: string) {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return initialsColors[sum % initialsColors.length] ?? initialsColors[0] ?? '';
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
};

function urgencyText(daysLeft: number): string {
  if (daysLeft < 0) {
    const abs = Math.abs(daysLeft);
    return abs === 1 ? '1 day overdue' : `${String(abs)} days overdue`;
  }
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return 'Due in 1 day';
  return `Due in ${String(daysLeft)} days`;
}

export default function NotificationList({
  onNavigate,
  variant = 'compact',
  filter = 'all',
}: NotificationListProps) {
  const history = useHistory();

  // For compact view (dropdowns), single query fetch with small limit
  const { data: compactData, isLoading: compactLoading } = useNotificationsQuery(
    { type: filter, limit: 10 },
    variant === 'compact',
  );

  // For full page view, use infinite scrolling (20 records per page)
  const {
    data: infiniteData,
    isLoading: infiniteLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotificationsQuery(variant === 'full' ? { type: filter, limit: 20 } : undefined);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== 'full') return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [variant, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isLoading = variant === 'compact' ? compactLoading : infiniteLoading;

  const items: NotificationItem[] = useMemo(() => {
    if (variant === 'compact') {
      return compactData?.items ?? [];
    }
    return infiniteData?.pages.flatMap((page) => page.items) ?? [];
  }, [variant, compactData, infiniteData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate border-t-transparent" />
      </div>
    );
  }

  const count = items.length;

  if (count === 0) {
    if (variant === 'compact') {
      const messages: Record<string, { title: string; description: string }> = {
        all: {
          title: 'All caught up',
          description: 'No policies or enquiries need attention right now.',
        },
        policies: {
          title: 'No policy renewals',
          description: 'No policies need renewal attention right now.',
        },
        enquiries: {
          title: 'No enquiry follow-ups',
          description: 'No open enquiries with upcoming reminders.',
        },
      };
      const msg = messages[filter]!;
      return (
        <div className="flex flex-col items-center gap-1.5 py-8 text-center">
          <Bell size={18} className="text-ink-faint/50" />
          <p className="text-[11px] font-semibold text-ink-faint">{msg.title}</p>
          <p className="text-[9px] text-ink-faint/60 max-w-52">{msg.description}</p>
        </div>
      );
    }

    const messages: Record<string, { title: string; description: string; tip: string }> = {
      all: {
        title: 'All caught up',
        description: 'No policies or enquiries need attention right now.',
        tip: 'You will receive reminders when clients have policies expiring or enquiries that need follow-up.',
      },
      policies: {
        title: 'No policy renewals',
        description: 'No policies need renewal attention right now.',
        tip: 'Ensure your client policies have expiry dates to receive renewal notifications.',
      },
      enquiries: {
        title: 'No enquiry follow-ups',
        description: 'No open enquiries with upcoming reminders.',
        tip: 'Set follow-up dates on your client enquiries to get reminders here.',
      },
    };
    const msg = messages[filter]!;
    return (
      <EmptyState
        icon={Bell}
        variant="default"
        title={msg.title}
        description={msg.description}
        tip={msg.tip}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <div className="py-1.5">
        <p className="px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-ink-faint">
          Upcoming Reminders &middot; {count}
        </p>
        {items.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            onClick={() => {
              onNavigate?.();
              history.push(
                item.type === 'policy_renewal' ? `/policies/${item.id}` : `/enquiries/${item.id}`,
              );
            }}
            className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-paper/70 active:bg-paper cursor-pointer border-0"
          >
            <div
              className={cn(
                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                item.type === 'policy_renewal'
                  ? item.daysLeft <= 0
                    ? 'bg-red-bg text-red-fg'
                    : item.daysLeft <= 7
                      ? 'bg-amber-bg text-amber-fg'
                      : 'bg-green-bg text-green-fg'
                  : 'bg-slate/10 text-slate',
              )}
            >
              {item.type === 'policy_renewal' ? (
                <AlertCircle size={13} />
              ) : (
                <CalendarClock size={13} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-ink leading-snug truncate">
                {item.type === 'policy_renewal' ? item.clientName : item.name}
              </p>
              <p className="text-[10px] text-ink-faint leading-snug truncate mt-0.5">
                {item.type === 'policy_renewal'
                  ? `${item.policyType} policy`
                  : `${item.policyType} enquiry`}
              </p>
              <p
                className={cn(
                  'text-[9px] font-semibold leading-snug mt-0.5',
                  item.daysLeft <= 0 ? 'text-red-fg' : 'text-amber-fg',
                )}
              >
                {urgencyText(item.daysLeft)}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr"
      >
        {items.map((item) => {
          const name = item.type === 'policy_renewal' ? item.clientName : item.name;
          return (
            <motion.div
              key={`${item.type}-${item.id}`}
              variants={cardVariant}
              layout
              className="h-full"
            >
              <SurfaceCard
                className="group h-full cursor-pointer overflow-hidden p-0 hover:border-slate/40 dark:hover:border-slate/40 hover:shadow-[0_12px_40px_rgba(15,118,110,0.06)] dark:hover:shadow-[0_12px_40px_rgba(45,212,191,0.04)] transition-all duration-300"
                onClick={() => {
                  onNavigate?.();
                  history.push(
                    item.type === 'policy_renewal' ? `/policies/${item.id}` : `/enquiries/${item.id}`,
                  );
                }}
              >
                <div className="flex h-full items-stretch">
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105',
                            getInitialsColor(name),
                          )}
                        >
                          {initials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-ink transition duration-200 group-hover:text-slate break-words leading-snug">
                            {name}
                          </h3>
                          <p
                            className={cn(
                              'mt-0.5 text-xs font-bold leading-normal',
                              item.daysLeft <= 0 && 'text-red-fg',
                              item.daysLeft > 0 && item.daysLeft <= 7 && 'text-amber-fg',
                              item.daysLeft > 7 && 'text-green-fg',
                            )}
                          >
                            {urgencyText(item.daysLeft)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">
                          {item.type === 'policy_renewal' ? item.policyType : item.policyType}
                        </Badge>
                        {item.type === 'policy_renewal' && item.renewalStatus && (
                          <Badge
                            tone={item.renewalStatus === 'REMINDED' ? 'reminded' : 'pending'}
                            dot
                          >
                            {item.renewalStatus === 'REMINDED' ? 'Reminded' : 'Pending'}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        {item.type === 'policy_renewal' ? (
                          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                            <Calendar size={12} className="shrink-0 text-ink-faint" />
                            <span className="font-semibold">Ends {formatDate(item.endDate)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                            <Clock size={12} className="shrink-0 text-ink-faint" />
                            <span className="font-semibold">
                              Follow-up {formatDateTime(item.remindOn)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-line/80 px-4 sm:px-5 py-3 bg-surface/30 group-hover:bg-surface/70 transition-colors duration-300">
                      <span
                        className={cn(
                          'text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em]',
                          item.daysLeft <= 0
                            ? 'text-red-fg'
                            : item.daysLeft <= 7
                              ? 'text-amber-fg'
                              : 'text-green-fg',
                        )}
                      >
                        {urgencyText(item.daysLeft)}
                      </span>
                      <div className="flex h-5 w-5 items-center justify-center text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-slate">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Infinite Scroll Sentinel & Loader */}
      <div ref={sentinelRef} className="py-4 text-center">
        {isFetchingNextPage && (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-ink-faint">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate border-t-transparent" />
            Loading more reminders...
          </div>
        )}
      </div>
    </div>
  );
}
