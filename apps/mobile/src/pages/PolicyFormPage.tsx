import { useEffect, useState, useMemo, useRef } from 'react';
import { IonPage, IonContent, IonHeader, IonToolbar, IonFooter } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import {
  ArrowLeft,
  User,
  FileText,
  CreditCard,
  Save,
  Calendar,
  Phone,
  MessageCircle,
  Pencil,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Paperclip,
  X,
} from 'lucide-react';
import { useHistory, useParams, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  usePolicyQuery,
  useCreatePolicyMutation,
  useUpdatePolicyMutation,
} from '@features/policies/hooks/usePoliciesQuery.js';
import { useEnquiryQuery } from '@features/enquiries/hooks/useEnquiriesQuery.js';
import { useFindClientQuery } from '@features/policies/hooks/useClientsSearchQuery.js';
import { RENEWAL_STATUS_LABELS, VALIDATION, VALIDATION_ERRORS, isAuthenticPolicyNumber } from '@repo/constants';
import { usePolicyTypesQuery } from '@features/policyTypes/index.js';
import { daysToExpiry, formatDate, initials, urgencyBucket, daysLabel } from '@repo/utils';
import type { PolicyFormData } from '@features/policies/types/index.js';
import PageLoader from '@components/ui/PageLoader.js';
import Badge from '@components/ui/Badge.js';
import ClientSearch from '@components/ui/ClientSearch.js';
import Button from '@components/ui/Button.js';
import Input from '@components/ui/Input.js';
import Select from '@components/ui/Select.js';
import { cn } from '@utils/Cn.js';

const getPolicySchema = (policyTypes: { id: string; name: string }[], isAssociate: boolean) => {
  const motorPolicyType = policyTypes.find((t) => t.name.toUpperCase() === 'MOTOR');
  const motorId = motorPolicyType?.id || 'MOTOR';
  const mobileValidation = z
      .string()
      .min(1, 'Mobile number is required')
      .regex(/^(?:\+91|91|0)?[-\s]?[6-9](?:[-\s]?\d){9}$/, VALIDATION_ERRORS.INDIA_MOBILE);
  return z
    .object({
      insuredName: z
        .string()
        .min(1, 'Insured name is required')
        .regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME),
      insuredPersonName: isAssociate
        ? z
            .string()
            .min(1, 'Insured person name is required')
            .regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME)
        : z.string().optional(),
      mobileNumber: mobileValidation,
      referenceNote: z.string(),
      policyType: z.string().min(1, 'Policy type is required'),
      vehicleNumber: z.string(),
      policyNumber: z
        .string()
        .min(1, 'Policy number is required')
        .refine((val) => isAuthenticPolicyNumber(val), {
          message: VALIDATION_ERRORS.POLICY_NUMBER,
        }),
      endDate: z
        .string()
        .min(1, 'Renewal end date is required')
        .refine(
          (val) => {
            if (!val) return true;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dateVal = new Date(val);
            dateVal.setHours(0, 0, 0, 0);
            return dateVal >= today;
          },
          { message: 'Renewal end date cannot be in the past' },
        ),
      premiumPrice: z.string(),
      paymentLink: z.string().regex(VALIDATION.URL, VALIDATION_ERRORS.URL).or(z.literal('')),
      renewalNotice: z.string(),
      additionalNotice: z.string(),
      isClaimed: z.boolean(),
      claimDate: z.string(),
      claimAmount: z.string(),
    })
    .refine(
      (data) =>
        !(
          data.policyType === motorId &&
          data.vehicleNumber.trim() &&
          !VALIDATION.VEHICLE_NUMBER.test(data.vehicleNumber.trim().toUpperCase())
        ),
      { message: VALIDATION_ERRORS.VEHICLE_NUMBER, path: ['vehicleNumber'] },
    );
};

type FormValues = z.infer<ReturnType<typeof getPolicySchema>>;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
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

function statusTone(status: string): 'pending' | 'reminded' | 'renewed' | 'notRenewed' | 'lapsed' {
  if (status === 'PENDING') return 'pending';
  if (status === 'REMINDED') return 'reminded';
  if (status === 'RENEWED') return 'renewed';
  if (status === 'NOT_RENEWED') return 'notRenewed';
  return 'lapsed';
}

export default function PolicyFormPage() {
  const { id } = useParams<{ id?: string }>();
  const history = useHistory();
  const location = useLocation<{ from?: string } | null>();
  const isEdit = !!id;

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientObj, setSelectedClientObj] = useState<{
    id: string;
    insuredName: string;
    mobileNumber: string | null;
  } | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const { data, isLoading } = usePolicyQuery(id ?? '');
  const createMutation = useCreatePolicyMutation();
  const updateMutation = useUpdatePolicyMutation();

  const queryParams = new URLSearchParams(location.search);
  const enquiryId = queryParams.get('enquiryId');
  const isConvertMode = !isEdit && !!enquiryId;
  const { data: enquiryData, isLoading: isEnquiryLoading } = useEnquiryQuery(enquiryId ?? '');
  const enquiry = enquiryData?.data;

  // Reset all client-link state when converting a different enquiry.
  // Ionic's page stack keeps the component alive, so stale state from a
  // previous conversion would otherwise bleed through until the new lookup
  // resolves.
  useEffect(() => {
    if (enquiryId) {
      setSelectedClientId(null);
      setSelectedClientObj(null);
    }
  }, [enquiryId]);

  // Derive lookup params — mobile stored without +91 prefix in enquiry
  const enquiryMobile = enquiry?.mobileNumber ?? '';
  const enquiryName = enquiry?.name ?? '';

  // Exact-match lookup: enabled once enquiry data is loaded in convert mode
  // Strip only the leading "+" if present.  Do NOT strip digits — the backend
  // normalises by extracting the last 10 digits for a safe endsWith match.
  const normalizedMobile = enquiryMobile.replace(/^\+/, '');
  const { data: foundClient, isLoading: isClientLookupLoading } = useFindClientQuery(
    normalizedMobile,
    enquiryName,
    isConvertMode && !isEnquiryLoading && (normalizedMobile.length > 0 || enquiryName.length > 0),
  );

  const existing = data?.data;

  const { data: policyTypesRes } = usePolicyTypesQuery();
  const policyTypes = policyTypesRes?.data ?? [];
  const typeOptions = policyTypes.map((t) => ({ value: t.id, label: t.name }));

  const [isAssociate, setIsAssociate] = useState(false);

  const schema = useMemo(
    () => getPolicySchema(policyTypes, isAssociate),
    [policyTypes, isAssociate],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      insuredName: '',
      mobileNumber: '',
      insuredPersonName: '',
      referenceNote: '',
      policyType: '',
      vehicleNumber: '',
      policyNumber: '',
      endDate: '',
      premiumPrice: '',
      paymentLink: '',
      renewalNotice: '',
      additionalNotice: '',
      isClaimed: false,
      claimDate: '',
      claimAmount: '',
    },
  });

  // Live watch values for card preview
  const watchInsuredName = watch('insuredName') || '';
  const watchPolicyType = watch('policyType') || '';
  const selectedPolicyTypeObj = policyTypes.find((t) => t.id === watchPolicyType);
  const previewPolicyTypeName = selectedPolicyTypeObj?.name ?? '';
  const isMotor = selectedPolicyTypeObj?.name.toUpperCase() === 'MOTOR';
  const watchVehicleNumber = watch('vehicleNumber') || '';
  const watchEndDate = watch('endDate') || '';
  const watchReferenceNote = watch('referenceNote') || '';
  const watchMobileNumber = watch('mobileNumber') || '';
  const watchIsClaimed = watch('isClaimed');

  const previewInitials = watchInsuredName ? initials(watchInsuredName) : '??';
  const previewDays = watchEndDate ? daysToExpiry(watchEndDate) : null;
  const previewUrgency = previewDays !== null ? urgencyBucket(previewDays) : 'future';
  const previewDaysLabel = previewDays !== null ? daysLabel(previewDays) : 'Select end date';
  const previewStatus = existing?.renewalStatus ?? 'PENDING';

  // Weighted progress calculation for Add Mode
  const requiredFields = ['insuredName', 'mobileNumber', 'policyType', 'endDate', 'policyNumber'];

  const optionalFields = [
    'referenceNote',
    'vehicleNumber',
    'premiumPrice',
    'paymentLink',
    'renewalNotice',
    'isClaimed',
    'claimDate',
    'claimAmount',
  ];

  const filledRequired = requiredFields.filter((f) => !!watch(f as keyof FormValues)).length;
  const filledOptional = optionalFields.filter((f) => !!watch(f as keyof FormValues)).length;

  const progressPercentage = Math.round(
    (requiredFields.length > 0 ? (filledRequired / requiredFields.length) * 70 : 70) +
      (optionalFields.length > 0 ? (filledOptional / optionalFields.length) * 30 : 30),
  );

  // Urgency logic for Edit Mode (based on existing policy status)
  const days = existing ? daysToExpiry(existing.endDate) : 0;
  const urgency = existing ? urgencyBucket(days) : 'future';

  const urgencyBannerClass = existing
    ? {
        overdue: 'border-rose-500/15 bg-rose-500/[0.04]',
        due7: 'border-amber-500/15 bg-amber-500/[0.04]',
        due30: 'border-emerald-500/15 bg-emerald-500/[0.04]',
        future: 'border-slate-500/15 bg-slate-500/[0.04]',
      }[urgency]
    : '';

  const urgencyGradient = existing
    ? {
        overdue: 'from-rose-500/10 via-rose-500/[0.02] to-transparent',
        due7: 'from-amber-500/10 via-amber-500/[0.02] to-transparent',
        due30: 'from-emerald-500/10 via-emerald-500/[0.02] to-transparent',
        future: 'from-slate-500/10 via-slate-500/[0.02] to-transparent',
      }[urgency]
    : '';

  const avatarGradient = existing
    ? {
        overdue: 'from-rose-500 to-red-600 text-white shadow-rose-500/20',
        due7: 'from-amber-500 to-yellow-600 text-white shadow-amber-500/20',
        due30: 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/20',
        future: 'from-slate-500 to-slate-600 text-white shadow-slate-500/20',
      }[urgency]
    : '';

  const badgeStyle = existing
    ? {
        overdue:
          'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/50',
        due7: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900/50',
        due30:
          'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900/50',
        future:
          'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300 dark:bg-slate-950/40 dark:border-slate-900/50',
      }[urgency]
    : '';

  const ambientGlowColor = existing
    ? {
        overdue: 'bg-rose-500/10',
        due7: 'bg-amber-500/10',
        due30: 'bg-emerald-500/10',
        future: 'bg-slate-500/10',
      }[urgency]
    : 'bg-indigo-500/10';

  // Auto-link found client when converting an enquiry.
  // IMPORTANT: always update (or clear) the selection once the lookup resolves so that
  // stale state from a previous conversion doesn't bleed through when Ionic keeps the
  // page instance alive in the DOM.
  useEffect(() => {
    if (!isConvertMode || isClientLookupLoading) return;
    if (foundClient) {
      setSelectedClientId(foundClient.id);
      setSelectedClientObj({
        id: foundClient.id,
        insuredName: foundClient.insuredName,
        mobileNumber: foundClient.mobileNumber,
      });
    } else {
      // No existing client found for this enquiry — clear any stale selection
      setSelectedClientId(null);
      setSelectedClientObj(null);
    }
  }, [foundClient, isConvertMode, isClientLookupLoading]);

  useEffect(() => {
    if (existing) {
      if (existing.renewalNotice) setPdfFileName('Renewal notice PDF uploaded');
      setIsAssociate(!!existing.insuredPersonName);
      reset({
        insuredName: existing.client.insuredName,
        mobileNumber: existing.client.mobileNumber
          ? existing.client.mobileNumber.replace('+91', '')
          : '',
        insuredPersonName: existing.insuredPersonName ?? '',
        referenceNote: existing.referenceNote ?? '',
        policyType: existing.policyType.id,
        vehicleNumber: existing.vehicleNumber ?? '',
        policyNumber: existing.policyNumber ?? '',
        endDate: existing.endDate ? existing.endDate.slice(0, 10) : '',
        premiumPrice: existing.premiumPrice != null ? String(existing.premiumPrice) : '',
        paymentLink: existing.paymentLink ?? '',
        renewalNotice: existing.renewalNotice ?? '',
        additionalNotice: existing.additionalNotice ?? '',
        isClaimed: existing.isClaimed ?? false,
        claimDate: existing.claimDate ? existing.claimDate.slice(0, 10) : '',
        claimAmount: existing.claimAmount != null ? String(existing.claimAmount) : '',
      });
    } else if (enquiry && !isEdit && !isClientLookupLoading) {
      // Populate name/mobile from found client if available, otherwise from enquiry
      const clientName = foundClient?.insuredName ?? enquiry.name;
      const clientMobile = foundClient?.mobileNumber ?? enquiry.mobileNumber;
      setIsAssociate(false);
      reset({
        insuredName: clientName,
        mobileNumber: clientMobile.replace('+91', ''),
        insuredPersonName: '',
        referenceNote: enquiry.referredBy ? `Referred by: ${enquiry.referredBy}` : '',
        policyType: enquiry.policyTypeId,
        vehicleNumber: enquiry.vehicleNumber ?? '',
        policyNumber: '',
        endDate: '',
        premiumPrice: '',
        paymentLink: '',
        renewalNotice: '',
        additionalNotice: '',
        isClaimed: false,
        claimDate: '',
        claimAmount: '',
      });
    } else if (!isEdit && !enquiry) {
      setIsAssociate(false);
      reset({
        insuredName: '',
        mobileNumber: '',
        insuredPersonName: '',
        referenceNote: '',
        policyType: '',
        vehicleNumber: '',
        policyNumber: '',
        endDate: '',
        premiumPrice: '',
        paymentLink: '',
        renewalNotice: '',
        additionalNotice: '',
        isClaimed: false,
        claimDate: '',
        claimAmount: '',
      });
      setPdfFileName(null);
    }
  }, [existing, enquiry, isEdit, reset, foundClient, isClientLookupLoading]);

  useEffect(() => {
    if (!isEdit && !enquiry && policyTypes.length > 0) {
      const motorType = policyTypes.find((t) => t.name.toUpperCase() === 'MOTOR');
      if (motorType) {
        setValue('policyType', motorType.id);
      }
    }
  }, [isEdit, enquiry, policyTypes, setValue]);

  useEffect(() => {
    if (existing?.client) {
      setSelectedClientId(existing.client.id);
      setSelectedClientObj(existing.client);
    } else if (!isEdit && !isConvertMode) {
      setSelectedClientId(null);
      setSelectedClientObj(null);
    }
  }, [existing, isEdit, isConvertMode]);

  // Show loader while editing (missing policy data) or while looking up a client on convert
  if (isEdit && (isLoading || !existing)) {
    return <PageLoader message="Loading renewal editor" />;
  }

  if (isConvertMode && (isEnquiryLoading || isClientLookupLoading)) {
    return <PageLoader message="Checking client records..." />;
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('PDF must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setValue('renewalNotice', base64);
      setPdfFileName(file.name);
    };
    reader.readAsDataURL(file);
  }

  function handleRemovePdf() {
    setValue('renewalNotice', '');
    setPdfFileName(null);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  }

  async function handleViewPdf() {
    const base64 = getValues('renewalNotice');
    if (!base64) {
      toast.error('No PDF to view');
      return;
    }
    try {
      if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Filesystem')) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const raw = base64.split(',')[1] ?? base64;
        const fileName = `renewal-notice-${existing?.id ?? 'policy'}.pdf`;
        const saved = await Filesystem.writeFile({
          path: fileName,
          data: raw,
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
        const w = window.open(base64, '_blank');
        if (!w) {
          const a = document.createElement('a');
          a.href = base64;
          a.download = `renewal-notice-${existing?.id ?? 'policy'}.pdf`;
          a.click();
        }
      }
    } catch {
      toast.error('Failed to load PDF');
    }
  }

  function onSubmit(form: FormValues) {
    const mn = form.mobileNumber.trim();
    const payload: Record<string, unknown> = {
      insuredName: form.insuredName.trim(),
      policyType: form.policyType,
      endDate: form.endDate,
    };
    if (selectedClientId) payload.clientId = selectedClientId;
    if (mn) payload.mobileNumber = `+91${mn.replace(/\D/g, '').slice(-10)}`;
    if (isAssociate && form.insuredPersonName?.trim()) {
      payload.insuredPersonName = form.insuredPersonName.trim();
    } else {
      payload.insuredPersonName = null;
    }
    if (form.referenceNote.trim()) payload.referenceNote = form.referenceNote.trim();
    if (isMotor) payload.vehicleNumber = form.vehicleNumber.trim().toUpperCase();
    if (form.policyNumber.trim()) payload.policyNumber = form.policyNumber.trim();
    if (form.premiumPrice) payload.premiumPrice = Number(form.premiumPrice);
    if (form.paymentLink.trim()) payload.paymentLink = form.paymentLink.trim();
    if (form.renewalNotice) payload.renewalNotice = form.renewalNotice;
    if (form.additionalNotice.trim()) payload.additionalNotice = form.additionalNotice.trim();
    payload.isClaimed = form.isClaimed;
    if (form.isClaimed && form.claimDate) payload.claimDate = form.claimDate;
    if (form.isClaimed && form.claimAmount) payload.claimAmount = Number(form.claimAmount);
    if (enquiryId) payload.enquiryId = enquiryId;

    if (isEdit) {
      updateMutation.mutate(
        { id: id, data: payload },
        {
          onSuccess: () => {
            if (location.state?.from) {
              history.goBack();
            } else {
              history.replace(`/policies/${id}`);
            }
          },
        },
      );
    } else {
      createMutation.mutate(payload as unknown as PolicyFormData, {
        onSuccess: (res) => {
          history.replace(`/policies/${(res as unknown as { data: { id: string } }).data.id}`);
        },
      });
    }
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        {isEdit ? (
          /* ── Rich Edit Form Header ── */
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

            <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pt-2 pb-2.5 sm:pt-4 sm:pb-5">
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
                <button
                  type="button"
                  onClick={() => {
                    history.push(`/policies/${id}`);
                  }}
                  className="hover:text-slate transition-colors cursor-pointer"
                >
                  {existing?.client.insuredName}
                </button>
                <span>›</span>
                <span className="text-ink font-bold">Edit Details</span>
              </nav>

              {/* Action / Title layout */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 font-sans">
                  {/* Avatar + Title Container */}
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr font-black text-sm sm:text-base shadow-md select-none border border-white/20 transition-all',
                        avatarGradient,
                      )}
                    >
                      {previewInitials}
                    </motion.div>

                    <div className="text-left min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-black text-ink leading-tight tracking-tight truncate">
                        Edit: {watchInsuredName || existing?.client.insuredName}
                      </h2>

                      {/* Info tags inside header */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate/30 bg-slate/10 text-slate dark:bg-slate/20 backdrop-blur-sm shadow-sm">
                          <Pencil size={11} className="animate-pulse shrink-0" />
                          Editing Registry
                        </span>

                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm shadow-sm',
                            badgeStyle,
                          )}
                        >
                          {RENEWAL_STATUS_LABELS[previewStatus] ?? previewStatus}
                        </span>

                        {previewPolicyTypeName && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm">
                            {previewPolicyTypeName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back button — right-aligned, matches enquiry form actions slot */}
                <div className="flex items-center gap-2 shrink-0">
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
                </div>
              </div>
            </div>
          </IonToolbar>
        ) : (
          /* ── Rich Add Form Header ── */
          <IonToolbar className="ion-no-padding border-b relative overflow-hidden backdrop-blur-md border-indigo-500/15 bg-indigo-500/[0.03] from-indigo-500/10 via-indigo-500/[0.02] to-transparent">
            {/* Ambient Background Light Glow */}
            <div
              className={cn(
                'absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl opacity-60 pointer-events-none',
                ambientGlowColor,
              )}
            />

            <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pt-2 pb-2.5 sm:pt-4 sm:pb-5">
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
                <span className="text-ink font-bold">Add New Policy</span>
              </nav>

              {/* Action / Title layout */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 font-sans">
                  {/* Avatar + Title Container */}
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-sm sm:text-base shadow-md select-none border border-white/20 transition-all',
                        watchInsuredName
                          ? getInitialsColor(watchInsuredName)
                          : 'bg-gradient-to-tr from-slate-400 to-slate-500 text-white shadow-slate-500/20',
                      )}
                    >
                      {previewInitials}
                    </motion.div>

                    <div className="text-left min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-black text-ink leading-tight tracking-tight truncate">
                        {watchInsuredName ? `New: ${watchInsuredName}` : 'Register New Renewal'}
                      </h2>

                      {/* Info tags and live progress bar inside header */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-900/50 backdrop-blur-sm shadow-sm">
                          <Sparkles size={11} className="shrink-0 text-indigo-500" />
                          Drafting Registry
                        </span>

                        {previewPolicyTypeName && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm">
                            {previewPolicyTypeName}
                          </span>
                        )}

                        {isMotor && watchVehicleNumber && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm font-mono uppercase">
                            {watchVehicleNumber}
                          </span>
                        )}

                        {watchEndDate && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm font-mono">
                            Expires {formatDate(watchEndDate)}
                          </span>
                        )}

                        {/* Tiny progress inline details */}
                        <div className="flex items-center gap-1.5 ml-1">
                          <div className="w-16 bg-line-strong/30 rounded-full h-1 overflow-hidden">
                            <motion.div
                              className="bg-indigo-600 h-full rounded-full"
                              animate={{ width: `${progressPercentage.toString()}%` }}
                              transition={{ duration: 0.2 }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-ink-faint">
                            {progressPercentage}% filled
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Back button — right-aligned, matches enquiry form actions slot */}
                <div className="flex items-center gap-2 shrink-0 font-sans">
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
                </div>
              </div>
            </div>
          </IonToolbar>
        )}
      </IonHeader>

      <IonContent className="ion-padding-bottom" scrollY={true}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="min-h-full bg-body-bg"
        >
          {/* ── Form body ── */}
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6 lg:pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 sm:gap-8 items-start">
              {/* Left Column: Form Fields */}
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="show"
                className="space-y-6 lg:space-y-8 lg:pr-4 lg:pb-10"
              >
                {/* 2-column card layout on desktop for Client Search and Client Info + Policy Config */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-start">
                  {/* Link Client + Client Information */}
                  <div className="space-y-4">
                    <ClientSearch
                      selectedClient={selectedClientObj}
                      onSelect={(client) => {
                        if (client) {
                          setSelectedClientId(client.id);
                          setSelectedClientObj(client);
                          setValue('insuredName', client.insuredName);
                          setValue('mobileNumber', client.mobileNumber?.replace('+91', '') ?? '');
                        } else {
                          setSelectedClientId(null);
                          setSelectedClientObj(null);
                          setValue('insuredName', '');
                          setValue('mobileNumber', '');
                        }
                      }}
                      label={isEdit ? 'Attached Client' : 'Link to Existing Client'}
                    />

                    <div className="space-y-5 bg-surface border border-line p-5 sm:p-6 rounded-2xl shadow-sm text-left">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-line">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40 shrink-0">
                          <User size={13} />
                        </div>
                        <h3 className="text-xs font-bold text-ink leading-none">
                          Client Information
                        </h3>
                      </div>

                      <Input
                        label="Insured Name"
                        placeholder="Enter full name"
                        required
                        disabled={!!selectedClientId}
                        error={errors.insuredName?.message}
                        {...register('insuredName')}
                      />

                      <Input
                        label="Mobile Number"
                        placeholder="e.g. 9876543210"
                        required={!selectedClientId}
                        disabled={!!selectedClientId}
                        error={errors.mobileNumber?.message}
                        prefix="+91"
                        {...register('mobileNumber')}
                      />
                    </div>

                    {/* Insured Person Selection */}
                    <div className="space-y-5 bg-surface border border-line p-5 sm:p-6 rounded-2xl shadow-sm text-left">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-line">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 border border-indigo-200/40 shrink-0">
                          <User size={13} />
                        </div>
                        <h3 className="text-xs font-bold text-ink leading-none">
                          Insured Target
                        </h3>
                      </div>

                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
                          <input
                            type="radio"
                            name="insured_type"
                            checked={!isAssociate}
                            onChange={() => {
                              setIsAssociate(false);
                              setValue('insuredPersonName', '');
                            }}
                            className="w-4 h-4 text-indigo-600 border-line-strong focus:ring-indigo-500"
                          />
                          <span>Self (Policyholder)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
                          <input
                            type="radio"
                            name="insured_type"
                            checked={isAssociate}
                            onChange={() => {
                              setIsAssociate(true);
                            }}
                            className="w-4 h-4 text-indigo-600 border-line-strong focus:ring-indigo-500"
                          />
                          <span>Associate (Family Member)</span>
                        </label>
                      </div>

                      {isAssociate && (
                        <Input
                          label="Insured Person Name"
                          placeholder="e.g. Jane Doe (Wife)"
                          required
                          error={errors.insuredPersonName?.message}
                          {...register('insuredPersonName')}
                        />
                      )}
                    </div>
                  </div>

                  {/* Policy Information */}
                  <div className="space-y-5 bg-surface border border-line p-5 sm:p-6 rounded-2xl shadow-sm text-left">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-line">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate/10 dark:bg-slate/20 text-slate border border-slate/15 shrink-0">
                        <FileText size={13} />
                      </div>
                      <h3 className="text-xs font-bold text-ink leading-none">
                        Policy Information
                      </h3>
                    </div>

                    <Controller
                      name="policyType"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Policy Type"
                          required
                          value={field.value}
                          onValueChange={field.onChange}
                          options={typeOptions}
                          error={errors.policyType?.message}
                        />
                      )}
                    />

                    {isMotor && (
                      <Input
                        label="Vehicle Number"
                        placeholder="e.g. MH12AB1234"
                        error={errors.vehicleNumber?.message}
                        {...register('vehicleNumber')}
                      />
                    )}

                    <Input
                      label="Policy Number"
                      placeholder="e.g. POL123456"
                      required
                      error={errors.policyNumber?.message}
                      {...register('policyNumber')}
                    />

                    <Input
                      label="End Date"
                      type="date"
                      required
                      min={todayStr}
                      error={errors.endDate?.message}
                      {...register('endDate')}
                    />

                    {/* Claim Details */}
                    <div className="pt-4 border-t border-line space-y-4">
                      <Controller
                        name="isClaimed"
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/45 text-amber-700 dark:text-amber-300 shrink-0">
                                <AlertCircle size={11} />
                              </div>
                              <span className="text-xs font-bold text-ink">Claimed</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange(!field.value);
                              }}
                              className={cn(
                                'relative h-6 w-11 rounded-full border transition-all duration-200',
                                field.value
                                  ? 'border-rose-400/40 bg-rose-500/15 dark:bg-rose-500/30'
                                  : 'border-line-strong bg-surface',
                              )}
                            >
                              <span
                                className={cn(
                                  'absolute top-0.5 left-0.5 h-[18px] w-[18px] rounded-full border shadow-sm transition-all duration-200',
                                  field.value
                                    ? 'translate-x-[18px] border-rose-400 bg-rose-500 dark:bg-rose-400'
                                    : 'translate-x-0 border-line-strong bg-white dark:bg-line',
                                )}
                              />
                            </button>
                          </div>
                        )}
                      />

                      {watchIsClaimed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4 overflow-hidden"
                        >
                          <Input
                            label="Claim Date"
                            type="date"
                            error={errors.claimDate?.message}
                            {...register('claimDate')}
                          />
                          <Input
                            label="Claim Amount (Rs.)"
                            placeholder="e.g. 50000"
                            type="number"
                            error={errors.claimAmount?.message}
                            {...register('claimAmount')}
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {isDesktop && (
                  <div className="flex gap-3 pt-4 border-t border-line">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        history.goBack();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      className="flex-1 flex items-center justify-center gap-1.5 whitespace-nowrap"
                      loading={isSaving}
                      onClick={() => {
                        void handleSubmit(onSubmit)();
                      }}
                    >
                      <Save size={15} />
                      <span>{isEdit ? 'Update' : 'Save'}</span>
                    </Button>
                  </div>
                )}
              </motion.div>

              {/* Right Column: Premium/Notice Configuration + Live Card Preview */}
              <div className="space-y-6">
                <div className="space-y-5 bg-surface border border-line p-5 sm:p-6 rounded-2xl shadow-sm text-left">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-line">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-300 border border-emerald-200/40 shrink-0">
                      <CreditCard size={13} />
                    </div>
                    <h3 className="text-xs font-bold text-ink leading-none">
                      Pricing & Notice Details
                    </h3>
                  </div>

                  <Input
                    label="Premium Price (Rs.)"
                    placeholder="e.g. 15000"
                    type="number"
                    error={errors.premiumPrice?.message}
                    {...register('premiumPrice')}
                  />

                  <Input
                    label="Payment Link"
                    placeholder="https://pay.insurer.com/..."
                    error={errors.paymentLink?.message}
                    {...register('paymentLink')}
                  />

                  {/* Renewal Notice PDF Upload */}
                  <div className="flex flex-col gap-2 text-left">
                    <label className="text-xs font-bold text-ink-soft">Renewal Notice PDF</label>
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                    {pdfFileName ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-paper/60 px-3 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={15} className="shrink-0 text-rose-500" />
                          <span className="text-xs font-semibold text-ink truncate">
                            {pdfFileName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleViewPdf}
                            className="text-xs font-bold text-slate hover:underline px-1.5 py-1 cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={handleRemovePdf}
                            className="p-1 rounded-lg hover:bg-line-strong/30 transition-colors cursor-pointer shrink-0"
                          >
                            <X size={14} className="text-ink-faint" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-paper/40 px-4 py-3 text-xs font-semibold text-ink-soft hover:border-slate hover:text-ink transition-colors cursor-pointer"
                      >
                        <Paperclip size={14} />
                        Upload PDF
                      </button>
                    )}
                  </div>

                  {/* Additional Notice Lines */}
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-xs font-bold text-ink-soft">
                      Additional Notice Lines
                    </label>
                    <textarea
                      className="w-full min-h-[80px] p-3 rounded-xl border border-line bg-transparent text-sm text-ink focus-ring font-sans resize-y"
                      placeholder="Extra notes or instructions to append to the renewal message"
                      {...register('additionalNotice')}
                    />
                  </div>
                </div>

                {/* Sticky Preview Widget on Desktop */}
                <div className="hidden lg:block space-y-2 text-left sticky top-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                    Live Registry Preview
                  </span>
                  <div
                    onClick={() => {
                      toast('Live Preview Only', {
                        description:
                          'This is a real-time visual representation of the renewal card. Save the form to create it and unlock actions on the dashboard.',
                        duration: 4000,
                      });
                    }}
                    className="rounded-2xl border border-line bg-surface/50 backdrop-blur-sm overflow-hidden p-0 relative shadow-sm select-none cursor-pointer hover:border-indigo-500/30 hover:bg-surface/75 active:scale-[0.99] transition-all duration-200"
                  >
                    <div className="flex items-stretch">
                      <div
                        className={cn(
                          'w-1.5 flex-none transition-all duration-300',
                          previewUrgency === 'overdue' && 'bg-red-edge',
                          previewUrgency === 'due7' && 'bg-amber-edge',
                          previewUrgency === 'due30' && 'bg-green-edge',
                          previewUrgency === 'future' && 'bg-gray-edge',
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold shadow-sm',
                                watchInsuredName
                                  ? getInitialsColor(watchInsuredName)
                                  : 'bg-indigo-50 border-indigo-100 text-indigo-600',
                              )}
                            >
                              {previewInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-extrabold tracking-tight text-ink truncate">
                                {watchInsuredName || 'Insured Client Name'}
                              </h3>
                              <p
                                className={cn(
                                  'mt-0.5 text-xs font-bold',
                                  previewUrgency === 'overdue' && 'text-red-fg',
                                  previewUrgency === 'due7' && 'text-amber-fg',
                                  previewUrgency === 'due30' && 'text-green-fg',
                                  previewUrgency === 'future' && 'text-ink-faint',
                                )}
                              >
                                {previewDaysLabel}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone="neutral">{previewPolicyTypeName}</Badge>
                            {watchVehicleNumber && (
                              <Badge
                                tone="neutral"
                                className="font-mono normal-case tracking-[0.08em]"
                              >
                                {watchVehicleNumber}
                              </Badge>
                            )}
                            <Badge tone={statusTone(previewStatus)} dot>
                              {RENEWAL_STATUS_LABELS[previewStatus] ?? previewStatus}
                            </Badge>
                          </div>

                          {watchReferenceNote && (
                            <div className="rounded-xl bg-paper/60 border border-line/45 px-3 py-2 text-xs text-ink-soft">
                              <span className="text-[9px] font-black tracking-wider text-ink-faint mr-1.5 uppercase">
                                REF:
                              </span>
                              <span className="font-semibold text-ink">
                                {watchReferenceNote.toLowerCase().startsWith('ref:')
                                  ? watchReferenceNote.slice(4).trim()
                                  : watchReferenceNote}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Footer row */}
                        <div className="flex items-center justify-between border-t border-line/80 px-5 py-3 bg-surface/30">
                          <div className="flex items-center gap-1.5 text-ink-faint">
                            <Calendar size={12} className="shrink-0 text-ink-faint/70" />
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] sm:tracking-[0.15em]">
                              {watchEndDate ? `Ends ${formatDate(watchEndDate)}` : 'Ends ———'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {watchMobileNumber && (
                              <>
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm opacity-50">
                                  <Phone size={13} />
                                </div>
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-green-edge/30 bg-green-bg text-green-fg shadow-sm opacity-50">
                                  <MessageCircle size={13} />
                                </div>
                              </>
                            )}
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm opacity-50">
                              <Pencil size={12} />
                            </div>
                            <div className="flex h-5 w-5 items-center justify-center text-ink-faint">
                              <ChevronRight size={14} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-ink-faint text-center mt-1.5 font-medium select-none">
                    * Visual preview only. Save the renewal to activate action buttons.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </IonContent>

      {/* ── Sticky bottom save bar — mobile only ── */}
      {!isDesktop && (
        <IonFooter className="ion-no-border ion-no-padding bg-surface/95 backdrop-blur-xl border-t border-line">
          <div
            className="px-4 pt-3 flex gap-2.5 max-w-6xl mx-auto"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => {
                history.goBack();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="lg"
              loading={isSaving}
              leftIcon={<Save size={15} />}
              className="flex-1 whitespace-nowrap"
              onClick={() => {
                void handleSubmit(onSubmit)();
              }}
            >
              {isEdit ? 'Update' : 'Save'}
            </Button>
          </div>
        </IonFooter>
      )}
    </IonPage>
  );
}
