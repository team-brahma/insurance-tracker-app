import { useState } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonFooter } from '@ionic/react';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  User,
  FileText,
  Calendar,
  ChevronRight,
  Users,
} from 'lucide-react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useClientQuery, useDeleteClientMutation } from '@features/clients/index.js';
import { RENEWAL_STATUS_LABELS } from '@repo/constants';
import type { Policy } from '@repo/types';
import { formatDate, initials } from '@repo/utils';
import BottomBar from '@components/BottomBar.js';
import PageLoader from '@components/ui/PageLoader.js';
import AlertDialog from '@components/ui/AlertDialog.js';
import Button from '@components/ui/Button.js';
import Badge from '@components/ui/Badge.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import { cn } from '@utils/Cn.js';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const location = useLocation();

  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading } = useClientQuery(id);
  const deleteClient = useDeleteClientMutation();

  const client = data?.data;

  if (isLoading) {
    return <PageLoader variant="default" />;
  }

  if (!client) {
    return (
      <IonPage>
        <IonContent className="ion-padding-bottom">
          <div className="flex h-full flex-col items-center justify-center bg-body-bg px-4 text-center">
            <Users size={48} className="text-ink-faint mb-4" />
            <h3 className="text-lg font-bold text-ink">Client not found</h3>
            <p className="mt-1 text-sm text-ink-faint max-w-xs">
              This client may have been deleted or the link is invalid.
            </p>
            <Button
              variant="outline"
              size="md"
              className="mt-6 flex items-center gap-2"
              onClick={() => {
                history.push('/clients');
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Clients</span>
            </Button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const name = client.insuredName;
  const tel = client.mobileNumber;
  const policies = (client as unknown as { policies?: Policy[] }).policies ?? [];

  function handleDelete() {
    deleteClient.mutate(
      { id, insuredName: name },
      {
        onSuccess: () => {
          history.replace('/clients');
        },
      },
    );
  }

  const isDeleting = deleteClient.isPending;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="ion-no-padding border-b relative overflow-hidden backdrop-blur-md border-indigo-500/15 bg-indigo-500/[0.03] from-indigo-500/10 via-indigo-500/[0.02] to-transparent">
          {/* Ambient Background Light Glow */}
          <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl opacity-60 pointer-events-none bg-indigo-500/10" />

          <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pt-5 pb-4 sm:pt-5 sm:pb-6">
            {/* Breadcrumb — desktop */}
            <nav className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint opacity-70 mb-3">
              <button
                type="button"
                onClick={() => {
                  history.push('/clients');
                }}
                className="hover:text-slate transition-colors cursor-pointer"
              >
                Clients
              </button>
              <span>›</span>
              <span className="text-ink font-bold">{name}</span>
            </nav>

            {/* Mobile-only Top Action Bar */}
            <div className="flex md:hidden items-center justify-between w-full mb-4">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5"
                onClick={() => {
                  history.goBack();
                }}
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </Button>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-bold cursor-pointer shadow-sm transition-all"
                  onClick={() => {
                    history.push(`/clients/${id}/edit`, { from: location.pathname });
                  }}
                  aria-label="Edit client"
                >
                  <Pencil size={12} className="text-slate" />
                  <span>Edit</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-red-edge/20 bg-red-bg/85 text-red-fg text-xs font-bold cursor-pointer shadow-sm transition-all"
                  onClick={() => {
                    setConfirmDelete(true);
                  }}
                  aria-label="Delete client"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </motion.button>
              </div>
            </div>

            {/* Main Header Layout */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-3 sm:gap-4.5 min-w-0">
                {/* Desktop-only Back button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="!hidden md:!flex items-center gap-1.5"
                  onClick={() => {
                    history.goBack();
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </Button>

                {/* Avatar + Title Container */}
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className={cn(
                      'flex h-13 w-13 sm:h-15 sm:w-15 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr font-black text-base sm:text-lg shadow-md select-none border border-white/20 transition-all mt-0.5',
                      'from-indigo-500 to-indigo-600 text-white shadow-indigo-500/20',
                    )}
                  >
                    {initials(name)}
                  </motion.div>

                  <div className="text-left min-w-0">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink leading-tight tracking-tight break-words">
                      {name}
                    </h2>

                    {/* Structured Info Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm">
                        {tel ?? 'No phone'}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm">
                        {policies.length} {policies.length === 1 ? 'Policy' : 'Policies'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop-only Action buttons */}
              <div className="hidden md:flex gap-2 shrink-0 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02, translateY: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-line bg-surface text-ink hover:text-slate hover:border-slate/30 text-xs font-bold cursor-pointer shadow-sm hover:shadow transition-all"
                  onClick={() => {
                    history.push(`/clients/${id}/edit`, { from: location.pathname });
                  }}
                  aria-label="Edit client"
                >
                  <Pencil size={13} className="text-slate" />
                  <span>Edit Details</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, translateY: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-red-edge/20 bg-red-bg/85 text-red-fg hover:bg-red-bg hover:border-red-edge/40 text-xs font-bold cursor-pointer shadow-sm hover:shadow transition-all"
                  onClick={() => {
                    setConfirmDelete(true);
                  }}
                  aria-label="Delete client"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </motion.button>
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-bottom">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="min-h-full bg-body-bg"
        >
          {/* ── Content body ── */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 items-start">
              {/* ─── Col 1: Client details ─── */}
              <section className="flex flex-col bg-surface border border-line rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 lg:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40 shrink-0">
                    <User size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink leading-tight">Client Details</h3>
                    <p className="text-[10px] text-ink-faint">Insurance client record</p>
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-line animate-fade-in flex-1">
                  <DataRow label="Name" value={name} />
                  <DataRow
                    label="Mobile"
                    value={
                      tel ? (
                        <span className="font-mono">{tel}</span>
                      ) : (
                        <span className="text-ink-faint text-xs">—</span>
                      )
                    }
                  />
                  <DataRow
                    label="Client Since"
                    value={<span className="font-semibold">{formatDate(client.createdAt)}</span>}
                  />
                </div>
              </section>

              {/* ─── Col 2: Policies ─── */}
              <section className="flex flex-col bg-surface border border-line rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 lg:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left min-w-0 xl:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate/10 dark:bg-slate/20 text-slate border border-slate/15 shrink-0">
                    <FileText size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink leading-tight">Policy Records</h3>
                    <p className="text-[10px] text-ink-faint">
                      {policies.length} linked {policies.length === 1 ? 'policy' : 'policies'}
                    </p>
                  </div>
                </div>

                <div className="flex-1">
                  {policies.length === 0 ? (
                    <p className="text-sm text-ink-faint text-center py-8">
                      No policies linked to this client.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {policies.map((policy) => (
                        <SurfaceCard
                          key={policy.id}
                          className="cursor-pointer"
                          onClick={() => {
                            history.push(`/policies/${policy.id}`);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-bold text-ink truncate">
                                  {policy.policyType?.name ?? '—'}
                                  {policy.insuredPersonName && ` (${policy.insuredPersonName})`}
                                </span>
                                <Badge
                                  tone={statusTone(policy.renewalStatus)}
                                  dot
                                  className="shrink-0"
                                >
                                  {RENEWAL_STATUS_LABELS[policy.renewalStatus] ??
                                    policy.renewalStatus}
                                </Badge>
                              </div>
                              <p className="text-xs text-ink-faint mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                {policy.policyNumber ? (
                                  <>
                                    <span className="font-mono truncate max-w-[140px]">
                                      {policy.policyNumber}
                                    </span>
                                    <span className="text-ink-faint shrink-0">·</span>
                                  </>
                                ) : null}
                                <Calendar size={10} className="shrink-0" />
                                <span className="whitespace-nowrap">
                                  Ends {formatDate(policy.endDate)}
                                </span>
                                {policy.vehicleNumber && (
                                  <>
                                    <span className="text-ink-faint shrink-0">·</span>
                                    <span className="font-mono">{policy.vehicleNumber}</span>
                                  </>
                                )}
                              </p>
                            </div>
                            <ChevronRight size={14} className="text-ink-faint shrink-0" />
                          </div>
                        </SurfaceCard>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </IonContent>

      <AlertDialog
        open={confirmDelete}
        onClose={() => {
          setConfirmDelete(false);
        }}
        onConfirm={handleDelete}
        title="Delete Client"
        description={`Are you sure you want to delete ${name}? This will also delete all their policies.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        variant="destructive"
        loading={isDeleting}
      />

      <IonFooter className="ion-no-border ion-no-padding bg-transparent md:!hidden">
        <div
          className="px-4 pt-2"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <BottomBar />
        </div>
      </IonFooter>
    </IonPage>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3 min-w-0">
      <span className="text-xs font-semibold text-ink-faint uppercase tracking-wider shrink-0">
        {label}
      </span>
      <span className="text-sm font-semibold text-ink text-right truncate max-w-[55%] sm:max-w-[65%]">
        {value}
      </span>
    </div>
  );
}

function statusTone(status: string) {
  if (status === 'PENDING') return 'pending' as const;
  if (status === 'REMINDED') return 'reminded' as const;
  if (status === 'RENEWED') return 'renewed' as const;
  if (status === 'NOT_RENEWED') return 'notRenewed' as const;
  return 'lapsed' as const;
}
