import React from 'react';
import { useState, useEffect } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonFooter } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import BottomBar from '@components/BottomBar.js';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  User,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  Copy,
  Check,
  Calendar,
  Clock,
  FileText,
  Paperclip,
  X,
} from 'lucide-react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  usePolicyQuery,
  useUpdatePolicyStatusMutation,
  useDeletePolicyMutation,
  usePolicyStatusHistoryQuery,
  policyService,
  useUpdatePolicyMutation,
} from '@features/policies/index.js';
import { formatDate, daysToExpiry, urgencyBucket, daysLabel, initials } from '@repo/utils';
import {
  RENEWAL_STATUS_LABELS,
  URGENCY_LABELS,
  WHATSAPP_TEMPLATE,
  VALIDATION,
  VALIDATION_ERRORS,
} from '@repo/constants';
import { RenewalStatus } from '@repo/types';
import type { PolicyWithClient } from '@repo/types';
import PageLoader from '@components/ui/PageLoader.js';
import Dialog from '@components/ui/Dialog.js';
import AlertDialog from '@components/ui/AlertDialog.js';
import Button from '@components/ui/Button.js';
import Input from '@components/ui/Input.js';
import { cn } from '@utils/Cn.js';
import { appConfig } from '@config/index.js';

const ALL_STATUSES: RenewalStatus[] = [
  RenewalStatus.PENDING,
  RenewalStatus.REMINDED,
  RenewalStatus.RENEWED,
  RenewalStatus.NOT_RENEWED,
  RenewalStatus.LAPSED,
];

const statusMeta: Record<
  RenewalStatus,
  { dot: string; badge: 'pending' | 'reminded' | 'renewed' | 'notRenewed' | 'lapsed' }
> = {
  [RenewalStatus.PENDING]: { dot: 'bg-amber-edge', badge: 'pending' },
  [RenewalStatus.REMINDED]: { dot: 'bg-sky-400', badge: 'reminded' },
  [RenewalStatus.RENEWED]: { dot: 'bg-green-edge', badge: 'renewed' },
  [RenewalStatus.NOT_RENEWED]: { dot: 'bg-red-edge', badge: 'notRenewed' },
  [RenewalStatus.LAPSED]: { dot: 'bg-gray-edge', badge: 'lapsed' },
};

function resolveTemplate(
  template: string,
  vals: Record<string, string | number | boolean | null | undefined>,
): string {
  function s(v: string | number | boolean | null | undefined): string {
    if (v == null) return '';
    return String(v);
  }
  return template
    .replace(/\{\{insuredName\}\}/g, s(vals.insuredName))
    .replace(/\{\{endDate\}\}/g, s(vals.endDate))
    .replace(/\{\{policyType\}\}/g, s(vals.policyType))
    .replace(/\{\{vehicleNumber\}\}/g, s(vals.vehicleNumber))
    .replace(/\{\{policyNumber\}\}/g, s(vals.policyNumber))
    .replace(/\{\{premiumPrice\}\}/g, s(vals.premiumPrice))
    .replace(/\{\{previousClaim\}\}/g, s(vals.previousClaim))
    .replace(/\{\{paymentLink\}\}/g, s(vals.paymentLink))
    .replace(/\{\{additionalNotice\}\}/g, s(vals.additionalNotice))
    .replace(/\{\{baseUrl\}\}/g, s(vals.baseUrl))
    .replace(/\{\{policyId\}\}/g, s(vals.policyId))
    .replace(
      /\{\{#showVehicleNumber\}\}([\s\S]*?)\{\{\/showVehicleNumber\}\}/g,
      vals.showVehicleNumber ? '$1' : '',
    )
    .replace(/\{\{#paymentLink\}\}([\s\S]*?)\{\{\/paymentLink\}\}/g, vals.paymentLink ? '$1' : '')
    .replace(
      /\{\{#hasRenewalNoticePdf\}\}([\s\S]*?)\{\{\/hasRenewalNoticePdf\}\}/g,
      vals.hasRenewalNoticePdf ? '$1' : '',
    )
    .replace(
      /\{\{#additionalNotice\}\}([\s\S]*?)\{\{\/additionalNotice\}\}/g,
      vals.additionalNotice ? '$1' : '',
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { data, isLoading } = usePolicyQuery(id);
  const policy = data?.data;

  if (isLoading) return <PageLoader message="Loading policy detail cockpit" />;

  if (!policy) {
    return (
      <IonPage>
        <IonContent className="ion-padding-bottom">
          <div className="flex h-full flex-col items-center justify-center bg-body-bg px-4 text-center">
            <FileText size={48} className="text-ink-faint mb-4" />
            <h3 className="text-lg font-bold text-ink">Policy not found</h3>
            <p className="mt-1 text-sm text-ink-faint max-w-xs">
              This policy may have been deleted or the link is invalid.
            </p>
            <Button
              variant="outline"
              size="md"
              className="mt-6 flex items-center gap-2"
              onClick={() => {
                history.push('/policies');
              }}
            >
              <ArrowLeft size={15} />
              Back to policies
            </Button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return <PolicyDetailContent policy={policy} id={id} />;
}

function PolicyDetailContent({ policy, id }: { policy: PolicyWithClient; id: string }) {
  const history = useHistory();
  const location = useLocation();
  const updateStatus = useUpdatePolicyStatusMutation();
  const deletePolicy = useDeletePolicyMutation();
  const updatePolicy = useUpdatePolicyMutation();
  const pdfInputRef = React.useRef<HTMLInputElement>(null);

  const [showWAModal, setShowWAModal] = useState(false);
  const [premiumPrice, setPremiumPrice] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [additionalNotice, setAdditionalNotice] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waErrors, setWaErrors] = useState<{ premiumPrice?: string; paymentLink?: string }>({});

  const { data: historyRes } = usePolicyStatusHistoryQuery(id);
  const historyData = historyRes?.data ?? [];

  function handleCopyLink() {
    if (!policy.paymentLink) return;
    void navigator.clipboard.writeText(policy.paymentLink);
    setCopied(true);
    toast.success('Payment link copied to clipboard');
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  async function handleViewPdf() {
    try {
      const blob = await policyService.getRenewalNoticePdf(policy.id);
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Filesystem')) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const base64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => {
            if (typeof r.result === 'string') resolve(r.result.split(',')[1] ?? r.result);
            else reject(new Error('Failed to read blob'));
          };
          r.onerror = reject;
          r.readAsDataURL(blob);
        });
        const fileName = `renewal-notice-${policy.id}.pdf`;
        const saved = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });

        // Try to open using FileOpener first, fallback to Share if unavailable or fails
        if (Capacitor.isPluginAvailable('FileOpener')) {
          try {
            const { FileOpener } = await import('@capacitor-community/file-opener');
            await FileOpener.open({
              filePath: saved.uri,
              contentType: 'application/pdf',
              openWithDefault: true,
            });
            return;
          } catch (openErr) {
            console.warn('FileOpener failed, falling back to Share:', openErr);
          }
        }

        if (Capacitor.isPluginAvailable('Share')) {
          const { Share } = await import('@capacitor/share');
          await Share.share({ title: 'Renewal Notice', files: [saved.uri] });
        } else {
          toast.error('Opening or sharing PDF is not supported on this device');
        }
      } else {
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank');
        if (!w) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `renewal-notice-${policy.id}.pdf`;
          a.click();
        }
      }
    } catch (err) {
      console.error('handleViewPdf error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load PDF');
    }
  }

  function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updatePolicy.mutate(
        { id: policy.id, data: { renewalNotice: base64 } },
        {
          onSuccess: () => {
            toast.success('Renewal notice PDF uploaded successfully');
          },
          onError: (err) => {
            toast.error(err instanceof Error ? err.message : 'Failed to upload PDF');
          },
        },
      );
    };
    reader.readAsDataURL(file);
  }

  function handleRemovePdf() {
    updatePolicy.mutate(
      { id: policy.id, data: { renewalNotice: '' } },
      {
        onSuccess: () => {
          toast.success('Renewal notice PDF removed successfully');
          if (pdfInputRef.current) {
            pdfInputRef.current.value = '';
          }
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'Failed to remove PDF');
        },
      },
    );
  }

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('wa') === 'true') {
      setPremiumPrice(String(policy.premiumPrice ?? ''));
      setPaymentLink(policy.paymentLink ?? '');
      setAdditionalNotice(policy.additionalNotice ?? '');
      setWaErrors({});
      setShowWAModal(true);
      history.replace(`/policies/${id}`);
    }
  }, [location.search, policy, id, history]);

  const days = daysToExpiry(policy.endDate);
  const urgency = urgencyBucket(days);
  const tel = policy.client.mobileNumber;

  function callAgent() {
    if (!tel) {
      toast.error('No phone number on file');
      return;
    }
    window.open(`tel:${tel}`);
  }

  function smsAgent() {
    if (!tel) {
      toast.error('No phone number on file');
      return;
    }
    const body = buildMessage();
    window.open(`sms:${tel}?body=${encodeURIComponent(body)}`, '_blank');
  }

  function buildMessage() {
    const rawPremium = premiumPrice || policy.premiumPrice;
    const formattedPremium = rawPremium
      ? `₹${Number(rawPremium).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '';
    return resolveTemplate(WHATSAPP_TEMPLATE, {
      insuredName: policy.client.insuredName,
      policyType: policy.policyType.name,
      showVehicleNumber: policy.policyType.name.toLowerCase() === 'motor',
      vehicleNumber: policy.vehicleNumber,
      policyNumber: policy.policyNumber,
      endDate: formatDate(policy.endDate),
      premiumPrice: formattedPremium,
      previousClaim: policy.isClaimed ? 'Yes' : 'No',
      paymentLink: paymentLink || policy.paymentLink,
      additionalNotice: additionalNotice || policy.additionalNotice,
      hasRenewalNoticePdf: !!policy.renewalNoticeUrl,
      baseUrl: appConfig.apiBaseUrl.replace(/\/+$/, ''),
      policyId: policy.id,
    });
  }

  function sendWhatsApp() {
    if (!tel) {
      toast.error('No phone number on file');
      return;
    }

    const errors: { premiumPrice?: string; paymentLink?: string } = {};
    if (premiumPrice && !/^\d+(\.\d{1,2})?$/.test(premiumPrice)) {
      errors.premiumPrice = 'Enter a valid amount (e.g. 15000)';
    }
    if (paymentLink && !VALIDATION.URL.test(paymentLink)) {
      errors.paymentLink = VALIDATION_ERRORS.URL;
    }
    setWaErrors(errors);
    if (Object.keys(errors).length > 0) return;

    window.open(
      `https://wa.me/${tel.replace('+', '')}?text=${encodeURIComponent(buildMessage())}`,
      '_blank',
    );
    setShowWAModal(false);
  }

  function handleStatusChange(s: RenewalStatus) {
    updateStatus.mutate({ id, status: s });
  }

  function handleDelete() {
    deletePolicy.mutate(id, {
      onSuccess: () => {
        history.replace('/policies');
      },
    });
  }

  const isDeleting = deletePolicy.isPending;
  const messagePreview = buildMessage();

  const urgencyBannerClass = {
    overdue: 'border-rose-500/15 bg-rose-500/[0.04]',
    due7: 'border-amber-500/15 bg-amber-500/[0.04]',
    due30: 'border-emerald-500/15 bg-emerald-500/[0.04]',
    future: 'border-slate-500/15 bg-slate-500/[0.04]',
  }[urgency];

  const urgencyGradient = {
    overdue: 'from-rose-500/10 via-rose-500/[0.02] to-transparent',
    due7: 'from-amber-500/10 via-amber-500/[0.02] to-transparent',
    due30: 'from-emerald-500/10 via-emerald-500/[0.02] to-transparent',
    future: 'from-slate-500/10 via-slate-500/[0.02] to-transparent',
  }[urgency];

  const avatarGradient = {
    overdue: 'from-rose-500 to-red-600 text-white shadow-rose-500/20',
    due7: 'from-amber-500 to-yellow-600 text-white shadow-amber-500/20',
    due30: 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/20',
    future: 'from-slate-500 to-slate-600 text-white shadow-slate-500/20',
  }[urgency];

  const badgeStyle = {
    overdue:
      'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/50',
    due7: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900/50',
    due30:
      'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/50',
    future:
      'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300 dark:bg-slate-950/40 dark:border-slate-900/50',
  }[urgency];

  const ambientGlowColor = {
    overdue: 'bg-rose-500/10',
    due7: 'bg-amber-500/10',
    due30: 'bg-emerald-500/10',
    future: 'bg-slate-500/10',
  }[urgency];

  const StatusIcon = {
    overdue: AlertCircle,
    due7: Clock,
    due30: CheckCircle2,
    future: CheckCircle2,
  }[urgency];

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar
          className={cn(
            'ion-no-padding border-b relative overflow-hidden backdrop-blur-md',
            urgencyBannerClass,
            urgencyGradient,
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
            <nav className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint opacity-70 mb-3">
              <button
                type="button"
                onClick={() => {
                  history.push('/policies');
                }}
                className="hover:text-slate transition-colors cursor-pointer"
              >
                Renewals
              </button>
              <span>›</span>
              <span className="text-ink font-bold">{policy.client.insuredName}</span>
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
                    history.push(`/policies/${id}/edit`, { from: location.pathname });
                  }}
                  aria-label="Edit policy"
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
                  aria-label="Delete policy"
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
                      avatarGradient,
                    )}
                  >
                    {initials(policy.client.insuredName)}
                  </motion.div>

                  <div className="text-left min-w-0">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-ink leading-tight tracking-tight break-words">
                      {policy.client.insuredName}
                    </h2>

                    {/* Structured Info Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      {/* Urgency Status Badge */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-sm shadow-sm',
                          badgeStyle,
                        )}
                      >
                        <StatusIcon size={12} className="shrink-0" />
                        {URGENCY_LABELS[urgency]}
                      </span>

                      {/* Time Left Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm">
                        <Clock size={12} className="shrink-0" />
                        {daysLabel(days)}
                      </span>

                      {/* Expiry Date Badge */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm">
                        <Calendar size={12} className="shrink-0" />
                        Expires {formatDate(policy.endDate)}
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
                    history.push(`/policies/${id}/edit`, { from: location.pathname });
                  }}
                  aria-label="Edit policy"
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
                  aria-label="Delete policy"
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
            {/* ── Three-column on xl, two on sm, one on mobile ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 items-start">
              {/* ─── Col 1: Client card ─── */}
              <section className="flex flex-col bg-surface border border-line rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 lg:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40 shrink-0">
                    <User size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink leading-tight">Client Details</h3>
                    <p className="text-[10px] text-ink-faint">Insurance policy client registry</p>
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-line">
                  <DataRow label="Insured Name" value={policy.client.insuredName} />
                  {policy.referenceNote && (
                    <DataRow
                      label="Reference Label"
                      value={
                        <span className="rounded-lg bg-paper px-2 py-0.5 border border-line text-xs font-bold">
                          {policy.referenceNote}
                        </span>
                      }
                    />
                  )}
                  <DataRow
                    label="Mobile"
                    value={
                      <span className="font-mono">{policy.client.mobileNumber ?? 'None'}</span>
                    }
                  />
                </div>

                {/* Communication hub — lives at bottom of col 1 on desktop */}
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
                      onClick={callAgent}
                    />
                    <CommButton
                      icon={<MessageCircle size={16} />}
                      label="WhatsApp"
                      disabled={!tel}
                      className="text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/40 dark:border-green-900/50"
                      onClick={() => {
                        setPremiumPrice(String(policy.premiumPrice ?? ''));
                        setPaymentLink(policy.paymentLink ?? '');
                        setAdditionalNotice(policy.additionalNotice ?? '');
                        setWaErrors({});
                        setShowWAModal(true);
                      }}
                    />
                    <CommButton
                      icon={<Send size={16} />}
                      label="SMS"
                      disabled={!tel}
                      className="text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900/50"
                      onClick={smsAgent}
                    />
                  </div>
                </div>
              </section>

              {/* ─── Col 2: Policy Info ─── */}
              <section className="flex flex-col bg-surface border border-line rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 lg:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate/10 dark:bg-slate/20 text-slate border border-slate/15 shrink-0">
                    <CreditCard size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink leading-tight">Policy Information</h3>
                    <p className="text-[10px] text-ink-faint">Renewal registry data</p>
                  </div>
                </div>

                <div className="space-y-0 divide-y divide-line">
                  <DataRow
                    label="Insurance Type"
                    value={
                      <span className="rounded-lg bg-paper px-2 py-0.5 border border-line text-xs font-bold">
                        {policy.policyType.name}
                      </span>
                    }
                  />
                  {policy.vehicleNumber && (
                    <DataRow
                      label="Vehicle No."
                      value={
                        <span className="font-mono uppercase text-xs bg-paper px-2 py-0.5 rounded-lg border border-line font-bold">
                          {policy.vehicleNumber}
                        </span>
                      }
                    />
                  )}
                  <DataRow
                    label="Policy No."
                    value={
                      <span className="font-mono text-xs">{policy.policyNumber ?? 'None'}</span>
                    }
                  />
                  <DataRow
                    label="Renewal Expiry"
                    value={<span className="font-semibold">{formatDate(policy.endDate)}</span>}
                  />
                  {policy.premiumPrice != null && (
                    <DataRow
                      label="Premium"
                      value={
                        <span className="text-sm font-black text-ink">
                          ₹{policy.premiumPrice.toLocaleString('en-IN')}
                        </span>
                      }
                    />
                  )}
                  {policy.paymentLink && (
                    <DataRow
                      label="Payment Link"
                      value={
                        <div className="flex items-center gap-1.5 justify-end min-w-0 max-w-full">
                          <a
                            href={policy.paymentLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-slate hover:underline font-mono text-[11px] min-w-0"
                            title={policy.paymentLink}
                          >
                            <ExternalLink size={11} className="shrink-0" />
                            <span className="truncate block max-w-[120px] sm:max-w-[180px] lg:max-w-[240px]">
                              {policy.paymentLink}
                            </span>
                          </a>
                          <button
                            onClick={handleCopyLink}
                            className="p-1 rounded bg-paper border border-line text-ink-soft hover:text-ink hover:bg-line-strong/30 active:scale-90 transition-all cursor-pointer shrink-0"
                            title="Copy link"
                          >
                            {copied ? (
                              <Check size={11} className="text-green-fg" />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        </div>
                      }
                    />
                  )}
                  {policy.renewalNoticeUrl && (
                    <DataRow
                      label="Renewal Notice"
                      value={
                        <button
                          onClick={handleViewPdf}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate hover:underline cursor-pointer"
                        >
                          <FileText size={12} />
                          View PDF
                        </button>
                      }
                    />
                  )}

                  {/* Claim Settlement */}
                  <DataRow
                    label="Claim Status"
                    value={
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] border',
                          policy.isClaimed
                            ? 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/50'
                            : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/50',
                        )}
                      >
                        {policy.isClaimed ? 'Claimed' : 'No Claim'}
                      </span>
                    }
                  />
                  {policy.isClaimed && policy.claimDate && (
                    <DataRow
                      label="Claim Date"
                      value={<span className="font-semibold">{formatDate(policy.claimDate)}</span>}
                    />
                  )}
                  {policy.isClaimed && policy.claimAmount != null && (
                    <DataRow
                      label="Claim Amount"
                      value={
                        <span className="text-sm font-black text-ink">
                          ₹{policy.claimAmount.toLocaleString('en-IN')}
                        </span>
                      }
                    />
                  )}
                </div>
              </section>

              {/* ─── Col 3: Status Switcher ─── */}
              {/* On tablet: spans 2 cols. On xl: dedicated 3rd col */}
              <section className="flex flex-col bg-surface border border-line rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 lg:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left min-w-0 sm:col-span-2 xl:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-4 bg-slate rounded-full" />
                  <h3 className="text-sm font-bold text-ink">Manage Renewal Status</h3>
                </div>

                {/* 2-column grid on tablet (col-span-2), single column on xl */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2 auto-rows-fr">
                  {ALL_STATUSES.map((s) => {
                    const active = policy.renewalStatus === s;
                    const meta = statusMeta[s];
                    return (
                      <motion.button
                        key={s}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          handleStatusChange(s);
                        }}
                        className={cn(
                          'relative flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all cursor-pointer text-left',
                          active
                            ? 'border-slate bg-slate/8 dark:bg-slate/12 text-ink shadow-sm'
                            : 'border-line bg-paper/60 text-ink-soft hover:bg-paper hover:border-line-strong hover:text-ink',
                        )}
                      >
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0 transition-all',
                            active ? meta.dot : 'bg-line-strong',
                          )}
                        />
                        <span className="flex-1">{RENEWAL_STATUS_LABELS[s] ?? s}</span>
                        {active && (
                          <motion.span
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="shrink-0"
                          >
                            <CheckCircle2 size={15} className="text-slate" />
                          </motion.span>
                        )}
                        {active && (
                          <motion.span
                            layoutId="status-active-bar"
                            className="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full bg-slate"
                            initial={{ opacity: 0, scaleY: 0.5 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            exit={{ opacity: 0, scaleY: 0.5 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Status Transition History Timeline */}
            <StatusHistorySection history={historyData} />
          </div>
        </motion.div>
      </IonContent>

      {/* ── WhatsApp Composer Dialog ── */}
      <Dialog
        open={showWAModal}
        onClose={() => {
          setShowWAModal(false);
          setWaErrors({});
        }}
        title="WhatsApp Composer"
        description="Customize the message before sending."
        sheet
      >
        <div className="space-y-4">
          <Input
            label="Premium Price (Rs.)"
            placeholder="e.g. 12500"
            type="number"
            value={premiumPrice}
            onChange={(e) => {
              setPremiumPrice(e.target.value);
              if (waErrors.premiumPrice)
                setWaErrors((p) => {
                  const n = { ...p };
                  delete n.premiumPrice;
                  return n;
                });
            }}
            error={waErrors.premiumPrice}
          />
          <Input
            label="Payment Link"
            placeholder="https://pay.insurer.com/..."
            value={paymentLink}
            onChange={(e) => {
              setPaymentLink(e.target.value);
              if (waErrors.paymentLink)
                setWaErrors((p) => {
                  const n = { ...p };
                  delete n.paymentLink;
                  return n;
                });
            }}
            error={waErrors.paymentLink}
          />
          {/* Renewal Notice PDF Indicator / Upload Field */}
          <div className="flex flex-col gap-2 text-left">
            <label className="text-xs font-bold text-ink-soft">Renewal Notice PDF</label>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
              disabled={updatePolicy.isPending}
            />
            {policy.renewalNoticeUrl ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-paper/60 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText size={15} className="shrink-0 text-rose-500" />
                  <span className="text-xs font-semibold text-ink truncate flex-1">
                    Renewal notice PDF attached
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleViewPdf}
                    className="text-xs font-bold text-slate hover:underline px-1.5 py-1 cursor-pointer"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    disabled={updatePolicy.isPending}
                    onClick={handleRemovePdf}
                    className="p-1 rounded-lg hover:bg-line-strong/30 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    title="Remove PDF"
                  >
                    <X size={14} className="text-ink-faint" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={updatePolicy.isPending}
                onClick={() => pdfInputRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-paper/40 px-4 py-3 text-xs font-semibold text-ink-soft hover:border-slate hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
              >
                {updatePolicy.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-ink-soft animate-infinite"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Uploading PDF...
                  </span>
                ) : (
                  <>
                    <Paperclip size={14} />
                    Upload PDF
                  </>
                )}
              </button>
            )}
          </div>

          <div>
            <Input
              label="Additional Notice Lines"
              placeholder="e.g. Please carry original RC book"
              value={additionalNotice}
              onChange={(e) => {
                if (e.target.value.length <= 1000) setAdditionalNotice(e.target.value);
              }}
            />
            <div className="flex justify-end mt-1">
              <span className="text-[10px] text-ink-faint">{additionalNotice.length}/1000</span>
            </div>
          </div>

          {/* ── Realistic WhatsApp Chat Preview ── */}
          <div className="rounded-xl border border-line bg-paper shadow-sm overflow-hidden">
            {/* Chat header bar */}
            <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2">
              <div className="size-6 rounded-full bg-[#25D366] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="size-3.5 text-white fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white leading-tight truncate">
                  Renewal Reminder
                </p>
                <p className="text-[9px] text-white/70">
                  Agent •{' '}
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <svg viewBox="0 0 24 24" className="size-4 text-white/60 fill-current">
                <path d="M12 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </div>
            {/* Message bubble */}
            <div className="px-3 py-3">
              <div className="relative max-w-[88%] bg-[#dcf8c6] rounded-lg rounded-bl-none px-3 py-2.5 shadow-sm">
                {/* Tail */}
                <div className="absolute -left-[5px] bottom-0 w-0 h-0 border-l-[6px] border-l-transparent border-b-[10px] border-b-[#dcf8c6] border-r-[6px] border-r-transparent" />
                <p className="text-xs leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {messagePreview.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                    /^https?:\/\//.test(part) ? (
                      <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#039be5] underline font-medium break-all"
                      >
                        {part}
                      </a>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
                </p>
                {/* Timestamp */}
                <p className="text-[9px] text-gray-500 text-right mt-1 select-none">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                  <span className="inline-block align-middle">
                    <svg viewBox="0 0 16 11" className="size-3 fill-current text-gray-500">
                      <path d="M11.071.653a.457.457 0 00-.304-.102.493.493 0 00-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 00-.304-.153.464.464 0 00-.33.102.495.495 0 00-.178.38.5.5 0 00.153.331L4.234 9.65c.102.102.228.153.33.153a.48.48 0 0 0 .33-.153l6.43-7.92a.45.45 0 0 0 .102-.33.48.48 0 0 0-.355-.746Z" />
                    </svg>
                  </span>
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full bg-[#25D366] hover:bg-[#1ea855] shadow-[0_4px_16px_rgba(37,211,102,0.30)] border-transparent"
            leftIcon={<MessageCircle size={16} />}
            onClick={sendWhatsApp}
          >
            Send via WhatsApp
          </Button>
        </div>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={confirmDelete}
        onClose={() => {
          setConfirmDelete(false);
        }}
        onConfirm={handleDelete}
        title="Delete Policy?"
        description="This will permanently remove the renewal registry card and all records. This action cannot be undone."
        confirmLabel="Yes, Delete"
        cancelLabel="Keep Policy"
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

function StatusHistorySection({ history }: { history: any[] }) {
  if (!history || history.length === 0) return null;

  return (
    <section className="mt-8 bg-surface border border-line rounded-[20px] sm:rounded-[24px] p-6 lg:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] text-left">
      <div className="flex items-center gap-2.5 pb-4 border-b border-line mb-6">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate/10 dark:bg-slate/20 text-slate border border-slate/15 shrink-0">
          <Calendar size={13} />
        </div>
        <h3 className="text-sm font-bold text-ink leading-none">Status Transition History</h3>
      </div>

      <div className="relative border-l border-line ml-3 pl-6 space-y-6">
        {history.map((item) => {
          return (
            <div key={item.id} className="relative">
              {/* Circle dot marker */}
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
          );
        })}
      </div>
    </section>
  );
}
