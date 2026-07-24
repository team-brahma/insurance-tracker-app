import { useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  List,
  Users,
  HelpCircle,
  Bell,
  BarChart2,
  Settings,
  LogOut,
  MoreVertical,
  Sparkles,
  Tag,
  Building2,
  UserCheck,
} from 'lucide-react';
import { cn } from '@utils/Cn.js';
import { useAuthStore } from '@features/auth/store/AuthStore.js';
import { useLogoutMutation } from '@features/auth/hooks/useAuth.js';
import { useNotificationCountQuery } from '@features/notifications/hooks/useNotificationCountQuery.js';
import { initials } from '@repo/utils';

interface TabItem {
  label: string;
  path: string;
  icon: typeof List;
  isActive: () => boolean;
}

const sheetVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 35, mass: 1 },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export default function FloatingNav() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useLocation();
  const history = useHistory();
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogoutMutation();
  const { data: notifCountData } = useNotificationCountQuery();
  const notifCount = typeof notifCountData === 'number' ? notifCountData : (notifCountData?.totalCount ?? 0);
  const currentPath = location.pathname;
  const userInitials = user ? initials(user.name) : '??';

  const isFormPage =
    currentPath === '/policies/new' ||
    currentPath.includes('/edit') ||
    currentPath === '/enquiries/new' ||
    currentPath === '/clients/new';

  const tabs: TabItem[] = [
    {
      label: 'Renewals',
      path: '/policies',
      icon: List,
      isActive: () =>
        currentPath.startsWith('/policies') &&
        currentPath !== '/policies/new' &&
        !currentPath.includes('/edit'),
    },
    {
      label: 'Clients',
      path: '/clients',
      icon: Users,
      isActive: () =>
        currentPath.startsWith('/clients') &&
        currentPath !== '/clients/new' &&
        !currentPath.includes('/edit'),
    },
    {
      label: 'Enquiries',
      path: '/enquiries',
      icon: HelpCircle,
      isActive: () =>
        currentPath.startsWith('/enquiries') &&
        currentPath !== '/enquiries/new' &&
        !currentPath.includes('/edit'),
    },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: Bell,
      isActive: () => currentPath.startsWith('/notifications'),
    },
  ];

  const shelfItems: TabItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: BarChart2,
      isActive: () => currentPath === '/dashboard',
    },
    {
      label: 'Policy Types',
      path: '/policy-types',
      icon: Tag,
      isActive: () => currentPath === '/policy-types',
    },
    {
      label: 'Providers',
      path: '/insurance-providers',
      icon: Building2,
      isActive: () => currentPath === '/insurance-providers',
    },
    {
      label: 'Associate Agents',
      path: '/associate-agents',
      icon: UserCheck,
      isActive: () => currentPath.startsWith('/associate-agents'),
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      isActive: () => currentPath === '/settings',
    },
  ];

  function navigate(path: string) {
    setSheetOpen(false);
    history.push(path);
  }

  function handleLogout() {
    setSheetOpen(false);
    void logoutMutation.mutateAsync().then(() => {
      history.push('/login');
    });
  }

  if (isFormPage || user?.role === 'ADMIN') return null;

  const currentTab = tabs.find((t) => t.isActive());

  return (
    <>
      {/* Bottom Pill Bar */}
      <nav
        className={cn(
          'fixed bottom-5 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-1 px-2 py-2 rounded-2xl',
          'bg-surface/80 backdrop-blur-2xl',
          'border border-line/50 shadow-[0_8px_32px_rgba(13,23,44,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
        )}
        style={{ marginBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}
      >
        {tabs.map((tab) => {
          const active = tab.isActive();
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => {
                navigate(tab.path);
              }}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer border-0',
                active
                  ? 'bg-slate/10 text-slate'
                  : 'text-ink-faint hover:text-ink hover:bg-paper/50',
              )}
              aria-label={tab.label}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={active ? 2.5 : 1.75} />
                {tab.label === 'Notifications' && notifCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[6px] font-bold text-white shadow-sm ring-2 ring-surface">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[7px] font-bold leading-none tracking-tight',
                  active ? 'text-slate' : 'text-ink-faint',
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More trigger */}
        <button
          onClick={() => {
            setSheetOpen(true);
          }}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl text-ink-faint hover:text-ink hover:bg-paper/50 transition-all cursor-pointer border-0"
          aria-label="More options"
        >
          <MoreVertical size={18} strokeWidth={1.75} />
          <span className="text-[7px] font-bold leading-none tracking-tight text-ink-faint">
            More
          </span>
        </button>
      </nav>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sheet-backdrop"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => {
                setSheetOpen(false);
              }}
              className="fixed inset-0 z-[60] bg-black/30 dark:bg-black/50 backdrop-blur-sm"
            />

            {/* Sheet panel */}
            <motion.div
              key="sheet-panel"
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                'fixed bottom-0 left-0 right-0 z-[70]',
                'rounded-t-2xl border-t border-line/70',
                'bg-surface/90 backdrop-blur-3xl',
                'shadow-[0_-8px_40px_rgba(13,23,44,0.2)] dark:shadow-[0_-8px_40px_rgba(0,0,0,0.6)]',
              )}
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-line-strong/40" />
              </div>

              {/* Header */}
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
                    {currentTab ? currentTab.label : 'Navigation'}
                  </p>
                </div>
                {currentTab && (
                  <span className="shrink-0 rounded-full bg-slate/10 dark:bg-slate/20 px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider text-slate">
                    {currentTab.label}
                  </span>
                )}
              </div>

              {/* Grid */}
              <div className="px-4 pb-2">
                <div className="grid grid-cols-3 gap-2">
                  {shelfItems.map((item) => {
                    const active = item.isActive();
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 transition-all cursor-pointer border-0',
                          active
                            ? 'bg-slate/10 text-slate ring-1 ring-slate/20'
                            : 'text-ink-soft hover:bg-paper/60 hover:text-ink',
                        )}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper/70 border border-line/30 shadow-sm">
                          <Icon size={17} strokeWidth={active ? 2.5 : 1.75} />
                        </div>
                        <span className="text-[8px] font-bold text-center leading-tight">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sign out */}
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
