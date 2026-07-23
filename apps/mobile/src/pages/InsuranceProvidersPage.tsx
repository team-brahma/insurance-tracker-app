import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearch } from '@hooks/useSearch.js';
import { Plus, Trash2, Building2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import AppShellPage from '@components/layout/AppShellPage.js';
import EmptyState from '@components/ui/EmptyState.js';
import PageLoader from '@components/ui/PageLoader.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
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
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-ink-faint">
              <Building2 size={15} />
            </span>
            <input
              type="text"
              placeholder="Search insurance providers..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-surface/50 text-sm font-semibold placeholder:text-ink-faint focus:outline-none focus:border-slate focus:ring-1 focus:ring-slate/20 transition-all shadow-sm"
            />
          </div>
        </div>
      }
    >
      <div className="space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allProviders.map((provider) => (
              <SurfaceCard
                key={provider.id}
                className="group flex flex-col justify-between p-5 border border-line hover:border-slate/40 hover:shadow-md transition-all duration-200"
              >
                <div className="text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate/10 dark:bg-slate/20 text-slate border border-slate/15 shrink-0">
                      <Building2 size={16} />
                    </div>
                    <span className="text-sm font-bold text-ink group-hover:text-slate transition-colors truncate">
                      {provider.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-line/60 pt-3.5 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit2 size={12} />}
                    onClick={() => {
                      handleOpenEdit(provider);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    leftIcon={<Trash2 size={12} />}
                    onClick={() => {
                      setDeleteTargetId(provider.id);
                      setIsDeleteOpen(true);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </SurfaceCard>
            ))}
          </div>
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
