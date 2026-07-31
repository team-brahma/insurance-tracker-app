import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearch } from '@hooks/useSearch.js';
import { Search, Plus, Pencil, Trash2, ChevronRight, Users, Phone, Calendar, UserCheck, X } from 'lucide-react';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import AppShellPage from '@components/layout/AppShellPage.js';
import EmptyState from '@components/ui/EmptyState.js';
import PageLoader from '@components/ui/PageLoader.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import Badge from '@components/ui/Badge.js';
import AlertDialog from '@components/ui/AlertDialog.js';
import Button from '@components/ui/Button.js';
import Select from '@components/ui/Select.js';
import { useInfiniteClientsQuery, useDeleteClientMutation } from '@features/clients/index.js';
import { useAssociateAgentsQuery } from '@features/associateAgents/index.js';
import type { ClientWithPolicies } from '@features/clients/types/index.js';
import { formatDate, initials } from '@repo/utils';
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
  show: { transition: { staggerChildren: 0.05 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
};

export default function ClientListPage() {
  const history = useHistory();
  const { searchText, debouncedSearchText, setSearchText, clearSearch } = useSearch();
  const [deleteTarget, setDeleteTarget] = useState<ClientWithPolicies | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'direct' | 'outsourced'>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  const { data: associateAgents = [] } = useAssociateAgentsQuery();

  const associateAgentOptions = useMemo(
    () => [
      { value: '', label: '-- All Associate Agents --' },
      ...associateAgents.map((ag) => ({
        value: ag.id,
        label: ag.name,
      })),
    ],
    [associateAgents],
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  const params = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (debouncedSearchText) p.search = debouncedSearchText;
    if (filterMode === 'direct') {
      p.isOutsourced = false;
      p.is_outsourced = false;
    }
    if (filterMode === 'outsourced') {
      p.isOutsourced = true;
      p.is_outsourced = true;
    }
    if (selectedAgentId) {
      p.associateAgentId = selectedAgentId;
      p.associate_agent_id = selectedAgentId;
    }
    return p;
  }, [debouncedSearchText, filterMode, selectedAgentId]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteClientsQuery(params as never);

  const allClients = useMemo(
    () => (data?.pages.flatMap((p) => p.data) ?? []) as ClientWithPolicies[],
    [data],
  );
  const deleteMutation = useDeleteClientMutation();

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

  function handleDelete(client: ClientWithPolicies) {
    deleteMutation.mutate(
      { id: client.id, insuredName: client.insuredName },
      {
        onSuccess: () => {
          setDeleteTarget(null);
        },
      },
    );
  }

  if (isLoading) return <PageLoader variant="list" />;

  return (
    <AppShellPage
      icon={Users}
      title="Clients"
      subtitle="Manage your client records and view their policy details."
      actions={
        <Button
          variant="primary"
          size="sm"
          className="!hidden md:!flex items-center gap-1.5"
          onClick={() => {
            history.push('/clients/new');
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Client</span>
        </Button>
      }
      hero={
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl border border-line bg-paper/90 px-4 shadow-inner transition-all focus-within:border-line-strong focus-within:shadow-none">
              <Search size={15} className="shrink-0 text-ink-faint" />
              <input
                className="flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                placeholder="Search clients..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                }}
              />
              {searchText && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-ink-faint hover:bg-surface hover:text-ink transition cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter modes */}
            <div className="flex items-center gap-1 bg-paper/80 p-1 rounded-2xl border border-line shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setSelectedAgentId('');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl transition-all cursor-pointer',
                  filterMode === 'all' && !selectedAgentId
                    ? 'bg-surface text-ink shadow-sm border border-line'
                    : 'text-ink-faint hover:text-ink',
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('direct');
                  setSelectedAgentId('');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-xl transition-all cursor-pointer',
                  filterMode === 'direct'
                    ? 'bg-surface text-ink shadow-sm border border-line'
                    : 'text-ink-faint hover:text-ink',
                )}
              >
                Direct
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('outsourced')}
                className={cn(
                  'px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1',
                  filterMode === 'outsourced'
                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-sm border border-purple-500/30'
                    : 'text-ink-faint hover:text-ink',
                )}
              >
                <UserCheck size={12} />
                <span>Outsourced</span>
              </button>
            </div>
          </div>

          {filterMode === 'outsourced' && associateAgents.length > 0 && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-ink-faint font-semibold">Filter by Associate Agent:</span>
              <Select
                value={selectedAgentId}
                onValueChange={(val) => setSelectedAgentId(val)}
                options={associateAgentOptions}
                className="h-8 text-xs min-w-[180px]"
              />
            </div>
          )}
        </div>
      }
    >
      <div className="pb-4">
        {allClients.length === 0 && (
          <EmptyState
            icon={Users}
            variant={debouncedSearchText ? 'search' : 'default'}
            title={debouncedSearchText ? 'No clients found' : 'No clients yet'}
            description={
              debouncedSearchText
                ? 'Try a different search term or clear the search.'
                : 'Create your first client to start tracking insurance policies.'
            }
            tip={
              debouncedSearchText
                ? 'Search matches client name, email, phone, and policy details.'
                : 'You can add client details like name, contact info, and linked policies.'
            }
          />
        )}

        {allClients.length > 0 && (
          <motion.div
            key={`${debouncedSearchText}-${filterMode}-${selectedAgentId}`}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 min-w-0"
          >
            {allClients.map((client) => {
              const policyCount = client.policies?.length ?? 0;
              return (
                <motion.div key={client.id} variants={cardVariant} layout className="h-full">
                  <SurfaceCard
                    className="group h-full cursor-pointer overflow-hidden p-0 sm:p-0 lg:p-0 backdrop-blur-sm border border-line hover:border-slate/40 dark:hover:border-slate/40 hover:shadow-[0_12px_40px_rgba(15,118,110,0.06)] dark:hover:shadow-[0_12px_40px_rgba(45,212,191,0.04)] active:scale-[0.99] transition-all duration-300"
                    onClick={() => {
                      history.push(`/clients/${client.id}`);
                    }}
                  >
                    <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
                        <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105',
                                getInitialsColor(client.insuredName),
                              )}
                            >
                              {initials(client.insuredName)}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-ink transition duration-200 group-hover:text-slate break-words leading-snug">
                                {client.insuredName}
                              </h3>
                              <p className="mt-0.5 text-xs font-bold text-ink-faint">
                                {client.mobileNumber ?? 'No phone number'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {client.isOutsourced && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-500/20">
                                <UserCheck size={10} />
                                <span>
                                  Outsourced{client.associateAgent ? `: ${client.associateAgent.name}` : ''}
                                </span>
                              </span>
                            )}
                            <Badge tone="neutral">
                              {policyCount} {policyCount === 1 ? 'Policy' : 'Policies'}
                            </Badge>
                          </div>
                        </div>

                        {/* Footer row */}
                        <div className="flex items-center justify-between border-t border-line/80 px-4 sm:px-5 py-3 bg-surface/30 group-hover:bg-surface/70 transition-colors duration-300">
                          <div className="flex items-center gap-1.5 text-ink-faint">
                            <Calendar size={12} className="shrink-0 text-ink-faint/70" />
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em]">
                              {`Added ${formatDate(client.createdAt)}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {client.mobileNumber && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`tel:${client.mobileNumber}`);
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
                                history.push(`/clients/${client.id}/edit`);
                              }}
                              title="Edit Client"
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(client);
                              }}
                              title="Delete Client"
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
                    </SurfaceCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <div ref={sentinelRef} className="py-4 flex justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-ink-faint">
              <div className="w-4 h-4 rounded-full border-2 border-slate/30 border-t-slate animate-spin" />
              Loading more...
            </div>
          )}
        </div>

        <IonRefresher
          slot="fixed"
          onIonRefresh={(e) => {
            void refetch().then(() => {
              e.detail.complete();
            });
          }}
        >
          <IonRefresherContent />
        </IonRefresher>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        title="Delete Client"
        description={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.insuredName}? This will also delete all their policies.`
            : ''
        }
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        variant="destructive"
        loading={deleteMutation.isPending}
      />
    </AppShellPage>
  );
}
