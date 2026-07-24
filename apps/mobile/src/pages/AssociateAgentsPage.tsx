import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearch } from '@hooks/useSearch.js';
import {
  Search,
  Plus,
  Trash2,
  UserCheck,
  Pencil,
  Phone,
  MessageCircle,
  Building,
  X,
} from 'lucide-react';
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
  useAssociateAgentsQuery,
  useCreateAssociateAgentMutation,
  useUpdateAssociateAgentMutation,
  useDeleteAssociateAgentMutation,
} from '@features/associateAgents/index.js';
import type { AssociateAgent } from '@repo/types';
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

const associateAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  mobileNumber: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  agencyName: z.string().optional(),
  notes: z.string().optional(),
});

type AssociateAgentFormValues = z.infer<typeof associateAgentSchema>;

export default function AssociateAgentsPage() {
  const {
    searchText: searchQuery,
    debouncedSearchText: debouncedSearchQuery,
    setSearchText: setSearchQuery,
  } = useSearch();

  const params = useMemo(() => {
    const p: { search?: string } = {};
    if (debouncedSearchQuery) p.search = debouncedSearchQuery;
    return p;
  }, [debouncedSearchQuery]);

  const { data: agents = [], isLoading } = useAssociateAgentsQuery(params);

  const createMutation = useCreateAssociateAgentMutation();
  const updateMutation = useUpdateAssociateAgentMutation();
  const deleteMutation = useDeleteAssociateAgentMutation();

  // Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AssociateAgent | null>(null);

  // Delete States
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(associateAgentSchema),
    defaultValues: { name: '', mobileNumber: '', agencyName: '', notes: '' },
  });

  const handleOpenCreate = () => {
    setEditingAgent(null);
    reset({ name: '', mobileNumber: '', agencyName: '', notes: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (agent: AssociateAgent) => {
    setEditingAgent(agent);
    reset({
      name: agent.name,
      mobileNumber: agent.mobileNumber,
      agencyName: agent.agencyName ?? '',
      notes: agent.notes ?? '',
    });
    setIsOpen(true);
  };

  const onSubmit = async (values: AssociateAgentFormValues) => {
    try {
      const payload = {
        name: values.name.trim(),
        mobileNumber: values.mobileNumber.trim(),
        ...(values.agencyName?.trim() ? { agencyName: values.agencyName.trim() } : {}),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      };

      if (editingAgent) {
        await updateMutation.mutateAsync({ id: editingAgent.id, data: payload });
        toast.success(`Associate agent "${values.name}" updated successfully.`);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(`Associate agent "${values.name}" created successfully.`);
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
      toast.success('Associate agent deleted successfully.');
      setIsDeleteOpen(false);
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        axiosError.response?.data?.message ??
        axiosError.message ??
        'Failed to delete associate agent.';
      toast.error(msg);
    }
  };

  if (isLoading) return <PageLoader variant="list" />;

  return (
    <AppShellPage
      icon={UserCheck}
      title="Associate Agents"
      subtitle="Manage external partner agents who outsource client policy registrations to you."
      actions={
        <Button
          variant="primary"
          size="sm"
          className="!hidden md:!flex items-center gap-1.5 font-bold shadow-sm"
          onClick={handleOpenCreate}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Associate Agent</span>
        </Button>
      }
      hero={
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <div className="flex h-11 flex-1 items-center gap-2.5 rounded-2xl border border-line bg-paper/90 px-4 shadow-inner transition-all focus-within:border-line-strong focus-within:shadow-none">
              <Search size={15} className="shrink-0 text-ink-faint" />
              <input
                className="flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                placeholder="Search associate agents by name, agency, or mobile..."
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
            <Badge tone="accent">{`${String(agents.length)} associate agents`}</Badge>
          </div>
        </div>
      }
    >
      <div className="pb-4">
        {agents.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            variant={searchQuery ? 'search' : 'default'}
            title={searchQuery ? 'No matching associate agents' : 'No associate agents found'}
            description={
              searchQuery
                ? 'Try a different search term.'
                : 'Create an associate agent record to link outsourced clients and policies.'
            }
            tip={
              searchQuery
                ? 'Search matches agent name, agency name, or phone number.'
                : 'Associate agents help you track policies registered on behalf of external peer agents.'
            }
            action={
              !searchQuery ? (
                <Button variant="outline" size="sm" onClick={handleOpenCreate}>
                  Add Associate Agent
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
            {agents.map((agent) => (
              <motion.div key={agent.id} variants={cardVariant} layout className="h-full">
                <SurfaceCard className="group h-full overflow-hidden p-0 backdrop-blur-sm border border-line hover:border-slate/40 dark:hover:border-slate/40 hover:shadow-[0_12px_40px_rgba(15,118,110,0.06)] dark:hover:shadow-[0_12px_40px_rgba(45,212,191,0.04)] active:scale-[0.99] transition-all duration-300">
                  <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
                    <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3">
                      {/* Avatar & Name */}
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105',
                            getInitialsColor(agent.name),
                          )}
                        >
                          {initials(agent.name)}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-ink transition duration-200 group-hover:text-slate break-words leading-snug">
                            {agent.name}
                          </h3>
                          <p className="mt-0.5 text-xs font-bold text-ink-faint">
                            {agent.mobileNumber}
                          </p>
                        </div>
                      </div>

                      {/* Badges */}
                      {agent.agencyName && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <Badge tone="neutral" className="normal-case">
                            <Building size={10} className="mr-1" />
                            {agent.agencyName}
                          </Badge>
                        </div>
                      )}

                        {/* Notes box */}
                        {agent.notes && (
                          <div className="rounded-xl bg-paper/60 border border-line/45 px-3 py-2 text-xs text-ink-soft transition-colors duration-200 group-hover:bg-paper/85 text-left">
                            <span className="text-[9px] font-black tracking-wider text-ink-faint mr-1.5 uppercase">
                              NOTES:
                            </span>
                            <span className="font-semibold text-ink">{agent.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer Row matching Client/Policy list icons */}
                      <div className="flex items-center justify-end border-t border-line/80 px-4 sm:px-5 py-3 bg-surface/30 group-hover:bg-surface/70 transition-colors duration-300">
                        <div className="flex items-center gap-1.5 shrink-0">
                          {agent.mobileNumber && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`tel:${agent.mobileNumber}`);
                                }}
                                title="Call agent"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                              >
                                <Phone size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(
                                    `https://wa.me/91${agent.mobileNumber.replace(/\D/g, '').slice(-10)}`,
                                    '_blank',
                                  );
                                }}
                                title="Send WhatsApp"
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-green-edge/30 bg-green-bg text-green-fg shadow-sm transition hover:bg-green-edge/20 active:scale-95 cursor-pointer"
                              >
                                <MessageCircle size={13} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(agent);
                            }}
                            title="Edit Agent"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-line-strong bg-surface text-ink-soft shadow-sm transition hover:bg-paper hover:text-slate active:scale-95 cursor-pointer"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(agent.id);
                              setIsDeleteOpen(true);
                            }}
                            title="Delete Agent"
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
        onClose={() => setIsOpen(false)}
        title={editingAgent ? 'Edit Associate Agent' : 'Add Associate Agent'}
        description="Save external agent details to link outsourced policies and customers."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
          <Input
            label="Agent Name"
            placeholder="e.g. John Doe"
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

          <Input
            label="Agency Name"
            placeholder="e.g. Apex Insurance Agency"
            error={errors.agencyName?.message}
            {...register('agencyName')}
          />

          <div>
            <label className="block text-xs font-semibold text-ink-muted mb-1 text-left">
              Notes
            </label>
            <textarea
              placeholder="Additional details or reference info..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm font-semibold text-ink focus:outline-none focus:border-slate transition-all"
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line/45 mt-4">
            <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingAgent ? 'Update Agent' : 'Save Agent'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Associate Agent?"
        description="This agent record will be deleted. Note: Agents with active linked clients or policies cannot be deleted until unlinked."
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="destructive"
        loading={deleteMutation.isPending}
        icon={<Trash2 size={20} />}
      />
    </AppShellPage>
  );
}
