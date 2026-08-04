import { useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import {
  List,
  Users,
  HelpCircle,
  BarChart2,
  Bell,
  Settings,
  Plus,
  LogOut,
  ShieldCheck,
  MoreVertical,
  Sparkles,
  Tag,
  Upload,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { cn } from '@utils/Cn.js';
import { useAuthStore } from '@features/auth/store/AuthStore.js';
import { useLogoutMutation } from '@features/auth/hooks/useAuth.js';
import { useNotificationCountQuery } from '@features/notifications/hooks/useNotificationCountQuery.js';
import { initials } from '@repo/utils';

const coreItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: BarChart2,
    isActive: (p: string) => p === '/dashboard',
  },
  {
    label: 'Renewals',
    path: '/policies',
    icon: List,
    isActive: (p: string) =>
      p.startsWith('/policies') && p !== '/policies/new' && !p.includes('/edit'),
  },
  {
    label: 'Clients',
    path: '/clients',
    icon: Users,
    isActive: (p: string) =>
      p.startsWith('/clients') && p !== '/clients/new' && !p.includes('/edit'),
  },
  {
    label: 'Enquiries',
    path: '/enquiries',
    icon: HelpCircle,
    isActive: (p: string) =>
      p.startsWith('/enquiries') && p !== '/enquiries/new' && !p.includes('/edit'),
  },
];

const sheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 35, mass: 1 },
  },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export default function BottomBar({ className = '' }: BottomBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const history = useHistory();
  const user = useAuthStore((s) => s.user);
  const currentPath = location.pathname;
  const logoutMutation = useLogoutMutation();
  const { data: notifCountData } = useNotificationCountQuery();
  const notifCount = typeof notifCountData === 'number' ? notifCountData : (notifCountData?.totalCount ?? 0);
  const userInitials = user ? initials(user.name) : '??';

  function handleLogout() {
    setSheetOpen(false);
    void logoutMutation.mutateAsync().then(() => {
      history.push('/login');
    });
  }

  function navigate(path: string) {
    setSheetOpen(false);
    history.push(path);
  }

  function handleAddNew() {
    setSheetOpen(false);
    const target =
      currentPath.startsWith('/enquiries') && currentPath !== '/enquiries/new'
        ? '/enquiries/new'
        : currentPath.startsWith('/clients') && currentPath !== '/clients/new'
          ? '/clients/new'
          : '/policies/new';
    history.push(target);
  }

  const isFormPage =
    currentPath === '/policies/new' ||
    currentPath.includes('/edit') ||
    currentPath === '/enquiries/new' ||
    currentPath === '/clients/new';
  const showFloatingAdd =
    !isFormPage &&
    currentPath !== '/dashboard' &&
    currentPath !== '/notifications' &&
    currentPath !== '/settings' &&
    currentPath !== '/policy-types' &&
    currentPath !== '/bulk-import' &&
    user?.role !== 'ADMIN';

  if (isFormPage) return null;

  const allItems = [
    ...coreItems,
    { label: 'More', path: '#more', icon: MoreVertical, isActive: () => sheetOpen },
  ];

  if (user?.role === 'ADMIN') {
    return (
      <>
        <FloatingAddBtn show={showFloatingAdd} onAdd={handleAddNew} />
        <div
          className={cn(
            'mx-auto w-full max-w-md md:max-w-lg h-16 bg-surface/85 border border-line/40 rounded-2xl shadow-[0_12px_40px_rgba(13,23,44,0.16)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl flex items-center justify-between px-3 select-none md:!hidden',
            className,
          )}
        >
          <TabButton
            label="Users"
            icon={ShieldCheck}
            active={currentPath === '/users'}
            onClick={() => {
              navigate('/users');
            }}
          />
          <TabButton
            label={logoutMutation.isPending ? '...' : 'Logout'}
            icon={LogOut}
            active={false}
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <FloatingAddBtn show={showFloatingAdd} onAdd={handleAddNew} />

      <div
        className={cn(
          'mx-auto w-full max-w-md md:max-w-lg h-16 bg-surface/85 border border-line/40 rounded-2xl shadow-[0_12px_40px_rgba(13,23,44,0.16)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl flex items-center justify-between px-3 select-none md:!hidden',
          className,
        )}
      >
        <LayoutGroup>
          {allItems.map((item) => {
            const active = item.isActive(currentPath);
            const Icon = item.icon;
            return (
              <motion.button
                key={item.path}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (item.path === '#more') {
                    setSheetOpen(true);
                  } else {
                    navigate(item.path);
                  }
                }}
                className="group relative flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] cursor-pointer focus:outline-none border-0"
              >
                <AnimatePresence>
                  {active && (
                    <motion.span
                      layoutId="bottom-active-pill"
                      className="absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-xl bg-slate/10 dark:bg-slate/15 ring-1 ring-slate/15 dark:ring-slate/20 -z-10"
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                <Icon
                  size={18}
                  strokeWidth={active ? 2.5 : 1.75}
                  className={cn(
                    'transition-all duration-200 mb-0.5',
                    active
                      ? 'text-slate -translate-y-0.5 drop-shadow-[0_2px_4px_rgba(15,118,110,0.3)] dark:drop-shadow-[0_2px_4px_rgba(45,212,191,0.3)]'
                      : 'text-ink-faint group-hover:text-ink translate-y-0',
                  )}
                />
                <span
                  className={cn(
                    'font-sans leading-none tracking-tight transition-all duration-200',
                    active ? 'text-slate font-extrabold' : 'text-ink-soft font-bold',
                  )}
                >
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </LayoutGroup>
      </div>

      {/* More Sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="more-backdrop"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => {
                setSheetOpen(false);
              }}
              className="fixed inset-0 z-[60] bg-black/30 dark:bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              key="more-sheet"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl border-t border-line/70 bg-surface/90 backdrop-blur-3xl shadow-[0_-8px_40px_rgba(13,23,44,0.2)] dark:shadow-[0_-8px_40px_rgba(0,0,0,0.6)]"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-line-strong/40" />
              </div>

              <div className="flex items-center gap-3 px-5 pt-1 pb-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-slate to-slate-soft text-[10px] font-black text-white shadow-sm ring-2 ring-white/10">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-extrabold text-ink leading-tight truncate">
                    {user?.name ?? 'Unknown'}
                  </p>
                  <p className="text-[8px] text-ink-faint truncate flex items-center gap-1 mt-0.5">
                    <Sparkles size={9} className="shrink-0" />
                    More
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                <MoreItem
                  icon={Bell}
                  label="Notifications"
                  badge={notifCount}
                  onClick={() => {
                    navigate('/notifications');
                  }}
                  active={currentPath.startsWith('/notifications')}
                />
                {user?.isOutsourcedEnabled && (
                  <MoreItem
                    icon={UserCheck}
                    label="Associate Agents"
                    onClick={() => {
                      navigate('/associate-agents');
                    }}
                    active={currentPath.startsWith('/associate-agents')}
                  />
                )}
                <MoreItem
                  icon={Upload}
                  label="Bulk Import"
                  onClick={() => {
                    navigate('/bulk-import');
                  }}
                  active={currentPath.startsWith('/bulk-import')}
                />
                <MoreItem
                  icon={Tag}
                  label="Policy Types"
                  onClick={() => {
                    navigate('/policy-types');
                  }}
                  active={currentPath === '/policy-types'}
                />
                <MoreItem
                  icon={Settings}
                  label="Settings"
                  onClick={() => {
                    navigate('/settings');
                  }}
                  active={currentPath === '/settings'}
                />
              </div>

              <div className="border-t border-line/50 px-4 py-2.5">
                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[10px] font-bold text-ink-soft hover:text-red-fg hover:bg-red-bg/30 transition-all cursor-pointer border-0"
                >
                  <LogOut size={13} />
                  {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function TabButton({
  label,
  icon: Icon,
  active,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof List;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      className="group relative flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] cursor-pointer focus:outline-none border-0"
    >
      <Icon
        size={18}
        strokeWidth={active ? 2.5 : 1.75}
        className={cn(
          'transition-all duration-200 mb-0.5',
          active
            ? 'text-slate -translate-y-0.5 drop-shadow-[0_2px_4px_rgba(15,118,110,0.3)] dark:drop-shadow-[0_2px_4px_rgba(45,212,191,0.3)]'
            : 'text-ink-faint group-hover:text-ink translate-y-0',
        )}
      />
      <span
        className={cn(
          'font-sans leading-none tracking-tight transition-all duration-200',
          active ? 'text-slate font-extrabold' : 'text-ink-soft font-bold',
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}

function FloatingAddBtn({ show, onAdd }: { show: boolean; onAdd: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="floating-add-btn"
          initial={{ opacity: 0, scale: 0.6, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 30 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={onAdd}
          className="fixed bottom-28 right-5 z-40 md:hidden flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate to-slate-soft text-white shadow-[0_8px_28px_rgba(15,118,110,0.4)] dark:shadow-[0_8px_32px_rgba(45,212,191,0.5)] ring-1 ring-white/10 cursor-pointer border-0 focus:outline-none focus:ring-2 focus:ring-slate/40"
          style={{ marginBottom: 'calc(env(safe-area-inset-bottom, 0px) - 25px)' }}
          aria-label="Add new"
        >
          <Plus size={22} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function MoreItem({
  icon: Icon,
  label,
  badge,
  onClick,
  active,
  gradient,
}: {
  icon: typeof List;
  label: string;
  badge?: number;
  onClick: () => void;
  active?: boolean;
  gradient?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 transition-all cursor-pointer border-0',
        active
          ? 'bg-slate/10 text-slate ring-1 ring-slate/20'
          : 'text-ink-soft hover:bg-paper/60 hover:text-ink',
      )}
    >
      <div
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm',
          gradient
            ? 'bg-gradient-to-br from-slate to-slate-soft text-white border-0'
            : 'bg-paper/70 border-line/30',
        )}
      >
        <Icon size={17} strokeWidth={active || gradient ? 2.5 : 1.75} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[7px] font-bold text-white shadow-sm ring-2 ring-surface">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-[8px] font-bold text-center leading-tight">{label}</span>
    </button>
  );
}

interface BottomBarProps {
  className?: string;
}
