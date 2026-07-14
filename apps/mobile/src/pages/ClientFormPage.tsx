import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save, Sparkles, Pencil } from 'lucide-react';
import { useHistory, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { IonPage, IonContent, IonHeader, IonToolbar, IonFooter } from '@ionic/react';
import {
  useClientQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
} from '@features/clients/index.js';
import { VALIDATION, VALIDATION_ERRORS } from '@repo/constants';
import { initials } from '@repo/utils';
import PageLoader from '@components/ui/PageLoader.js';
import Button from '@components/ui/Button.js';
import Input from '@components/ui/Input.js';
import { cn } from '@utils/Cn.js';

const clientSchema = z.object({
  insuredName: z.string().min(1, 'Name is required').regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME),
  mobileNumber: z
    .string()
    .min(1, 'Mobile number is required')
    .refine((v) => VALIDATION.INDIA_MOBILE.test(v.replace(/\D/g, '')), {
      message: VALIDATION_ERRORS.INDIA_MOBILE,
    }),
});

type FormValues = z.infer<typeof clientSchema>;

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

export default function ClientFormPage() {
  const { id } = useParams<{ id?: string }>();
  const history = useHistory();
  const isEdit = !!id;

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

  const { data, isLoading } = useClientQuery(id ?? '');
  const existing = data?.data;

  const createMutation = useCreateClientMutation();
  const updateMutation = useUpdateClientMutation();

  const defaultValues = useMemo(() => {
    if (existing) {
      return {
        insuredName: existing.insuredName,
        mobileNumber: existing.mobileNumber?.replace('+91', '') ?? '',
      };
    }
    return {
      insuredName: '',
      mobileNumber: '',
    };
  }, [existing]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues,
  });

  const watchName = watch('insuredName');
  const watchMobile = watch('mobileNumber');

  const previewName = watchName || existing?.insuredName || '';
  const previewInitials = initials(previewName || '');

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading && isEdit) return <PageLoader variant="default" />;

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        insuredName: values.insuredName.trim(),
        mobileNumber: `+91${values.mobileNumber.replace(/\D/g, '')}`,
      };

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      history.push('/clients');
    } catch (err) {
      // Handled globally
    }
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        {isEdit ? (
          /* ── Rich Edit Form Header ── */
          <IonToolbar className="ion-no-padding border-b relative overflow-hidden backdrop-blur-md border-teal-500/15 bg-teal-500/[0.03] from-teal-500/10 via-teal-500/[0.02] to-transparent">
            <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl opacity-60 pointer-events-none bg-teal-400/20" />

            <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pt-2 pb-2.5 sm:pt-4 sm:pb-5">
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
                <button
                  type="button"
                  onClick={() => {
                    history.push(`/clients/${id}`);
                  }}
                  className="hover:text-slate transition-colors cursor-pointer"
                >
                  {existing?.insuredName}
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
                        getInitialsColor(previewName),
                      )}
                    >
                      {previewInitials}
                    </motion.div>

                    <div className="text-left min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-black text-ink leading-tight tracking-tight truncate">
                        Edit: {previewName || existing?.insuredName}
                      </h2>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300 dark:bg-teal-950/40 dark:border-teal-900/50 backdrop-blur-sm shadow-sm">
                          <Pencil size={11} className="animate-pulse shrink-0" />
                          Editing Registry
                        </span>

                        {existing?.mobileNumber && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm font-mono">
                            {existing.mobileNumber}
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
        ) : (
          /* ── Rich Add Form Header ── */
          <IonToolbar className="ion-no-padding border-b relative overflow-hidden backdrop-blur-md border-indigo-500/15 bg-indigo-500/[0.03] from-indigo-500/10 via-indigo-500/[0.02] to-transparent">
            <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full blur-3xl opacity-60 pointer-events-none bg-indigo-400/20" />

            <div className="max-w-6xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8 pt-2 pb-2.5 sm:pt-4 sm:pb-5">
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
                <span className="text-ink font-bold">Add New Client</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 font-sans">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-sm sm:text-base shadow-md select-none border border-white/20 transition-all',
                        previewName
                          ? getInitialsColor(previewName)
                          : 'bg-gradient-to-tr from-indigo-400 to-indigo-500 text-white shadow-indigo-500/20',
                      )}
                    >
                      {previewInitials}
                    </motion.div>

                    <div className="text-left min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-black text-ink leading-tight tracking-tight truncate">
                        {previewName ? `New: ${previewName}` : 'Register New Client'}
                      </h2>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-900/50 backdrop-blur-sm shadow-sm">
                          <Sparkles size={11} className="shrink-0 text-indigo-500" />
                          Drafting Registry
                        </span>

                        {watchMobile && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-line bg-surface/50 text-ink-soft backdrop-blur-sm shadow-sm font-mono">
                            +91 {watchMobile}
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

      <IonContent className="ion-padding-bottom" scrollY={!isDesktop}>
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
          >
            <Input
              label="Insured Name"
              placeholder="Enter client full name"
              required
              error={errors.insuredName?.message}
              {...register('insuredName')}
            />

            <Input
              label="Mobile Number"
              placeholder="e.g. 9876543210"
              error={errors.mobileNumber?.message}
              prefix="+91"
              {...register('mobileNumber')}
            />

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
