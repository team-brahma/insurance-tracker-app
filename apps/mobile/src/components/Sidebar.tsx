import { useLocation, useHistory } from 'react-router-dom';
import {
  BarChart2,
  List,
  Settings,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Users,
  Tag,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MotionStyle } from 'framer-motion';
import { usePolicyStatsQuery } from '@features/policies/hooks/usePoliciesQuery.js';
import { useAuthStore } from '@features/auth/store/AuthStore.js';
import { cn } from '@utils/Cn.js';
import Tooltip from '@components/ui/Tooltip.js';
import ProfileDropdown from '@components/ProfileDropdown.js';

interface SidebarProps {
  className?: string;
  style?: MotionStyle;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({
  className = '',
  style = {},
  collapsed = false,
  onToggle,
}: SidebarProps) {
  const location = useLocation();
  const history = useHistory();
  const user = useAuthStore((s) => s.user);
  const { data: statsData } = usePolicyStatsQuery({ enabled: user?.role !== 'ADMIN' });
  const stats = statsData?.data;

  const menuItems =
    user?.role === 'ADMIN'
      ? [{ label: 'Users', path: '/users', icon: ShieldCheck }]
      : [
          { label: 'Dashboard', path: '/dashboard', icon: BarChart2 },
          { label: 'Renewals', path: '/policies', icon: List },
          { label: 'Clients', path: '/clients', icon: Users },
          { label: 'Enquiries', path: '/enquiries', icon: HelpCircle },
          { label: 'Policy Types', path: '/policy-types', icon: Tag },
          { label: 'Bulk Import', path: '/bulk-import', icon: Upload },
          { label: 'Settings', path: '/settings', icon: Settings },
        ];

  const currentPath = location.pathname;

  function isActive(path: string) {
    if (path === '/policies') return currentPath.startsWith('/policies');
    if (path === '/clients') return currentPath.startsWith('/clients');
    if (path === '/enquiries') return currentPath.startsWith('/enquiries');
    if (path === '/policy-types') return currentPath.startsWith('/policy-types');
    if (path === '/bulk-import') return currentPath.startsWith('/bulk-import');
    return currentPath === path;
  }

  return (
    <motion.div
      layout
      style={style}
      transition={{ type: 'spring', stiffness: 400, damping: 38 }}
      className={cn(
        'flex h-full flex-col border-r border-line bg-surface/90 select-none backdrop-blur-xl flex-shrink-0 z-30 overflow-hidden',
        className,
      )}
    >
      {/* Branding */}
      <div
        className={cn(
          'flex items-center border-b border-line flex-shrink-0 transition-all duration-300',
          collapsed ? 'justify-center px-3 py-4' : 'gap-3 px-5 py-5',
        )}
      >
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-slate text-white shadow-[0_8px_24px_rgba(15,118,110,0.30)] dark:shadow-[0_8px_24px_rgba(45,212,191,0.25)] cursor-pointer transition-transform hover:scale-105',
          )}
        >
          <ShieldCheck size={20} strokeWidth={2} />
        </button>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="brand-text"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="text-left overflow-hidden"
            >
              <h1 className="font-sans text-[15px] font-black tracking-tight text-ink leading-none whitespace-nowrap">
                InsurTrack Pro
              </h1>
              <span className="mt-1.5 inline-block rounded-full bg-slate/10 dark:bg-slate/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate">
                {user?.role === 'ADMIN' ? 'Admin Portal' : 'Agent Portal'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className={cn('custom-scroll flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        {!collapsed && (
          <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.22em] text-ink-faint select-none">
            Main Menu
          </p>
        )}
        <div className="space-y-1.5">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            const btn = (
              <motion.div
                key={item.label}
                role="button"
                tabIndex={0}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  history.push(item.path);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    history.push(item.path);
                  }
                }}
                className={cn(
                  'group relative flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-semibold transition-all cursor-pointer text-left focus:outline-none border border-transparent select-none flex-shrink-0',
                  collapsed ? 'justify-center' : '',
                  active
                    ? 'text-slate bg-slate/10 dark:bg-slate/20 border-slate/15 dark:border-slate/30 shadow-sm'
                    : 'text-ink-soft hover:bg-paper/70 hover:text-ink',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active-line"
                    className="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-r-full bg-slate"
                    initial={{ opacity: 0, scaleY: 0.5 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.5 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  size={18}
                  strokeWidth={active ? 2.25 : 1.75}
                  className={cn(
                    'shrink-0 transition-transform group-hover:scale-110',
                    active ? 'text-slate' : 'text-ink-faint group-hover:text-ink',
                  )}
                />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key="nav-label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.16 }}
                      className="flex-1 leading-none overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!collapsed && active && (
                  <ChevronRight size={12} className="text-slate/50 shrink-0" />
                )}
              </motion.div>
            );

            return collapsed ? (
              <Tooltip key={item.label} content={item.label} side="right">
                {btn}
              </Tooltip>
            ) : (
              <div key={item.label}>{btn}</div>
            );
          })}
        </div>
      </nav>

      {/* Live Stats Panel */}
      <AnimatePresence initial={false}>
        {!collapsed && stats && (
          <motion.div
            key="stats-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mx-3.5 mb-4 rounded-2xl border border-line bg-paper/40 dark:bg-paper/20 backdrop-blur-md p-3.5 text-left flex-shrink-0 overflow-hidden"
          >
            <p className="mb-2.5 text-[9px] font-bold uppercase tracking-[0.22em] text-ink-faint">
              Live Status
            </p>
            <div className="space-y-2">
              <StatusRow label="Overdue" value={stats.overdue} tone="red" />
              <StatusRow label="Due 7d" value={stats.due7} tone="amber" />
              <StatusRow label="Due 30d" value={stats.due30} tone="green" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Footer */}
      <div
        className={cn(
          'border-t border-line bg-paper/20 flex-shrink-0',
          collapsed ? 'flex flex-col items-center gap-2 p-2' : 'p-3.5',
        )}
      >
        {collapsed ? (
          <Tooltip content={user?.name ?? 'User'} side="right">
            <div>
              <ProfileDropdown collapsed />
            </div>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 p-2.5 rounded-xl border border-line/50 bg-surface/50 dark:bg-paper/30 backdrop-blur-md shadow-sm">
            <ProfileDropdown />
            <div className="flex-1 min-w-0 text-left pointer-events-none">
              <p className="text-[11px] font-extrabold text-ink leading-tight truncate">
                {user?.name ?? 'Unknown'}
              </p>
              <p className="text-[9px] text-ink-faint truncate mt-0.5">{user?.email ?? ''}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'red' | 'amber' | 'green';
}) {
  const dotColor = { red: 'bg-red-edge', amber: 'bg-amber-edge', green: 'bg-green-edge' }[tone];
  const badgeClass = {
    red: 'bg-red-bg text-red-fg border-red-edge/15',
    amber: 'bg-amber-bg text-amber-fg border-amber-edge/15',
    green: 'bg-green-bg text-green-fg border-green-edge/15',
  }[tone];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[11px] text-ink-soft">
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
        {label}
      </div>
      <span
        className={cn(
          'rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold leading-none',
          badgeClass,
        )}
      >
        {value}
      </span>
    </div>
  );
}
