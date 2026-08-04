import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearch } from '@hooks/useSearch.js';
import { Search, Plus, Trash2, Tag, Pencil, X } from 'lucide-react';
import { motion } from 'framer-motion';
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
  useInfinitePolicyTypesQuery,
  useCreatePolicyTypeMutation,
  useUpdatePolicyTypeMutation,
  useDeletePolicyTypeMutation,
} from '@features/policyTypes/index.js';
import type { PolicyTypeMaster } from '@repo/types';
import { initials } from '@repo/utils';
import { useCardGridWidth } from '@repo/hooks';
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
  const [editingPolicyType, setEditingPolicyType] = useState<PolicyTypeMaster | null>(null);

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

  const cardMinWidth = useCardGridWidth(allPolicyTypes.map((t) => t.name));

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
    setEditingPolicyType(null);
    reset({ name: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (policyType: PolicyTypeMaster) => {
    setEditingPolicyType(policyType);
    reset({
      name: policyType.name,
    });
    setIsOpen(true);
  };

  const onSubmit = async (values: PolicyTypeFormValues) => {
    try {
      if (editingPolicyType) {
        await updateMutation.mutateAsync({ id: editingPolicyType.id, data: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setIsOpen(false);
    } catch {
      // Error handled globally by Query MutationCache in App.tsx
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMutation.mutateAsync(deleteTargetId);
      setIsDeleteOpen(false);
    } catch {
      // Error handled globally by Query MutationCache in App.tsx
    }
  };

  if (isLoading) return <PageLoader variant="list" />;

  return (
    <AppShellPage
      icon={Tag}
      title="Policy Types"
      subtitle="Manage policy classification categories across your clients."
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
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl border border-line bg-paper/90 px-4 shadow-inner transition-all focus-within:border-line-strong focus-within:shadow-none">
              <Search size={15} className="shrink-0 text-ink-faint" />
              <input
                className="flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                placeholder="Search policy types..."
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
            <Badge tone="accent">{`${String(allPolicyTypes.length)} policy types`}</Badge>
          </div>
        </div>
      }
    >
      <div className="pb-4">
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
          <motion.div
            key={debouncedSearchQuery}
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:gap-5 min-w-0"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardMinWidth}px, 1fr))` }}
          >
            {allPolicyTypes.map((type) => (
              <motion.div key={type.id} variants={cardVariant} layout className="h-full">
                <SurfaceCard className="group h-full overflow-hidden p-0 backdrop-blur-sm border border-line hover:border-slate/40 dark:hover:border-slate/40 hover:shadow-[0_12px_40px_rgba(15,118,110,0.06)] dark:hover:shadow-[0_12px_40px_rgba(45,212,191,0.04)] active:scale-[0.99] transition-all duration-300">
                  <div className="flex h-full flex-col justify-between">
                    <div className="p-4 sm:p-5 flex items-center gap-3">
                      {/* Avatar & Name */}
                      <div
                        className={cn(
                          'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105',
                          getInitialsColor(type.name),
                        )}
                      >
                        {initials(type.name)}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-ink transition duration-200 group-hover:text-slate leading-snug">
                          {type.name}
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
                              handleOpenEdit(type);
                            }}
                            title="Edit policy type"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(type.id);
                              setIsDeleteOpen(true);
                            }}
                            title="Delete policy type"
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
        title={editingPolicyType ? 'Edit Policy Type' : 'Add Policy Type'}
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
              {editingPolicyType ? 'Update' : 'Save'}
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
