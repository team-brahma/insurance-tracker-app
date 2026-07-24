import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearch } from '@hooks/useSearch.js';
import { Search, Plus, Trash2, Building2, Pencil, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import AppShellPage from '@components/layout/AppShellPage.js';
import EmptyState from '@components/ui/EmptyState.js';
import PageLoader from '@components/ui/PageLoader.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import Badge from '@components/ui/Badge.js';
import Dialog from '@components/ui/Dialog.js';
import AlertDialog from '@components/ui/AlertDialog.js';
import Button from '@components/ui/Button.js';
import Input from '@components/ui/Input.js';
import {
  useInfiniteInsuranceProvidersQuery,
  useCreateInsuranceProviderMutation,
  useUpdateInsuranceProviderMutation,
  useDeleteInsuranceProviderMutation,
} from '@features/insuranceProviders/index.js';
import type { InsuranceProviderMaster } from '@repo/types';
import { initials } from '@repo/utils';
import { cn } from '@utils/Cn.js';

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

const providerSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
});

type ProviderFormValues = z.infer<typeof providerSchema>;

export default function InsuranceProvidersPage() {
  const {
    searchText: searchQuery,
    debouncedSearchText: debouncedSearchQuery,
    setSearchText: setSearchQuery,
  } = useSearch();

  const params = useMemo(() => {
    const p: { search?: string; limit: number } = { limit: 10 };
    if (debouncedSearchQuery) p.search = debouncedSearchQuery;
    return p;
  }, [debouncedSearchQuery]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteInsuranceProvidersQuery(params);

  const createMutation = useCreateInsuranceProviderMutation();
  const updateMutation = useUpdateInsuranceProviderMutation();
  const deleteMutation = useDeleteInsuranceProviderMutation();

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<InsuranceProviderMaster | null>(null);

  // Delete States
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProviderFormValues>({
    resolver: zodResolver(providerSchema),
    defaultValues: { name: '' },
  });

  const allProviders = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

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

  const handleOpenCreate = () => {
    setEditingProvider(null);
    reset({ name: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (provider: InsuranceProviderMaster) => {
    setEditingProvider(provider);
    reset({
      name: provider.name,
    });
    setIsOpen(true);
  };

  const onSubmit = async (values: ProviderFormValues) => {
    try {
      if (editingProvider) {
        await updateMutation.mutateAsync({ id: editingProvider.id, data: values });
        toast.success(`Insurance provider "${values.name}" updated successfully.`);
      } else {
        await createMutation.mutateAsync(values);
        toast.success(`Insurance provider "${values.name}" created successfully.`);
      }
      setIsOpen(false);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = axiosError.response?.data?.message ?? axiosError.message ?? 'Operation failed.';
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      toast.success('Insurance provider deleted successfully.');
      setIsDeleteOpen(false);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosError.response?.data?.message ??
        axiosError.message ??
        'Failed to delete insurance provider.';
      toast.error(msg);
    }
  };

  if (isLoading) return <PageLoader variant="list" />;

  return (
    <AppShellPage
      icon={Building2}
      title="Insurance Providers"
      subtitle="Manage insurance agencies and companies supplying policies to your clients."
      actions={
        <Button
          variant="primary"
          size="sm"
          className="!hidden md:!flex items-center gap-1.5 font-bold shadow-sm"
          onClick={handleOpenCreate}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Provider</span>
        </Button>
      }
      hero={
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl border border-line bg-paper/90 px-4 shadow-inner transition-all focus-within:border-line-strong focus-within:shadow-none">
              <Search size={15} className="shrink-0 text-ink-faint" />
              <input
                className="flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                placeholder="Search insurance providers..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint hover:bg-surface hover:text-ink transition"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-left">
            <Badge tone="accent">{`${String(allProviders.length)} insurance providers`}</Badge>
          </div>
        </div>
      }
    >
      <div className="pb-4">
        {allProviders.length === 0 ? (
          <EmptyState
            icon={Building2}
            variant={searchQuery ? 'search' : 'default'}
            title={searchQuery ? 'No matching insurance providers' : 'No insurance providers found'}
            description={
              searchQuery
                ? 'Try a different search term.'
                : 'Create an insurance provider or agency to associate with policy renewals.'
            }
            tip={
              searchQuery
                ? 'Search matches the insurance provider name.'
                : 'Providers help track which agency issuing company a policy belongs to (e.g. Star Health, HDFC ERGO).'
            }
            action={
              !searchQuery ? (
                <Button variant="outline" size="sm" onClick={handleOpenCreate}>
                  Add Provider
                </Button>
              ) : undefined
            }
          />
        ) : (
          <motion.div
            key={debouncedSearchQuery}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 auto-rows-fr"
          >
            {allProviders.map((provider) => (
              <motion.div key={provider.id} variants={cardVariant} layout className="h-full">
                <SurfaceCard className="group h-full overflow-hidden p-0 backdrop-blur-sm border border-line hover:border-slate/40 dark:hover:border-slate/40 hover:shadow-[0_12px_40px_rgba(15,118,110,0.06)] dark:hover:shadow-[0_12px_40px_rgba(45,212,191,0.04)] active:scale-[0.99] transition-all duration-300">
                  <div className="flex h-full flex-col justify-between">
                    <div className="p-4 sm:p-5 flex items-center gap-3">
                      {/* Avatar & Name */}
                      <div
                        className={cn(
                          'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105',
                          getInitialsColor(provider.name),
                        )}
                      >
                        {initials(provider.name)}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-ink transition duration-200 group-hover:text-slate break-words leading-snug">
                          {provider.name}
                        </h3>
                      </div>
                    </div>

                    {/* Footer Row matching Client/Policy list icons */}
                    <div className="flex items-center justify-end border-t border-line/80 px-4 sm:px-5 py-3 bg-surface/30 group-hover:bg-surface/70 transition-colors duration-300">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(provider);
                            }}
                            title="Edit provider"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(provider.id);
                              setIsDeleteOpen(true);
                            }}
                            title="Delete provider"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-red-fg active:scale-95 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </SurfaceCard>
              </motion.div>
            ))}
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
      </div>

      {/* Floating Add Button for Mobile */}
      <button
        onClick={handleOpenCreate}
        className="fixed bottom-28 right-5 z-40 md:hidden flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate to-slate-soft text-white shadow-[0_8px_28px_rgba(15,118,110,0.4)] dark:shadow-[0_8px_32px_rgba(45,212,191,0.5)] ring-1 ring-white/10 cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-slate/40"
        style={{ marginBottom: 'calc(env(safe-area-inset-bottom, 0px) - 25px)' }}
      >
        <Plus size={22} strokeWidth={2.5} />
      </button>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        title={editingProvider ? 'Edit Insurance Provider' : 'Add Insurance Provider'}
        description="Configure details of this insurance agency or issuing company."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
          <Input
            label="Name"
            placeholder="e.g. Star Health Insurance"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-line/45 mt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingProvider ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
        }}
        onConfirm={handleDelete}
        title="Delete Insurance Provider?"
        description="This provider record will be permanently removed. Warning: Providers currently linked to existing policies cannot be deleted."
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="destructive"
        loading={deleteMutation.isPending}
        icon={<Trash2 size={20} />}
      />
    </AppShellPage>
  );
}
