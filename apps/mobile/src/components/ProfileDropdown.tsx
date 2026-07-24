import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { LogOut, Bell } from 'lucide-react';
import { useAuthStore } from '@features/auth/store/AuthStore.js';
import { useLogoutMutation } from '@features/auth/hooks/useAuth.js';
import { useNotificationCountQuery } from '@features/notifications/hooks/useNotificationCountQuery.js';
import { cn } from '@utils/Cn.js';
import { initials } from '@repo/utils';

interface ProfileDropdownProps {
  collapsed?: boolean;
}

export default function ProfileDropdown({ collapsed }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const history = useHistory();
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogoutMutation();
  const { data: countData } = useNotificationCountQuery();
  const count = typeof countData === 'number' ? countData : (countData?.totalCount ?? 0);

  const userInitials = user ? initials(user.name) : '??';

  function handleLogout() {
    void logoutMutation.mutateAsync().then(() => {
      history.push('/login');
    });
  }

  const trigger = (
    <button
      onClick={() => {
        setOpen((v) => !v);
      }}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-slate to-slate-soft text-xs font-black text-white shadow-sm ring-2 ring-white/10 transition-all hover:scale-105 cursor-pointer',
        collapsed ? 'h-10 w-10' : 'h-9 w-9',
      )}
    >
      {userInitials}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white shadow-sm ring-2 ring-surface">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side={collapsed ? 'right' : 'top'}
          align={collapsed ? 'start' : 'end'}
          sideOffset={8}
          collisionPadding={16}
          className={cn(
            'z-50 w-80 origin-top-right rounded-2xl border border-line bg-surface/95 backdrop-blur-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 select-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          {/* User header */}
          <div className="flex items-center gap-3 border-b border-line/60 px-4 py-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-slate to-slate-soft text-sm font-black text-white shadow-sm ring-2 ring-white/10">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold text-ink leading-tight truncate">
                {user?.name ?? 'Unknown'}
              </p>
              <p className="text-[10px] text-ink-faint truncate mt-0.5">{user?.email ?? ''}</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate/10 dark:bg-slate/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate">
              {user?.role ?? ''}
            </span>
          </div>

          {/* Notifications */}
          <div className="border-b border-line/60 p-2">
            <button
              onClick={() => {
                setOpen(false);
                history.push('/notifications');
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-paper cursor-pointer border-0"
            >
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate/10 text-slate">
                <Bell size={15} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[6px] font-bold text-white shadow-sm ring-2 ring-surface">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-ink">Notifications</p>
                <p className="text-[9px] text-ink-faint mt-0.5">
                  {count > 0
                    ? `${String(count)} upcoming reminder${count === 1 ? '' : 's'}`
                    : 'No pending reminders'}
                </p>
              </div>
            </button>
          </div>

          {/* Sign out */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-bold text-ink-soft hover:text-red-fg hover:bg-red-bg/40 transition-all cursor-pointer border-0"
            >
              <LogOut size={14} />
              {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
