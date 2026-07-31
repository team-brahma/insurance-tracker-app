import { useState } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonFooter } from '@ionic/react';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  User,
  Calendar,
  HelpCircle,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Send,
  FileText,
} from 'lucide-react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  useEnquiryQuery,
  useUpdateEnquiryStatusMutation,
  useDeleteEnquiryMutation,
  useEnquiryStatusHistoryQuery,
} from '@features/enquiries/hooks/useEnquiriesQuery.js';
import { ENQUIRY_STATUS_LABELS, DROP_REASON_LABELS } from '@repo/constants';
import { EnquiryStatus, type EnquiryStatusHistory } from '@repo/types';
import { formatDate, formatDateTime, initials, isMotorPolicy } from '@repo/utils';
import PageLoader from '@components/ui/PageLoader.js';
import AlertDialog from '@components/ui/AlertDialog.js';
import Button from '@components/ui/Button.js';
import DropEnquirySheet from '@features/enquiries/components/DropEnquirySheet.js';
import { cn } from '@utils/Cn.js';
import BottomBar from '@components/BottomBar.js';

export default function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const location = useLocation();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDropSheet, setShowDropSheet] = useState(false);

  const { data: historyRes } = useEnquiryStatusHistoryQuery(id);
  const historyData = historyRes?.data ?? [];

  const { data, isLoading } = useEnquiryQuery(id);
  const deleteEnquiry = useDeleteEnquiryMutation();
  const updateStatus = useUpdateEnquiryStatusMutation();

  const enquiry = data?.data;

  if (isLoading) {
    return <PageLoader variant="default" />;
  }

  if (!enquiry) {
    return (
      <IonPage>
        <IonContent className="ion-padding-bottom">
          <div className="flex h-full flex-col items-center justify-center bg-body-bg px-4 text-center">
            <HelpCircle size={48} className="text-ink-faint mb-4" />
            <h3 className="text-lg font-bold text-ink">Enquiry not found</h3>
            <p className="mt-1 text-sm text-ink-faint max-w-xs">
              This enquiry may have been deleted or the link is invalid.
            </p>
            <Button
              variant="outline"
              size="md"
              className="mt-6 flex items-center gap-2"
              onClick={() => {
                history.push('/enquiries');
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Enquiries</span>
            </Button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const tel = enquiry.mobileNumber;
  const name = enquiry.name;
  const policyType = enquiry.policyType.name;

  function sendSMS() {
    if (!tel) {
      toast.error('No phone number on file');
      return;
    }
    const body = `Hi ${name}, following up regarding your enquiry for ${policyType} policy. Let me know if you have any questions.`;
    window.open(`sms:${tel}?body=${encodeURIComponent(body)}`, '_blank');
  }

  function sendWhatsApp() {
    if (!tel) {
      toast.error('No phone number on file');
      return;
    }
    const body = `Hi ${name}, following up regarding your enquiry for ${policyType} policy. Let me know if you have any questions.`;
    window.open(`https://wa.me/${tel.replace('+', '')}?text=${encodeURIComponent(body)}`, '_blank');
  }

  function handleReopen() {
    updateStatus.mutate({ id, status: 'OPEN' });
  }

  function handleDropConfirm(dropReason: string, dropNote?: string) {
    updateStatus.mutate(
      { id, status: 'DROPPED', dropReason, dropNote },
      {
        onSuccess: () => {
          setShowDropSheet(false);
        },
      },
    );
  }

  function handleDelete() {
    deleteEnquiry.mutate(id, {
      onSuccess: () => {
        history.replace('/enquiries');
      },
    });
  }

  const isDeleting = deleteEnquiry.isPending;
  const isUpdatingStatus = updateStatus.isPending;

  const statusColors: Record<EnquiryStatus, string> = {
    [EnquiryStatus.OPEN]: 'border-blue-500/15 bg-blue-500/[0.04] text-blue-700 dark:text-blue-300',
    [EnquiryStatus.CONVERTED]:
      'border-emerald-500/15 bg-emerald-500/[0.04] text-emerald-700 dark:text-emerald-300',
    [EnquiryStatus.DROPPED]:
      'border-rose-500/15 bg-rose-500/[0.04] text-rose-700 dark:text-rose-300',
  };

  const statusGradients: Record<EnquiryStatus, string> = {
    [EnquiryStatus.OPEN]: 'from-blue-500/10 via-blue-500/[0.02] to-transparent',
    [EnquiryStatus.CONVERTED]: 'from-emerald-500/10 via-emerald-500/[0.02] to-transparent',
    [EnquiryStatus.DROPPED]: 'from-rose-500/10 via-rose-500/[0.02] to-transparent',
  };

  const avatarGradients: Record<EnquiryStatus, string> = {
    [EnquiryStatus.OPEN]: 'from-blue-500 to-indigo-600 text-white shadow-blue-500/20',
    [EnquiryStatus.CONVERTED]: 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/20',
    [EnquiryStatus.DROPPED]: 'from-rose-500 to-red-600 text-white shadow-rose-500/20',
  };

  const badgeStyles: Record<EnquiryStatus, string> = {
    [EnquiryStatus.OPEN]:
      'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900/50',
    [EnquiryStatus.CONVERTED]:
      'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/50',
    [EnquiryStatus.DROPPED]:
      'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/50',
  };

  const ambientGlowColors: Record<EnquiryStatus, string> = {
    [EnquiryStatus.OPEN]: 'bg-blue-500/10',
    [EnquiryStatus.CONVERTED]: 'bg-emerald-500/10',
    [EnquiryStatus.DROPPED]: 'bg-rose-500/10',
  };

  const statusIcons: Record<EnquiryStatus, typeof Clock> = {
    [EnquiryStatus.OPEN]: Clock,
    [EnquiryStatus.CONVERTED]: CheckCircle2,
    [EnquiryStatus.DROPPED]: XCircle,
  };

  const statusColor = statusColors[enquiry.status];
  const statusGradient = statusGradients[enquiry.status];
  const avatarGradient = avatarGradients[enquiry.status];
  const badgeStyle = badgeStyles[enquiry.status];
  const ambientGlowColor = ambientGlowColors[enquiry.status];
  const StatusIcon = statusIcons[enquiry.status];

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar
          className={cn(
            'ion-no-padding border-b relative overflow-hidden backdrop-blur-md',
            statusColor,
            statusGradient,
          )}
        >
          {/* Ambient Background Light Glow */}
          <div
            className={cn(
              'absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl opacity-60 pointer-events-none',
              ambientGlowColor,
            )}
          />

          <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pt-5 pb-4 sm:pt-5 sm:pb-6">
            {/* Breadcrumb — desktop */}
            <nav className="hidden xl:flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint opacity-70 mb-3">
              <button
                type="button"
                onClick={() => {
                  history.push('/enquiries');
                }}
                className="hover:text-slate transition-colors cursor-pointer"
              >
                Enquiries
              </button>
              <span>›</span>
              <span className="text-ink font-bold">{name}</span>
            </nav>

            {/* Mobile/Compact Top Action Bar */}
            <div className="flex xl:hidden items-center justify-between w-full mb-4">
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
                    history.push(`/enquiries/${id}/edit`, { from: location.pathname });
                  }}
                  aria-label="Edit enquiry"
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
                  aria-label="Delete enquiry"
                >
                  <Trash2 size={12} />
                  <span>Delete</span>
                </motion.button>
              </div>
            </div>

            {/* Main Header Layout */}
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
              <div className="flex items-start gap-3 sm:gap-4.5 min-w-0">
                {/* Desktop-only Back button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="!hidden xl:!flex items-center gap-1.5"
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
                      avatarGradient,
                    )}
                  >
                    {initials(name)}
                  </motion.div>

                  <div className="text-left min-w-0">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-ink leading-tight tracking-tight break-words">
                      {name}
                    </h2>

                    {/* Structured Info Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-sm shadow-sm',
                          badgeStyle,
                        )}
                      >
                        <StatusIcon size={12} className="shrink-0" />
                        {ENQUIRY_STATUS_LABELS[enquiry.status] ?? enquiry.status}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm">
                        {policyType}
                      </span>

                      {enquiry.remindOn && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm font-mono">
                          <Calendar size={12} className="shrink-0" />
                          Remind: {formatDateTime(enquiry.remindOn)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop-only Action buttons */}
              <div className="hidden xl:flex gap-2 shrink-0 justify-end">
                <motion.button
                  whileHover={{ scale: 1.02, translateY: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-line bg-surface text-ink hover:text-slate hover:border-slate/30 text-xs font-bold cursor-pointer shadow-sm hover:shadow transition-all"
                  onClick={() => {
                    history.push(`/enquiries/${id}/edit`, { from: location.pathname });
                  }}
                  aria-label="Edit enquiry"
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
                  aria-label="Delete enquiry"
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
                    <p className="text-[10px] text-ink-faint">Insurance enquiry record</p>
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-line animate-fade-in flex-1">
                  <DataRow label="Name" value={name} />
                  <DataRow label="Mobile" value={<span className="font-mono">{tel || '—'}</span>} />
                  <DataRow
                    label="Referred By"
                    value={
                      enquiry.referredBy ? (
                        <span className="rounded-lg bg-paper px-2 py-0.5 border border-line text-xs font-bold">
                          {enquiry.referredBy}
                        </span>
                      ) : (
                        <span className="text-ink-faint text-xs">—</span>
                      )
                    }
                  />
                  <DataRow label="Policy Type" value={policyType} />
                  {(enquiry.vehicleNumber || isMotorPolicy(policyType)) && (
                    <DataRow
                      label="Vehicle Number"
                      value={
                        enquiry.vehicleNumber ? (
                          <span className="font-mono uppercase text-xs bg-paper px-2.5 py-1 rounded-lg border border-line font-bold text-ink tracking-wider">
                            {enquiry.vehicleNumber}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/20 font-semibold">
                            <AlertCircle size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
                            Vehicle No : Pending (Not Added)
                          </span>
                        )
                      }
                    />
                  )}
                  <DataRow
                    label="Status"
                    value={ENQUIRY_STATUS_LABELS[enquiry.status] ?? enquiry.status}
                  />
                </div>

                {/* Contact Actions */}
                <div className="mt-4 pt-4 border-t border-line">
                  <h4 className="text-xs font-bold text-ink-faint uppercase tracking-wider mb-3">
                    Contact Actions
                  </h4>
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    <CommButton
                      icon={<Phone size={16} />}
                      label="Call"
                      disabled={!tel}
                      className="text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900/50"
                      onClick={() => {
                        window.open(`tel:${tel}`, '_self');
                      }}
                    />
                    <CommButton
                      icon={<MessageCircle size={16} />}
                      label="WhatsApp"
                      disabled={!tel}
                      className="text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/40 dark:border-green-900/50"
                      onClick={sendWhatsApp}
                    />
                    <CommButton
                      icon={<Send size={16} />}
                      label="SMS"
                      disabled={!tel}
                      className="text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900/50"
                      onClick={sendSMS}
                    />
                  </div>
                </div>
              </section>

              {/* ─── Col 2: Enquiry Details ─── */}
              <section className="flex flex-col bg-surface border border-line rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 lg:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate/10 dark:bg-slate/20 text-slate border border-slate/15 shrink-0">
                    <FileText size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink leading-tight">Enquiry Info</h3>
                    <p className="text-[10px] text-ink-faint">Prospect lead tracker registry</p>
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-line flex-1">
                  <DataRow
                    label="Enquiry ID"
                    value={
                      <span className="font-mono text-xs font-semibold uppercase">
                        {id.slice(0, 8)}
                      </span>
                    }
                  />
                  <DataRow
                    label="Lead Source"
                    value={enquiry.referredBy ? `Referral (${enquiry.referredBy})` : 'Direct Lead'}
                  />
                  <DataRow
                    label="Created Date"
                    value={<span className="font-semibold">{formatDate(enquiry.createdAt)}</span>}
                  />
                  <DataRow
                    label="Follow-up Date"
                    value={
                      enquiry.remindOn ? (
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {formatDateTime(enquiry.remindOn)}
                        </span>
                      ) : (
                        <span className="text-ink-faint text-xs">No reminder scheduled</span>
                      )
                    }
                  />
                  {enquiry.droppedAt && (
                    <DataRow
                      label="Dropped Date"
                      value={
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {formatDate(enquiry.droppedAt)}
                        </span>
                      }
                    />
                  )}
                </div>
              </section>

              {/* ─── Col 3: Action Transitions / Drop Details ─── */}
              <section className="flex flex-col bg-surface border border-line rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 lg:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left min-w-0 sm:col-span-2 xl:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-4 bg-slate rounded-full" />
                  <h3 className="text-sm font-bold text-ink">Manage Status</h3>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-4 py-2">
                  {enquiry.status === EnquiryStatus.OPEN && (
                    <div className="space-y-3.5 w-full">
                      <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.04] p-4 text-center">
                        <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300">
                          Enquiry is Active
                        </h4>
                        <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-1 leading-relaxed">
                          You can convert this lead to an active policy renewal or drop it if it did
                          not materialize.
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full flex items-center justify-center gap-2 font-bold shadow-sm"
                        onClick={() => {
                          history.push(`/policies/new?enquiryId=${enquiry.id}`);
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Convert to Policy</span>
                      </Button>

                      <Button
                        variant="destructive"
                        size="lg"
                        className="w-full flex items-center justify-center gap-2 font-bold shadow-sm"
                        onClick={() => {
                          setShowDropSheet(true);
                        }}
                      >
                        <XCircle size={16} />
                        <span>Drop Enquiry</span>
                      </Button>
                    </div>
                  )}

                  {enquiry.status === EnquiryStatus.DROPPED && (
                    <div className="space-y-4 w-full flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">
                            Drop Reason
                          </span>
                          <p className="text-sm font-bold text-ink">
                            {enquiry.dropReason ? DROP_REASON_LABELS[enquiry.dropReason] : '—'}
                          </p>
                        </div>

                        <div className="space-y-1 flex-1 min-h-[80px]">
                          <span className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">
                            Drop Notes
                          </span>
                          <p className="text-xs font-semibold text-ink-soft bg-paper rounded-xl p-3 border border-line mt-1 h-full min-h-[60px] overflow-y-auto whitespace-pre-wrap">
                            {enquiry.dropNote ?? 'No notes provided.'}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        className="w-full flex items-center justify-center gap-2 font-bold shadow-sm mt-2"
                        onClick={handleReopen}
                        loading={isUpdatingStatus}
                      >
                        <Clock size={16} />
                        <span>Reopen Enquiry</span>
                      </Button>
                    </div>
                  )}

                  {enquiry.status === EnquiryStatus.CONVERTED && (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-3 border border-emerald-500/20">
                        <CheckCircle2 size={28} />
                      </div>
                      <h4 className="text-sm font-bold text-ink">Converted to Policy</h4>
                      <p className="text-xs text-ink-faint mt-1 max-w-[200px] leading-relaxed">
                        This enquiry has been successfully registered as a policy renewal.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <StatusHistorySection history={historyData} />
          </div>
        </motion.div>
      </IonContent>

      <DropEnquirySheet
        open={showDropSheet}
        enquiryName={enquiry.name}
        isPending={isUpdatingStatus}
        onClose={() => {
          setShowDropSheet(false);
        }}
        onConfirm={handleDropConfirm}
      />

      <AlertDialog
        open={confirmDelete}
        onClose={() => {
          setConfirmDelete(false);
        }}
        onConfirm={handleDelete}
        title="Delete Enquiry?"
        description="This will permanently remove the client enquiry card and all records. This action cannot be undone."
        confirmLabel="Yes, Delete"
        cancelLabel="Keep Enquiry"
        variant="destructive"
        loading={isDeleting}
        icon={<Trash2 size={20} />}
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

/* ── Helpers ── */
function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 lg:py-3 text-xs lg:text-sm min-w-0 w-full gap-2 sm:gap-3">
      <span className="font-semibold text-ink-faint shrink-0 whitespace-nowrap">{label}</span>
      <div className="font-bold text-ink text-right min-w-0 flex-1 flex justify-end overflow-hidden">
        {value}
      </div>
    </div>
  );
}

function CommButton({
  icon,
  label,
  onClick,
  disabled,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-1 py-2 sm:py-2.5 lg:py-3 rounded-xl border font-sans text-[10px] sm:text-[11px] lg:text-xs font-bold shadow-sm transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
        className,
      )}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function StatusHistorySection({ history }: { history: EnquiryStatusHistory[] }) {
  if (history.length === 0) return null;

  return (
    <section className="mt-8 bg-surface border border-line rounded-[20px] sm:rounded-[24px] p-6 lg:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left">
      <div className="flex items-center gap-2.5 pb-4 border-b border-line mb-6">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate/10 dark:bg-slate/20 text-slate border border-slate/15 shrink-0">
          <Calendar size={13} />
        </div>
        <h3 className="text-sm font-bold text-ink leading-none">Status Transition History</h3>
      </div>

      <div className="relative border-l border-line ml-3 pl-6 space-y-6">
        {history.map((item) => (
          <div key={item.id} className="relative">
            <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-line bg-paper shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-slate" />
            </span>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
              <div>
                <div className="flex items-center flex-wrap gap-1.5 text-xs">
                  {item.previousStatus ? (
                    <>
                      <span className="font-bold text-ink-soft">{item.previousStatus}</span>
                      <span className="text-ink-faint">→</span>
                    </>
                  ) : (
                    <span className="text-ink-faint font-semibold mr-1">Created:</span>
                  )}
                  <span className="font-extrabold text-ink">{item.newStatus}</span>
                </div>
                {item.notes && (
                  <p className="mt-1 text-xs text-ink-soft italic font-medium">"{item.notes}"</p>
                )}
              </div>
              <div className="text-[10px] text-ink-faint font-semibold whitespace-nowrap">
                <span>{item.changedBy ? item.changedBy.name : 'System'}</span>
                <span className="mx-1.5">·</span>
                <span>{formatDate(item.changedAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
