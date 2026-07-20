import { useMemo, useEffect, useState } from 'react';
import { ArrowLeft, Save, Pencil, Sparkles } from 'lucide-react';
import { useHistory, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { IonPage, IonContent, IonHeader, IonToolbar, IonFooter } from '@ionic/react';
import {
  useEnquiryQuery,
  useCreateEnquiryMutation,
  useUpdateEnquiryMutation,
} from '@features/enquiries/hooks/useEnquiriesQuery.js';
import { VALIDATION, VALIDATION_ERRORS, ENQUIRY_STATUS_LABELS } from '@repo/constants';
import { usePolicyTypesQuery } from '@features/policyTypes/index.js';
import { initials } from '@repo/utils';
import PageLoader from '@components/ui/PageLoader.js';
import Button from '@components/ui/Button.js';
import Input from '@components/ui/Input.js';
import Select from '@components/ui/Select.js';
import { cn } from '@utils/Cn.js';

const getEnquirySchema = (policyTypes: { id: string; name: string }[]) => {
  const motorPolicyType = policyTypes.find((t) => t.name.toUpperCase() === 'MOTOR');
  const motorId = motorPolicyType?.id || 'MOTOR';
  return z
    .object({
      name: z.string().min(1, 'Name is required').regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME),
      mobileNumber: z
        .string()
        .min(1, 'Mobile number is required')
        .regex(/^(?:\+91|91|0)?[-\s]?[6-9](?:[-\s]?\d){9}$/, VALIDATION_ERRORS.INDIA_MOBILE),
      policyType: z.string().min(1, 'Policy type is required'),
      vehicleNumber: z.string().optional(),
      referredBy: z.string().optional(),
      remindOn: z
        .string()
        .optional()
        .refine(
          (val) => {
            if (!val) return true;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dateVal = new Date(val);
            dateVal.setHours(0, 0, 0, 0);
            return dateVal >= today;
          },
          { message: 'Date cannot be in the past' },
        ),
      remindTime: z.string().optional(),
      status: z.string().optional(),
    })
    .refine(
      (data) =>
        !(
          data.policyType === motorId &&
          data.vehicleNumber?.trim() &&
          !VALIDATION.VEHICLE_NUMBER.test(data.vehicleNumber.trim().toUpperCase())
        ),
      { message: VALIDATION_ERRORS.VEHICLE_NUMBER, path: ['vehicleNumber'] },
    );
};

type FormValues = z.infer<ReturnType<typeof getEnquirySchema>>;

// Dynamic options loaded from API inside component

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

function statusColors(status: string) {
  const map: Record<string, { glow: string; badge: string; avatar: string; ambient: string }> = {
    OPEN: {
      glow: 'bg-blue-500/10',
      badge:
        'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-900/50',
      avatar: 'from-blue-500 to-indigo-600 text-white shadow-blue-500/20',
      ambient: 'bg-blue-500/10',
    },
    CONVERTED: {
      glow: 'bg-green-500/10',
      badge:
        'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-300 dark:bg-green-950/40 dark:border-green-900/50',
      avatar: 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/20',
      ambient: 'bg-green-500/10',
    },
    DROPPED: {
      glow: 'bg-red-500/10',
      badge:
        'bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900/50',
      avatar: 'from-rose-500 to-red-600 text-white shadow-rose-500/20',
      ambient: 'bg-red-500/10',
    },
  };
  return map[status] ?? map.OPEN;
}

export default function EnquiryFormPage() {
  const { id } = useParams<{ id?: string }>();
  const history = useHistory();
  const isEdit = !!id;
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const { data, isLoading } = useEnquiryQuery(id ?? '');
  const existing = data?.data;

  const createMutation = useCreateEnquiryMutation();
  const updateMutation = useUpdateEnquiryMutation();

  const { data: policyTypesRes } = usePolicyTypesQuery();
  const policyTypes = policyTypesRes?.data ?? [];
  const typeOptions = policyTypes.map((t) => ({ value: t.id, label: t.name }));

  const defaultValues = useMemo<FormValues>(() => {
    if (existing) {
      let remindOnDate = '';
      let remindOnTime = '09:30';
      if (existing.remindOn) {
        const dateObj = new Date(existing.remindOn);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          remindOnDate = `${year}-${month}-${day}`;

          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          remindOnTime = `${hours}:${minutes}`;
        }
      }
      return {
        name: existing.name,
        mobileNumber: existing.mobileNumber,
        policyType: existing.policyTypeId,
        referredBy: existing.referredBy ?? '',
        remindOn: remindOnDate,
        remindTime: remindOnTime,
        status: existing.status,
        vehicleNumber: existing.vehicleNumber ?? '',
      };
    }
    return {
      name: '',
      mobileNumber: '',
      policyType: '',
      referredBy: '',
      remindOn: '',
      remindTime: '09:30',
      status: 'OPEN',
      vehicleNumber: '',
    };
  }, [existing]);

  const schema = useMemo(() => getEnquirySchema(policyTypes), [policyTypes]);

  const {
    register,
    control,
    watch,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    if (isEdit && existing) {
      let remindOnDate = '';
      let remindOnTime = '09:30';
      if (existing.remindOn) {
        const dateObj = new Date(existing.remindOn);
        if (!isNaN(dateObj.getTime())) {
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          remindOnDate = `${year}-${month}-${day}`;

          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          remindOnTime = `${hours}:${minutes}`;
        }
      }
      reset({
        name: existing.name,
        mobileNumber: existing.mobileNumber,
        policyType: existing.policyTypeId,
        referredBy: existing.referredBy ?? '',
        remindOn: remindOnDate,
        remindTime: remindOnTime,
        status: existing.status,
        vehicleNumber: existing.vehicleNumber ?? '',
      });
    } else if (!isEdit) {
      reset({
        name: '',
        mobileNumber: '',
        policyType: '',
        referredBy: '',
        remindOn: '',
        remindTime: '09:30',
        status: 'OPEN',
        vehicleNumber: '',
      });
    }
  }, [existing, isEdit, reset]);

  useEffect(() => {
    if (!isEdit && policyTypes.length > 0 && !watch('policyType')) {
      const motorType = policyTypes.find((t) => t.name.toUpperCase() === 'MOTOR');
      if (motorType) {
        setValue('policyType', motorType.id);
      }
    }
  }, [isEdit, policyTypes, watch, setValue]);

  const watchName = watch('name');
  const watchMobile = watch('mobileNumber');
  const watchPolicyType = watch('policyType');
  const watchRemindOn = watch('remindOn');
  const watchRemindTime = watch('remindTime');
  const watchVehicleNumber = watch('vehicleNumber') || '';

  const previewInitials = watchName ? initials(watchName) : '??';
  const previewStatus = existing?.status ?? 'OPEN';
  const colors = isEdit ? statusColors(previewStatus) : null;
  const selectedPolicyTypeObj = policyTypes.find((t) => t.id === watchPolicyType);
  const previewPolicyTypeName = selectedPolicyTypeObj?.name ?? '';
  const isMotor = selectedPolicyTypeObj?.name.toUpperCase() === 'MOTOR';

  const onSubmit = async (values: FormValues) => {
    try {
      let remindOnISO: string | null = null;
      if (values.remindOn) {
        const time = values.remindTime || '09:30';
        const localDate = new Date(`${values.remindOn}T${time}`);
        if (!isNaN(localDate.getTime())) {
          remindOnISO = localDate.toISOString();
        } else {
          throw new Error('Invalid remind date or time');
        }
      }

      const watchPolicyTypeObj = policyTypes.find((t) => t.id === values.policyType);
      const isMotorVal = watchPolicyTypeObj?.name.toUpperCase() === 'MOTOR';

      const digits = values.mobileNumber.replace(/\D/g, '');
      const payload = {
        name: values.name,
        mobileNumber: `+91${digits.slice(-10)}`,
        policyType: values.policyType,
        referredBy: values.referredBy ?? null,
        remindOn: remindOnISO,
        vehicleNumber: isMotorVal ? values.vehicleNumber || null : null,
      };

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      history.push('/enquiries');
    } catch (err) {
      // Handled globally
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading && isEdit) return <PageLoader variant="default" />;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        {isEdit ? (
          <IonToolbar
            className={cn(
              'ion-no-padding border-b relative overflow-hidden backdrop-blur-md',
              colors?.ambient
                ? `${colors.ambient.replace('bg-', 'border-').replace('/10', '/15')} ${colors.ambient.replace('bg-', 'bg-').replace('/10', '/[0.04]')}`
                : 'border-slate-500/15 bg-slate-500/[0.04]',
            )}
          >
            <div
              className={cn(
                'absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl opacity-60 pointer-events-none',
                colors?.ambient ?? 'bg-slate-500/10',
              )}
            />

            <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pt-2 pb-2.5 sm:pt-4 sm:pb-5">
              <nav className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint opacity-70 mb-3">
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
                <button
                  type="button"
                  onClick={() => {
                    history.push(`/enquiries/${id}`);
                  }}
                  className="hover:text-slate transition-colors cursor-pointer"
                >
                  {existing?.name}
                </button>
                <span>›</span>
                <span className="text-ink font-bold">Edit Details</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 font-sans">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr font-black text-sm sm:text-base shadow-md select-none border border-white/20 transition-all',
                        colors?.avatar ??
                          'from-slate-500 to-slate-600 text-white shadow-slate-500/20',
                      )}
                    >
                      {previewInitials}
                    </motion.div>

                    <div className="text-left min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-black text-ink leading-tight tracking-tight truncate">
                        Edit: {watchName || existing?.name}
                      </h2>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate/30 bg-slate/10 text-slate dark:bg-slate/20 backdrop-blur-sm shadow-sm">
                          <Pencil size={11} className="animate-pulse shrink-0" />
                          Editing Enquiry
                        </span>

                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm shadow-sm',
                            colors?.badge ?? '',
                          )}
                        >
                          {ENQUIRY_STATUS_LABELS[previewStatus] ?? previewStatus}
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
                      </div>
                    </div>
                  </div>
                </div>

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
          <IonToolbar className="ion-no-padding border-b relative overflow-hidden backdrop-blur-md border-indigo-500/15 bg-indigo-500/[0.03] from-indigo-500/10 via-indigo-500/[0.02] to-transparent">
            <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl opacity-60 pointer-events-none bg-indigo-400/20" />

            <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pt-2 pb-2.5 sm:pt-4 sm:pb-5">
              <nav className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint opacity-70 mb-3">
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
                <span className="text-ink font-bold">Add New Enquiry</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 font-sans">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-sm sm:text-base shadow-md select-none border border-white/20 transition-all',
                        watchName
                          ? getInitialsColor(watchName)
                          : 'bg-gradient-to-tr from-indigo-400 to-indigo-500 text-white shadow-indigo-500/20',
                      )}
                    >
                      {previewInitials}
                    </motion.div>

                    <div className="text-left min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-black text-ink leading-tight tracking-tight truncate">
                        {watchName ? `New: ${watchName}` : 'Register New Enquiry'}
                      </h2>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-900/50 backdrop-blur-sm shadow-sm">
                          <Sparkles size={11} className="shrink-0 text-indigo-500" />
                          Drafting Enquiry
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

                        {watchMobile && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm font-mono">
                            {watchMobile}
                          </span>
                        )}

                        {watchRemindOn && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm font-mono">
                            Remind {watchRemindOn} {watchRemindTime ? `@ ${watchRemindTime}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

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
          variants={stagger}
          initial="hidden"
          animate="show"
          className="max-w-2xl mx-auto space-y-6"
        >
          <form
            onSubmit={(e) => {
              void handleSubmit(onSubmit)(e);
            }}
            className="space-y-5 bg-surface border border-line p-6 rounded-2xl shadow-sm text-left"
            noValidate
          >
            <Input
              label="Client Name"
              placeholder="Enter client full name"
              required
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Mobile Number"
              placeholder="e.g. 9876543210"
              required
              error={errors.mobileNumber?.message}
              {...register('mobileNumber')}
            />

            <Controller
              name="policyType"
              control={control}
              render={({ field }) => (
                <Select
                  label="Interested Policy Type"
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
              label="Referred By"
              placeholder="e.g. Friend, Google Search, Walk-in"
              error={errors.referredBy?.message}
              {...register('referredBy')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Remind On"
                type="date"
                min={todayStr}
                error={errors.remindOn?.message}
                {...register('remindOn')}
              />

              <Input
                label="Remind Time"
                type="time"
                error={errors.remindTime?.message}
                disabled={!watchRemindOn}
                {...register('remindTime')}
              />
            </div>

            {isDesktop && (
              <div className="flex gap-3 pt-3 border-t border-line">
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
          </form>
        </motion.div>
      </IonContent>

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
