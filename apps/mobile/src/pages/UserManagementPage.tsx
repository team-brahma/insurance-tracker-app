import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearch } from '@hooks/useSearch.js';
import {
  UserPlus,
  Trash2,
  Search,
  Mail,
  Calendar,
  Shield,
  ShieldAlert,
  Lock,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import AppShellPage from '@components/layout/AppShellPage.js';
import Badge from '@components/ui/Badge.js';
import EmptyState from '@components/ui/EmptyState.js';
import PageLoader from '@components/ui/PageLoader.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import Dialog from '@components/ui/Dialog.js';
import Button from '@components/ui/Button.js';
import Input from '@components/ui/Input.js';
import { useAuthStore } from '@features/auth/store/AuthStore.js';
import {
  useUsersQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
} from '@features/users/index.js';
import { formatDate, initials } from '@repo/utils';
import { VALIDATION, VALIDATION_ERRORS } from '@repo/constants';
import type { User as RepoUser } from '@repo/types';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').regex(VALIDATION.NAME, VALIDATION_ERRORS.NAME),
  email: z.string().regex(VALIDATION.EMAIL, VALIDATION_ERRORS.EMAIL),
  password: z.string().min(VALIDATION.PASSWORD_MIN_LENGTH, VALIDATION_ERRORS.PASSWORD_MIN),
  role: z.enum(['ADMIN', 'AGENT']),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export default function UserManagementPage() {
  const currentUser = useAuthStore((s) => s.user);
  const { data: usersResponse, isLoading, error } = useUsersQuery();
  const createUserMutation = useCreateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();

  const {
    searchText: searchQuery,
    debouncedSearchText: debouncedSearchQuery,
    setSearchText: setSearchQuery,
  } = useSearch();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', password: '', role: 'AGENT' },
  });

  const watchedRole = watch('role');

  const users = useMemo(() => usersResponse?.data ?? [], [usersResponse]);

  const filteredUsers = useMemo(() => {
    if (!debouncedSearchQuery) return users;
    const query = debouncedSearchQuery.toLowerCase();
    return users.filter(
      (u: RepoUser) =>
        u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
    );
  }, [users, debouncedSearchQuery]);

  const handleOpenCreate = () => {
    reset({ name: '', email: '', password: '', role: 'AGENT' });
    setIsCreateOpen(true);
  };

  const handleOpenDelete = (id: string) => {
    if (id === currentUser?.id) {
      toast.error('You cannot delete yourself.');
      return;
    }
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      await createUserMutation.mutateAsync(values);
      toast.success(`User ${values.name} created successfully`);
      setIsCreateOpen(false);
    } catch {
      // Error handled by query mutation globally
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteUserMutation.mutateAsync(deleteTargetId);
      toast.success('User deleted successfully');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    }
  };

  if (isLoading) return <PageLoader variant="default" />;

  if (error) {
    return (
      <AppShellPage icon={Users} title="User Management" subtitle="Manage system users">
        <EmptyState
          icon={ShieldAlert}
          variant="error"
          title="Access Restricted or Failed to Load"
          description="Failed to retrieve the list of users. You may not have administrative privileges."
        />
      </AppShellPage>
    );
  }

  return (
    <AppShellPage
      icon={User}
      title="User Management"
      subtitle="Manage internal system users, agents, and access control."
      actions={
        <Button
          variant="primary"
          size="sm"
          className="!hidden md:!flex items-center gap-1.5 font-bold shadow-sm"
          onClick={handleOpenCreate}
        >
          <UserPlus size={15} strokeWidth={2.5} />
          <span>Add User</span>
        </Button>
      }
      hero={
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-3 text-ink-faint pointer-events-none" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            className="pl-10"
          />
        </div>
      }
    >
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          variant="default"
          title="No users found"
          description="Try adjusting your search criteria or create a new user."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user: RepoUser) => {
            const isMe = user.id === currentUser?.id;
            return (
              <SurfaceCard
                key={user.id}
                className="flex flex-col justify-between border border-line/60 p-5 transition-all hover:border-line-strong hover:shadow-md"
              >
                <div className="text-left">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-slate to-slate-soft text-sm font-black text-white shadow-sm ring-2 ring-white/10">
                      {initials(user.name)}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge
                        tone={user.role === 'ADMIN' ? 'overdue' : 'neutral'}
                        className="font-extrabold uppercase tracking-wider text-[10px]"
                      >
                        {user.role}
                      </Badge>
                      {isMe && (
                        <span className="rounded-full bg-slate/10 px-2 py-0.5 text-[9px] font-bold text-slate dark:bg-slate/25">
                          You
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-4 font-sans text-[15px] font-black text-ink leading-tight truncate">
                    {user.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                    <Mail size={13} className="shrink-0 text-ink-faint" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-line/50 pt-4 text-xs text-ink-faint">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="shrink-0" />
                    <span>Joined {formatDate(user.createdAt)}</span>
                  </div>
                  {!isMe && (
                    <button
                      onClick={() => {
                        handleOpenDelete(user.id);
                      }}
                      className="group flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint hover:bg-red-bg hover:text-red-fg border border-transparent hover:border-red-edge/10 transition-all cursor-pointer"
                      title={`Delete user ${user.name}`}
                    >
                      <Trash2 size={14} className="transition-transform group-hover:scale-105" />
                    </button>
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      {/* ── CREATE USER MODAL ── */}
      <Dialog
        open={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
        }}
        title="Create New User"
        description="Add a new administrator or insurance agent to the portal."
      >
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="mt-2 space-y-4 text-left"
          noValidate
        >
          <Input
            label="Name"
            type="text"
            required
            leftElement={<User size={15} />}
            placeholder="e.g. John Doe"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email Address"
            type="email"
            required
            leftElement={<Mail size={15} />}
            placeholder="e.g. john@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            required
            leftElement={<Lock size={15} />}
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink-soft">System Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setValue('role', 'AGENT');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  watchedRole === 'AGENT'
                    ? 'border-slate bg-slate/5 text-slate font-bold'
                    : 'border-line hover:border-line-strong text-ink-soft'
                }`}
              >
                <User size={18} className="mb-1" />
                <span className="text-xs">Agent</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('role', 'ADMIN');
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  watchedRole === 'ADMIN'
                    ? 'border-slate bg-slate/5 text-slate font-bold'
                    : 'border-line hover:border-line-strong text-ink-soft'
                }`}
              >
                <Shield size={18} className="mb-1" />
                <span className="text-xs">Administrator</span>
              </button>
            </div>
            {errors.role?.message && (
              <p className="text-xs font-medium text-red-fg mt-1">{errors.role.message}</p>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={createUserMutation.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <Dialog
        open={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
        }}
        title="Delete User"
        description="Are you absolutely sure you want to delete this user? This action cannot be undone."
      >
        <div className="mt-4 space-y-4 text-left">
          <p className="text-sm text-ink-soft leading-relaxed">
            Deleting this user will revoke their access immediately. If they have active policies or
            clients, the operation will fail to protect client records.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                setDeleteTargetId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleDelete();
              }}
              loading={deleteUserMutation.isPending}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </AppShellPage>
  );
}
