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
  UserCheck,
} from 'lucide-react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useClientQuery, useDeleteClientMutation } from '@features/clients/index.js';
import { RENEWAL_STATUS_LABELS } from '@repo/constants';
import type { Policy } from '@repo/types';
import { formatDate, initials, isMotorPolicy, daysToExpiry, urgencyBucket } from '@repo/utils';
import BottomBar from '@components/BottomBar.js';
import PageLoader from '@components/ui/PageLoader.js';
import AlertDialog from '@components/ui/AlertDialog.js';
import Button from '@components/ui/Button.js';
import Badge from '@components/ui/Badge.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import { cn } from '@utils/Cn.js';

const urgencyColors: Record<string, string> = {
  overdue: 'bg-red-edge',
  due7: 'bg-amber-edge',
  due30: 'bg-green-edge',
  future: 'bg-gray-edge',
};

function daysLabel(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    return abs === 1 ? '1 day overdue' : `${String(abs)} days overdue`;
  }
  if (days === 0) return 'Due today';
  return days === 1 ? 'Due in 1 day' : `Due in ${String(days)} days`;
}

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
        <IonContent className="ion-padding font-sans">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
            <p className="text-sm font-bold text-ink-soft">Client record not found</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                history.push('/clients');
              }}
            >
              Back to Clients
            </Button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const name = client.insuredName;
  const tel = client.mobileNumber;
  const policies = (client as unknown as { policies?: Policy[] }).policies ?? [];

  const isDeleting = deleteClient.isPending;

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

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="ion-no-padding border-b relative overflow-hidden backdrop-blur-md border-indigo-500/15 bg-indigo-500/[0.03] from-indigo-500/10 via-indigo-500/[0.02] to-transparent">
          <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl opacity-60 pointer-events-none bg-indigo-400/20" />

          <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pt-2 pb-2.5 sm:pt-4 sm:pb-5">
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

            {/* Mobile Header Bar */}
            <div className="flex items-center justify-between md:hidden mb-3">
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    history.push(`/clients/${id}/edit`, { from: location.pathname });
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft shadow-sm hover:text-slate active:scale-95 transition-all"
                  aria-label="Edit client"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-edge/20 bg-red-bg/85 text-red-fg hover:bg-red-bg active:scale-95 transition-all"
                  aria-label="Delete client"
                >
                  <Trash2 size={13} />
                </button>
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
                  <div
                    className={cn(
                      'flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr font-black text-lg shadow-md border border-white/20 mt-0.5',
                      'from-indigo-500 to-indigo-600 text-white shadow-indigo-500/20',
                    )}
                  >
                    {initials(name)}
                  </div>
                  <div className="text-left min-w-0">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink leading-tight tracking-tight break-words">
                      {name}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Desktop-only Action buttons */}
              <div className="hidden md:flex gap-2">
                <Button variant="outline" onClick={() => history.push(`/clients/${id}/edit`, { from: location.pathname })}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent scrollY={false} className="[--background:transparent]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="h-full flex flex-col bg-body-bg overflow-hidden"
        >
          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 pb-4 md:pb-6 flex-1 min-h-0 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto md:overflow-hidden pb-4 md:pb-0">
              {/* ─── Col 1: Client details ─── */}
              <section className="flex flex-col bg-surface border border-line rounded-[24px] p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] md:h-full md:max-h-full overflow-y-auto custom-scroll shrink-0 md:shrink-0 self-start md:self-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40 shrink-0">
                    <User size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink leading-tight">Client Details</h3>
                  </div>
                </div>

                <div className="space-y-3 font-sans text-xs sm:text-sm">
                  <div>
                    <span className="text-ink-faint font-semibold block text-[11px]">
                      Insured Name
                    </span>
                    <span className="font-extrabold text-ink">{name}</span>
                  </div>
                  <div>
                    <span className="text-ink-faint font-semibold block text-[11px]">
                      Mobile Number
                    </span>
                    <span className="font-extrabold text-ink">{tel ?? '—'}</span>
                  </div>
                </div>

                {client.isOutsourced && client.associateAgent && (
                  <div className="mt-4 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/25 space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <UserCheck size={12} />
                        Associate Agent (Partner)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-800 dark:text-purple-200">
                        Outsourced
                      </span>
                    </div>
                    <div className="text-xs font-bold text-ink">
                      {client.associateAgent.name} {client.associateAgent.agencyName ? `(${client.associateAgent.agencyName})` : ''}
                    </div>
                    <div className="text-xs font-mono text-purple-700 dark:text-purple-300">
                      Mobile: {client.associateAgent.mobileNumber}
                    </div>
                    {client.associateAgent.notes && (
                      <p className="text-[11px] text-ink-muted italic">
                        "{client.associateAgent.notes}"
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 text-purple-600 dark:text-purple-400 border-purple-500/30"
                      onClick={() => window.open(`tel:${client.associateAgent?.mobileNumber}`)}
                    >
                      Call Associate Agent
                    </Button>
                  </div>
                )}

                {tel ? (
                  <div className="mt-5 pt-4 border-t border-line">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => {
                        window.open(`tel:${tel}`);
                      }}
                    >
                      <span>Call Client</span>
                    </Button>
                  </div>
                ) : null}
              </section>

              {/* ─── Col 2: Policies list ─── */}
              <section className="flex flex-col bg-surface border border-line rounded-[24px] p-6 shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left sm:col-span-1 xl:col-span-2 min-w-0 md:h-full md:max-h-full overflow-hidden">
                <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-line shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40 shrink-0">
                      <FileText size={15} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink leading-tight">Linked Policies</h3>
                      <p className="text-[11px] text-ink-faint">
                        {policies.length} policy record{policies.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scroll">
                  {policies.length === 0 ? (
                    <p className="text-sm text-ink-faint text-center py-8">
                      No policies linked to this client.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {policies.map((policy: Policy) => {
                        const days = daysToExpiry(policy.endDate);
                        const urgency = urgencyBucket(days);
                        return (
                          <SurfaceCard
                            key={policy.id}
                            className="group cursor-pointer overflow-hidden p-0 sm:p-0 lg:p-0 backdrop-blur-sm border border-line hover:border-slate/40 dark:hover:border-slate/40 hover:shadow-[0_12px_40px_rgba(15,118,110,0.06)] dark:hover:shadow-[0_12px_40px_rgba(45,212,191,0.04)] active:scale-[0.99] transition-all duration-300"
                            onClick={() => {
                              history.push(`/policies/${policy.id}`);
                            }}
                          >
                            <div className="flex items-stretch">
                              <div
                                className={cn(
                                  'w-1.5 flex-none transition-all duration-300 group-hover:w-2',
                                  urgencyColors[urgency] ?? 'bg-gray-edge',
                                )}
                              />
                              <div className="flex min-w-0 flex-1 flex-col justify-between">
                                <div className="p-4 flex flex-col gap-2.5">
                                  <div className="flex items-start gap-3">
                                    <div className="min-w-0 flex-1 text-left">
                                      <h3 className="text-sm font-extrabold tracking-tight text-ink transition duration-200 group-hover:text-slate break-words leading-snug">
                                        {policy.policyType?.name ?? '—'}
                                        {policy.insuredPersonName && (
                                          <span className="text-ink-faint font-semibold ml-1.5 text-xs">
                                            ({policy.insuredPersonName})
                                          </span>
                                        )}
                                      </h3>
                                      <p
                                        className={cn(
                                          'mt-0.5 text-xs font-bold leading-normal',
                                          urgency === 'overdue' && 'text-red-fg',
                                          urgency === 'due7' && 'text-amber-fg',
                                          urgency === 'due30' && 'text-green-fg',
                                          urgency === 'future' && 'text-ink-faint',
                                        )}
                                      >
                                        {daysLabel(days)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {policy.policyNumber && (
                                      <Badge tone="neutral" className="font-mono">
                                        {policy.policyNumber}
                                      </Badge>
                                    )}
                                    {policy.vehicleNumber ? (
                                      <Badge tone="neutral" className="font-mono tracking-[0.08em]">
                                        {policy.vehicleNumber}
                                      </Badge>
                                    ) : isMotorPolicy(policy.policyType?.name) ? (
                                      <Badge tone="pending" className="border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold">
                                        Vehicle No : Pending
                                      </Badge>
                                    ) : null}
                                    <Badge tone={statusTone(policy.renewalStatus)} dot>
                                      {RENEWAL_STATUS_LABELS[policy.renewalStatus] ?? policy.renewalStatus}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-line/80 px-4 py-2.5 bg-surface/30 group-hover:bg-surface/70 transition-colors duration-300">
                                  <div className="flex items-center gap-1.5 text-ink-faint">
                                    <Calendar size={12} className="shrink-0 text-ink-faint/70" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                                      {`Ends ${formatDate(policy.endDate)}`}
                                    </span>
                                  </div>

                                  <div className="flex h-5 w-5 items-center justify-center text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-slate">
                                    <ChevronRight size={14} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </SurfaceCard>
                        );
                      })}
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

function statusTone(status: string) {
  if (status === 'PENDING') return 'pending' as const;
  if (status === 'REMINDED') return 'reminded' as const;
  if (status === 'RENEWED') return 'renewed' as const;
  if (status === 'NOT_RENEWED') return 'notRenewed' as const;
  if (status === 'INACTIVE') return 'inactive' as const;
  return 'lapsed' as const;
}
