import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearch } from '@hooks/useSearch.js';
import {
  Search,
  SlidersHorizontal,
  Phone,
  Pencil,
  Trash2,
  ChevronRight,
  HelpCircle,
  X,
  Calendar,
  CheckCircle,
  XCircle,
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
import DropEnquirySheet from '@features/enquiries/components/DropEnquirySheet.js';
import {
  useInfiniteEnquiriesQuery,
  useUpdateEnquiryStatusMutation,
  useDeleteEnquiryMutation,
  type EnquiryListParams,
} from '@features/enquiries/index.js';
import { ENQUIRY_STATUS_LABELS } from '@repo/constants';
import { usePolicyTypesQuery } from '@features/policyTypes/index.js';
import { formatDateTime, initials, isMotorPolicy } from '@repo/utils';
import { cn } from '@utils/Cn.js';
import { IonRefresher, IonRefresherContent } from '@ionic/react';

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

export default function EnquiryListPage() {
  const history = useHistory();
  const location = useLocation();

  const { searchText, debouncedSearchText, setSearchText, clearSearch } = useSearch();
  const { data: policyTypesRes } = usePolicyTypesQuery();
  const policyTypes = policyTypesRes?.data ?? [];
  const allTypeIds = useMemo(() => policyTypes.map((t) => t.id), [policyTypes]);

  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [tempFilterTypes, setTempFilterTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dropTarget, setDropTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const status = queryParams.get('status');
    if (status && ['OPEN', 'CONVERTED', 'DROPPED'].includes(status)) {
      setActiveStatus(status);
    } else {
      setActiveStatus(null);
    }
  }, [location.search]);

  const params = useMemo(() => {
    const p: EnquiryListParams = {};
    if (debouncedSearchText) p.search = debouncedSearchText;
    if (activeStatus) p.status = activeStatus;
    if (filterTypes.length > 0) p.policyType = filterTypes.join(',');
    return p;
  }, [debouncedSearchText, activeStatus, filterTypes]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteEnquiriesQuery(params);

  const updateStatusMutation = useUpdateEnquiryStatusMutation();
  const deleteMutation = useDeleteEnquiryMutation();

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

  const allEnquiries = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const firstPageMeta = data?.pages[0]?.meta as
    | { statusCounts?: { OPEN: number; CONVERTED: number; DROPPED: number; all: number } }
    | undefined;
  const statusCounts = firstPageMeta?.statusCounts ?? { OPEN: 0, CONVERTED: 0, DROPPED: 0, all: 0 };
  const unallEnquiriesCount = statusCounts.all;

  const handleDropConfirm = async (dropReason: string, dropNote?: string) => {
    if (!dropTarget) return;
    try {
      await updateStatusMutation.mutateAsync({
        id: dropTarget.id,
        status: 'DROPPED',
        dropReason,
        ...(dropNote !== undefined ? { dropNote } : {}),
      });
      setDropTarget(null);
    } catch {
      // Handled globally
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this enquiry?')) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      // Handled globally
    }
  };

  const activeFilterCount = filterTypes.length;

  if (isLoading) return <PageLoader variant="list" />;

  const statusTabs = [
    { key: null, label: 'All', count: unallEnquiriesCount },
    { key: 'OPEN', label: 'Open', count: statusCounts.OPEN },
    { key: 'CONVERTED', label: 'Converted', count: statusCounts.CONVERTED },
    { key: 'DROPPED', label: 'Dropped', count: statusCounts.DROPPED },
  ] as const;

  return (
    <AppShellPage
      icon={HelpCircle}
      title="Client Enquiries"
      subtitle="Track policies/enquiries from prospective clients and convert them to policy renewals."
      actions={
        <Button
          variant="primary"
          size="sm"
          className="!hidden md:!flex items-center gap-1.5"
          onClick={() => {
            history.push('/enquiries/new');
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Enquiry</span>
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
                placeholder="Search name, mobile number, or referred by"
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
            {/* Filter button */}
            <button
              type="button"
              onClick={() => {
                setTempFilterTypes(filterTypes);
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
          <div className="flex items-center gap-2 flex-wrap text-left">
            <Badge tone="accent">{`${String(unallEnquiriesCount)} enquiries`}</Badge>
            {activeFilterCount > 0 && (
              <Badge tone="neutral">{`${String(activeFilterCount)} filter${activeFilterCount > 1 ? 's' : ''}`}</Badge>
            )}
          </div>

          {/* Status tabs */}
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 pb-0.5">
              {statusTabs.map((tab) => {
                const isActive = tab.key === activeStatus;
                return (
                  <button
                    key={tab.key ?? 'all'}
                    type="button"
                    onClick={() => {
                      setActiveStatus(tab.key);
                      if (tab.key) history.replace(`/enquiries?status=${tab.key}`);
                      else history.replace('/enquiries');
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

      <div className="min-w-0 space-y-6">
        {allEnquiries.length === 0 && !isFetchingNextPage && !hasNextPage ? (
          <EmptyState
            icon={HelpCircle}
            variant={activeFilterCount > 0 ? 'filter' : 'search'}
            title="No enquiries matched this view"
            description="Try a broader search, clear your filters, or switch status tabs."
            tip={
              activeFilterCount > 0
                ? 'Remove some filters to broaden your results.'
                : 'Enquiries appear once a client submits a request through the portal.'
            }
            action={
              activeFilterCount > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterTypes([]);
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {allEnquiries.length > 0 && (
          <motion.div
            key={`${String(activeStatus)}-${debouncedSearchText}`}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr"
          >
            {allEnquiries.map((enquiry) => {
              const cardStatusTone =
                (enquiry.status as string) === 'OPEN'
                  ? 'pending'
                  : (enquiry.status as string) === 'CONVERTED'
                    ? 'renewed'
                    : 'notRenewed';

              return (
                <motion.div key={enquiry.id} variants={cardVariant} layout className="h-full">
                  <SurfaceCard
                    className="group h-full cursor-pointer overflow-hidden p-0 sm:p-0 lg:p-0 backdrop-blur-sm border border-line hover:border-slate/40 dark:hover:border-slate/40 hover:shadow-[0_12px_40px_rgba(15,118,110,0.06)] dark:hover:shadow-[0_12px_40px_rgba(45,212,191,0.04)] active:scale-[0.99] transition-all duration-300"
                    onClick={() => {
                      history.push(`/enquiries/${enquiry.id}`);
                    }}
                  >
                    <div className="flex h-full items-stretch">
                      {/* Status edge */}
                      <div
                        className={cn(
                          'w-1.5 flex-none transition-all duration-300 group-hover:w-2',
                          (enquiry.status as string) === 'OPEN' && 'bg-blue-edge',
                          (enquiry.status as string) === 'CONVERTED' && 'bg-green-edge',
                          (enquiry.status as string) === 'DROPPED' && 'bg-red-edge',
                        )}
                      />

                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3">
                          {/* Name + Avatar */}
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105',
                                getInitialsColor(enquiry.name),
                              )}
                            >
                              {initials(enquiry.name)}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-ink transition duration-200 group-hover:text-slate break-words leading-snug">
                                {enquiry.name}
                              </h3>
                              <p className="mt-0.5 text-xs font-bold text-ink-faint">
                                {enquiry.mobileNumber}
                              </p>
                            </div>
                          </div>

                          {/* Details tags */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <Badge tone="neutral">{enquiry.policyType.name}</Badge>
                            {enquiry.vehicleNumber ? (
                              <Badge
                                tone="neutral"
                                className="font-mono normal-case tracking-[0.08em]"
                              >
                                {enquiry.vehicleNumber}
                              </Badge>
                            ) : isMotorPolicy(enquiry.policyType.name) ? (
                              <Badge
                                tone="pending"
                                className="border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold normal-case tracking-normal"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" />
                                Vehicle No : Pending
                              </Badge>
                            ) : null}
                            <Badge tone={cardStatusTone} dot>
                              {ENQUIRY_STATUS_LABELS[enquiry.status] ?? enquiry.status}
                            </Badge>
                            {enquiry.referredBy && (
                              <Badge tone="neutral" className="normal-case">
                                {`Ref: ${enquiry.referredBy}`}
                              </Badge>
                            )}
                          </div>

                          {enquiry.remindOn && (
                            <div className="rounded-xl bg-paper/60 border border-line/45 px-3 py-2 text-xs text-ink-soft transition-colors duration-200 group-hover:bg-paper/85 text-left">
                              <span className="text-[9px] font-black tracking-wider text-ink-faint mr-1.5 uppercase">
                                REMIND:
                              </span>
                              <span className="font-semibold text-ink">
                                {formatDateTime(enquiry.remindOn)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card status options inside footer */}
                        <div className="flex items-center justify-between border-t border-line/80 px-4 sm:px-5 py-3 bg-surface/30 group-hover:bg-surface/70 transition-colors duration-300">
                          {/* Left actions: Convert / Drop inside card */}
                          <div className="flex items-center gap-1.5 flex-1 mr-2">
                            {(enquiry.status as string) === 'OPEN' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    history.push(`/policies/new?enquiryId=${enquiry.id}`);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-edge/30 bg-green-bg text-green-fg text-xs font-bold transition hover:bg-green-edge/20 active:scale-95 cursor-pointer shadow-sm"
                                  title="Convert to Policy/Renewal"
                                >
                                  <CheckCircle size={12} />
                                  <span>Convert</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDropTarget({ id: enquiry.id, name: enquiry.name });
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-edge/30 bg-red-bg text-red-fg text-xs font-bold transition hover:bg-red-edge/20 active:scale-95 cursor-pointer shadow-sm"
                                  title="Drop Enquiry"
                                >
                                  <XCircle size={12} />
                                  <span>Drop</span>
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 text-ink-faint">
                                <Calendar size={12} className="shrink-0 text-ink-faint/70" />
                                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em]">
                                  {`Created ${formatDateTime(enquiry.createdAt)}`}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Right actions: Phone, Edit, Delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {enquiry.mobileNumber && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`tel:${enquiry.mobileNumber}`);
                                }}
                                title="Call contact"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                              >
                                <Phone size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                history.push(`/enquiries/${enquiry.id}/edit`);
                              }}
                              title="Edit Enquiry"
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDelete(enquiry.id);
                              }}
                              title="Delete Enquiry"
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-red-fg active:scale-95 cursor-pointer"
                            >
                              <Trash2 size={12} />
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
              );
            })}
          </motion.div>
        )}

        {hasNextPage && <div ref={sentinelRef} className="h-4" />}

        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 rounded-full border-2 border-slate/30 border-t-slate animate-spin" />
            <span className="ml-2 text-sm text-ink-faint">Loading more...</span>
          </div>
        )}
      </div>

      {/* Filter dialog */}
      <Dialog
        open={showFilters}
        onClose={() => {
          setShowFilters(false);
        }}
        title="Filter enquiries"
        description="Filter your enquiries list by policy type."
        sheet
      >
        <div className="space-y-6">
          <FilterChips
            label="Policy type"
            items={allTypeIds}
            selected={tempFilterTypes}
            getLabel={(v) => policyTypes.find((t) => t.id === v)?.name || v}
            onToggle={(v) => {
              setTempFilterTypes((prev) =>
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
                setTempFilterTypes([]);
              }}
            >
              Clear all
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={() => {
                setFilterTypes(tempFilterTypes);
                setShowFilters(false);
              }}
            >
              Apply filters
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Drop reason sheet */}
      <DropEnquirySheet
        open={!!dropTarget}
        enquiryName={dropTarget?.name ?? ''}
        isPending={updateStatusMutation.isPending}
        onClose={() => {
          setDropTarget(null);
        }}
        onConfirm={(reason, note) => {
          void handleDropConfirm(reason, note);
        }}
      />
    </AppShellPage>
  );
}
