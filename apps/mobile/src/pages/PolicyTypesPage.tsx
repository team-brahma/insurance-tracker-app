import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearch } from '@hooks/useSearch.js';
import { Plus, Trash2, Tag, Edit2 } from 'lucide-react';
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
  useInfinitePolicyTypesQuery,
  useCreatePolicyTypeMutation,
  useUpdatePolicyTypeMutation,
  useDeletePolicyTypeMutation,
} from '@features/policyTypes/index.js';
import type { PolicyTypeMaster } from '@repo/types';

const policyTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

type PolicyTypeFormValues = z.infer<typeof policyTypeSchema>;

export default function PolicyTypesPage() {
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
    useInfinitePolicyTypesQuery(params);

  const createMutation = useCreatePolicyTypeMutation();
  const updateMutation = useUpdatePolicyTypeMutation();
  const deleteMutation = useDeletePolicyTypeMutation();

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [editingType, setEditingType] = useState<PolicyTypeMaster | null>(null);

  // Delete States
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PolicyTypeFormValues>({
    resolver: zodResolver(policyTypeSchema),
    defaultValues: { name: '' },
  });

  const allPolicyTypes = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);

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
    setEditingType(null);
    reset({ name: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (type: PolicyTypeMaster) => {
    setEditingType(type);
    reset({
      name: type.name,
    });
    setIsOpen(true);
  };

  const onSubmit = async (values: PolicyTypeFormValues) => {
    try {
      if (editingType) {
        await updateMutation.mutateAsync({ id: editingType.id, data: values });
        toast.success(`Policy type "${values.name}" updated successfully.`);
      } else {
        await createMutation.mutateAsync(values);
        toast.success(`Policy type "${values.name}" created successfully.`);
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
      toast.success('Policy type deleted successfully.');
      setIsDeleteOpen(false);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosError.response?.data?.message ?? axiosError.message ?? 'Failed to delete policy type.';
      toast.error(msg);
    }
  };

  if (isLoading) return <PageLoader variant="list" />;

  return (
    <AppShellPage
      icon={Tag}
      title="Policy Types"
      subtitle="Configure and manage the dynamic categories of insurance policies and client enquiries."
      actions={
        <Button
          variant="primary"
          size="sm"
          className="!hidden md:!flex items-center gap-1.5 font-bold shadow-sm"
          onClick={handleOpenCreate}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Type</span>
        </Button>
      }
      hero={
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-ink-faint">
              <Tag size={15} />
            </span>
            <input
              type="text"
              placeholder="Search policy types..."
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
        {allPolicyTypes.length === 0 ? (
          <EmptyState
            icon={Tag}
            variant={searchQuery ? 'search' : 'default'}
            title={searchQuery ? 'No matching policy types' : 'No policy types found'}
            description={
              searchQuery
                ? 'Try a different search term.'
                : 'Create a custom category to classify insurance renewal records.'
            }
            tip={
              searchQuery
                ? 'Search matches the policy type name.'
                : 'Policy types help organise renewals by insurance category (e.g. Motor, Health).'
            }
            action={
              !searchQuery ? (
                <Button variant="outline" size="sm" onClick={handleOpenCreate}>
                  Add Policy Type
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPolicyTypes.map((type) => (
              <SurfaceCard
                key={type.id}
                className="group flex flex-col justify-between p-5 border border-line hover:border-slate/40 hover:shadow-md transition-all duration-200"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink group-hover:text-slate transition-colors">
                      {type.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-line/60 pt-3.5 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit2 size={12} />}
                    onClick={() => {
                      handleOpenEdit(type);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    leftIcon={<Trash2 size={12} />}
                    onClick={() => {
                      setDeleteTargetId(type.id);
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
        title={editingType ? 'Edit Policy Type' : 'Add Policy Type'}
        description="Configure dynamic parameters of this policy classification."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
          <Input
            label="Name"
            placeholder="e.g. Cyber Insurance"
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
              {editingType ? 'Update' : 'Save'}
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
        title="Delete Policy Type?"
        description="This classification will be permanently removed. Warning: Doing this might cause issues if policies are still mapped to it."
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="destructive"
        loading={deleteMutation.isPending}
        icon={<Trash2 size={20} />}
      />
    </AppShellPage>
  );
}
