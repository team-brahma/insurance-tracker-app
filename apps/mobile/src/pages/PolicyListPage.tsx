import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearch } from '@hooks/useSearch.js';
import {
  Search,
  SlidersHorizontal,
  Phone,
  MessageCircle,
  Pencil,
  ChevronRight,
  AlertTriangle,
  X,
  Calendar,
  Plus,
} from 'lucide-react';
import { useHistory, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppShellPage from '@components/layout/AppShellPage.js';
import Badge from '@components/ui/Badge.js';
import EmptyState from '@components/ui/EmptyState.js';
import PageLoader from '@components/ui/PageLoader.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import Dialog from '@components/ui/Dialog.js';
import Button from '@components/ui/Button.js';
import { useInfinitePoliciesQuery } from '@features/policies/hooks/usePoliciesQuery.js';
import type { PolicyListParams } from '@features/policies/types/index.js';
import { RENEWAL_STATUS_LABELS } from '@repo/constants';
import { usePolicyTypesQuery } from '@features/policyTypes/index.js';
import type { PolicyWithClient, UrgencyBucket } from '@repo/types';
import { daysToExpiry, formatDate, initials, urgencyBucket } from '@repo/utils';
import { cn } from '@utils/Cn.js';
import { IonRefresher, IonRefresherContent } from '@ionic/react';

const ALL_STATUSES = Object.keys(RENEWAL_STATUS_LABELS);

function daysLabel(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    return abs === 1 ? '1 day overdue' : `${String(abs)} days overdue`;
  }
  if (days === 0) return 'Due today';
  return days === 1 ? 'Due in 1 day' : `Due in ${String(days)} days`;
}

function statusTone(status: string): 'pending' | 'reminded' | 'renewed' | 'notRenewed' | 'lapsed' {
  if (status === 'PENDING') return 'pending';
  if (status === 'REMINDED') return 'reminded';
  if (status === 'RENEWED') return 'renewed';
  if (status === 'NOT_RENEWED') return 'notRenewed';
  return 'lapsed';
}

const urgencyColors: Record<string, string> = {
  overdue: 'bg-red-edge',
  due7: 'bg-amber-edge',
  due30: 'bg-green-edge',
  future: 'bg-gray-edge',
};

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

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
};

/** Reusable chip-style filter toggle */
function FilterChips({
  label,
  items,
  selected,
  getLabel,
  onToggle,
  onClear,
}: {
  label: string;
  items: string[];
  selected: string[];
  getLabel: (v: string) => string | undefined;
  onToggle: (v: string) => void;
  onClear?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">{label}</p>
        {onClear && selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-slate font-bold hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              onToggle(item);
            }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
              selected.includes(item)
                ? 'border-slate bg-slate text-white'
                : 'border-line-strong bg-surface text-ink-soft hover:bg-paper',
            )}
          >
            {getLabel(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PolicyListPage() {
  const history = useHistory();
  const location = useLocation();

  const { searchText, debouncedSearchText, setSearchText, clearSearch } = useSearch();
  const { data: policyTypesRes } = usePolicyTypesQuery();
  const policyTypes = policyTypesRes?.data ?? [];
  const allTypeIds = useMemo(() => policyTypes.map((t) => t.id), [policyTypes]);

  const [activeUrgency, setActiveUrgency] = useState<UrgencyBucket | null>(null);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urgency = queryParams.get('urgency');
    if (urgency && ['overdue', 'due7', 'due30', 'future'].includes(urgency)) {
      setActiveUrgency(urgency as UrgencyBucket);
    } else {
      setActiveUrgency(null);
    }
  }, [location.search]);

  const params: PolicyListParams = {};
  if (debouncedSearchText) params.search = debouncedSearchText;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfinitePoliciesQuery(params);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPolicies = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const { counts, unfilteredByUrgencyCount } = useMemo(() => {
    const buckets = { overdue: 0, due7: 0, due30: 0, future: 0 };
    if (allPolicies.length === 0) return { counts: buckets, unfilteredByUrgencyCount: 0 };
    const today = new Date();
    let count = 0;
    for (const policy of allPolicies) {
      if (filterTypes.length > 0 && !filterTypes.includes(policy.policyTypeId)) continue;
      if (filterStatuses.length > 0 && !filterStatuses.includes(policy.renewalStatus)) continue;
      const days = daysToExpiry(policy.endDate, today);
      buckets[urgencyBucket(days)] += 1;
      count++;
    }
    return { counts: buckets, unfilteredByUrgencyCount: count };
  }, [allPolicies, filterTypes, filterStatuses]);

  const enriched = useMemo(() => {
    if (allPolicies.length === 0) return [];
    const today = new Date();
    return allPolicies
      .map((policy: PolicyWithClient) => {
        const days = daysToExpiry(policy.endDate, today);
        return { ...policy, daysToExpiry: days, urgency: urgencyBucket(days) };
      })
      .filter((policy) => {
        if (activeUrgency && policy.urgency !== activeUrgency) return false;
        if (filterTypes.length > 0 && !filterTypes.includes(policy.policyTypeId)) return false;
        if (filterStatuses.length > 0 && !filterStatuses.includes(policy.renewalStatus))
          return false;
        return true;
      })
      .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  }, [allPolicies, activeUrgency, filterStatuses, filterTypes]);

  const activeFilterCount = filterTypes.length + filterStatuses.length;
  const totalCount = unfilteredByUrgencyCount;

  if (isLoading) return <PageLoader variant="list" />;

  const urgencyTabs = [
    { key: null, label: 'All', count: totalCount },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
    { key: 'due7', label: 'Due ≤7d', count: counts.due7 },
    { key: 'due30', label: 'Due ≤30d', count: counts.due30 },
    { key: 'future', label: 'Future', count: counts.future },
  ] as const;

  return (
    <AppShellPage
      icon={AlertTriangle}
      title="Renewal Workbench"
      subtitle="Search expiring policies, triage urgency, and move into the next customer action."
      actions={
        <Button
          variant="primary"
          size="sm"
          className="!hidden md:!flex items-center gap-1.5"
          onClick={() => {
            history.push('/policies/new');
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Renewal</span>
        </Button>
      }
      hero={
        <div className="space-y-3">
          {/* Search + Filter row */}
          <div className="flex gap-2 items-center">
            <div className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl border border-line bg-paper/90 px-4 shadow-inner transition-all focus-within:border-line-strong focus-within:shadow-none">
              <Search size={15} className="shrink-0 text-ink-faint" />
              <input
                className="flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                placeholder="Search client, vehicle, or policy number"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                }}
              />
              {searchText && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint hover:bg-surface hover:text-ink transition"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            {/* Filter button — only on mobile/tablet (desktop has inline panel) */}
            <button
              type="button"
              onClick={() => {
                setShowFilters(true);
              }}
              className={cn(
                'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all',
                activeFilterCount > 0
                  ? 'border-slate bg-slate text-white shadow-[0_6px_20px_rgba(15,118,110,0.28)]'
                  : 'border-line-strong bg-surface text-ink-soft hover:bg-paper',
              )}
              aria-label="Open filters"
            >
              <SlidersHorizontal size={16} />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-red-edge" />
              )}
            </button>
          </div>

          {/* Counts row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone="accent">{`${String(totalCount)} policies`}</Badge>
            {activeFilterCount > 0 && (
              <Badge tone="neutral">{`${String(activeFilterCount)} filter${activeFilterCount > 1 ? 's' : ''}`}</Badge>
            )}
          </div>

          {/* Urgency tab pills */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 pb-0.5">
              {urgencyTabs.map((tab) => {
                const isActive = tab.key === activeUrgency;
                return (
                  <button
                    key={tab.key ?? 'all'}
                    type="button"
                    onClick={() => {
                      setActiveUrgency(tab.key);
                      if (tab.key) history.replace(`/policies?urgency=${tab.key}`);
                      else history.replace('/policies');
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 sm:px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap',
                      isActive
                        ? 'border-slate bg-slate text-white shadow-sm'
                        : 'border-line-strong bg-surface text-ink-soft hover:bg-paper',
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[9px] font-black',
                        isActive ? 'bg-white/20 text-white' : 'bg-paper text-ink-faint',
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      }
    >
      <IonRefresher
        slot="fixed"
        onIonRefresh={(event) => {
          void refetch().finally(() => {
            event.detail.complete();
          });
        }}
      >
        <IonRefresherContent />
      </IonRefresher>

      {/* ── Desktop cards grid ── */}
      <div className="min-w-0 space-y-6">
        {enriched.length === 0 && !isFetchingNextPage && !hasNextPage ? (
          <EmptyState
            icon={AlertTriangle}
            variant={activeFilterCount > 0 ? 'filter' : 'search'}
            title="No renewals matched this view"
            description="Try a broader search, clear your active filters, or switch urgency buckets."
            tip={
              activeFilterCount > 0
                ? 'You have active filters applied. Clearing them will show all renewals.'
                : 'Renewals appear here once a client has a policy with an upcoming expiry date.'
            }
            action={
              activeFilterCount > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterTypes([]);
                    setFilterStatuses([]);
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {enriched.length > 0 && (
          <motion.div
            key={`${String(activeUrgency)}-${debouncedSearchText}`}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr"
          >
            {enriched.map((policy) => (
              <motion.div key={policy.id} variants={cardVariant} layout className="h-full">
                <SurfaceCard
                  className="group h-full cursor-pointer overflow-hidden p-0 hover:border-slate/40 dark:hover:border-slate/40 hover:shadow-[0_12px_40px_rgba(15,118,110,0.06)] dark:hover:shadow-[0_12px_40px_rgba(45,212,191,0.04)] transition-all duration-300"
                  onClick={() => {
                    history.push(`/policies/${policy.id}`);
                  }}
                >
                  <div className="flex h-full items-stretch">
                    {/* Urgency edge */}
                    <div
                      className={cn(
                        'w-1.5 flex-none transition-all duration-300 group-hover:w-2',
                        urgencyColors[policy.urgency] ?? 'bg-gray-edge',
                      )}
                    />

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3">
                        {/* Name + Avatar Block */}
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105',
                              getInitialsColor(policy.client.insuredName),
                            )}
                          >
                            {initials(policy.client.insuredName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-ink transition duration-200 group-hover:text-slate break-words leading-snug">
                              {policy.client.insuredName}
                            </h3>
                            <p
                              className={cn(
                                'mt-0.5 text-xs font-bold leading-normal',
                                policy.urgency === 'overdue' && 'text-red-fg',
                                policy.urgency === 'due7' && 'text-amber-fg',
                                policy.urgency === 'due30' && 'text-green-fg',
                                policy.urgency === 'future' && 'text-ink-faint',
                              )}
                            >
                              {daysLabel(policy.daysToExpiry)}
                            </p>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <Badge tone="neutral">{policy.policyType.name}</Badge>
                          {policy.vehicleNumber && (
                            <Badge
                              tone="neutral"
                              className="font-mono normal-case tracking-[0.08em]"
                            >
                              {policy.vehicleNumber}
                            </Badge>
                          )}
                          <Badge tone={statusTone(policy.renewalStatus)} dot>
                            {RENEWAL_STATUS_LABELS[policy.renewalStatus] ?? policy.renewalStatus}
                          </Badge>

                          {policy.isClaimed && (
                            <Badge
                              tone="overdue"
                              className="bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/50"
                            >
                              Claimed
                            </Badge>
                          )}
                        </div>

                        {policy.referenceNote && (
                          <div className="rounded-xl bg-paper/60 border border-line/45 px-3 py-2 text-xs text-ink-soft transition-colors duration-200 group-hover:bg-paper/85">
                            <span className="text-[9px] font-black tracking-wider text-ink-faint mr-1.5 uppercase">
                              REF:
                            </span>
                            <span className="font-semibold text-ink">
                              {policy.referenceNote.toLowerCase().startsWith('ref:')
                                ? policy.referenceNote.slice(4).trim()
                                : policy.referenceNote}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Footer row */}
                      <div className="flex items-center justify-between border-t border-line/80 px-4 sm:px-5 py-3 bg-surface/30 group-hover:bg-surface/70 transition-colors duration-300">
                        <div className="flex items-center gap-1.5 text-ink-faint">
                          <Calendar size={12} className="shrink-0 text-ink-faint/70" />
                          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em]">
                            {`Ends ${formatDate(policy.endDate)}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {policy.client.mobileNumber && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`tel:${policy.client.mobileNumber ?? ''}`);
                                }}
                                title="Call client"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                              >
                                <Phone size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  history.push(`/policies/${policy.id}?wa=true`);
                                }}
                                title="Send WhatsApp"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-green-edge/30 bg-green-bg text-green-fg shadow-sm transition hover:bg-green-edge/20 active:scale-95 cursor-pointer"
                              >
                                <MessageCircle size={13} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              history.push(`/policies/${policy.id}/edit`, {
                                from: location.pathname,
                              });
                            }}
                            title="Edit policy"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                          >
                            <Pencil size={12} />
                          </button>
                          <div className="flex h-5 w-5 items-center justify-center text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-slate">
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SurfaceCard>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Infinite scroll sentinel */}
        {hasNextPage && <div ref={sentinelRef} className="h-4" />}

        {/* Loading more indicator */}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 rounded-full border-2 border-slate/30 border-t-slate animate-spin" />
            <span className="ml-2 text-sm text-ink-faint">Loading more...</span>
          </div>
        )}
      </div>

      {/* Filter Sheet Dialog — mobile/tablet only */}
      <Dialog
        open={showFilters}
        onClose={() => {
          setShowFilters(false);
        }}
        title="Filter renewals"
        description="Narrow the workbench to the segment you need right now."
        sheet
      >
        <div className="space-y-6">
          <FilterChips
            label="Policy type"
            items={allTypeIds}
            selected={filterTypes}
            getLabel={(v) => policyTypes.find((t) => t.id === v)?.name || v}
            onToggle={(v) => {
              setFilterTypes((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
              );
            }}
          />

          <FilterChips
            label="Renewal status"
            items={ALL_STATUSES}
            selected={filterStatuses}
            getLabel={(v) => RENEWAL_STATUS_LABELS[v]}
            onToggle={(v) => {
              setFilterStatuses((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
              );
            }}
          />

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => {
                setFilterTypes([]);
                setFilterStatuses([]);
              }}
            >
              Clear all
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={() => {
                setShowFilters(false);
              }}
            >
              Apply filters
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShellPage>
  );
}
