import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertCircle,
  Hourglass,
  CalendarDays,
  RefreshCw,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useHistory } from 'react-router-dom';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
} from 'recharts';
import AppShellPage from '@components/layout/AppShellPage.js';
import MetricCard from '@components/ui/MetricCard.js';
import PageLoader from '@components/ui/PageLoader.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import { usePolicyStatsQuery } from '@features/policies/hooks/usePoliciesQuery.js';
import Button from '@components/ui/Button.js';
import { cn } from '@utils/Cn.js';

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
};

export default function DashboardPage() {
  const history = useHistory();
  const { data, isLoading, refetch, isRefetching } = usePolicyStatsQuery();
  const stats = data?.data;

  if (isLoading || !stats) {
    return <PageLoader variant="dashboard" />;
  }

  const renewalRate = stats.total > 0 ? Math.round((stats.renewed / stats.total) * 100) : 0;
  const activeCount = stats.total - stats.notRenewed - stats.lapsed;

  const kpis = [
    {
      key: 'total',
      label: 'Total Policies',
      value: stats.total,
      description: 'Active client portfolio',
      icon: TrendingUp,
      tone: 'accent' as const,
    },
    {
      key: 'overdue',
      label: 'Overdue Policies',
      value: stats.overdue,
      description: 'Critical action required',
      icon: AlertCircle,
      tone: 'critical' as const,
    },
    {
      key: 'due7',
      label: 'Due this week',
      value: stats.due7,
      description: 'Expiring in next 7 days',
      icon: Hourglass,
      tone: 'warning' as const,
    },
    {
      key: 'due30',
      label: 'Due this month',
      value: stats.due30,
      description: 'Expiring in next 30 days',
      icon: CalendarDays,
      tone: 'success' as const,
    },
  ];

  const statusBarData = [
    { label: 'Pending', value: stats.pending, fill: '#f59e0b', status: 'PENDING' },
    { label: 'Reminded', value: stats.reminded, fill: '#0891b2', status: 'REMINDED' },
    { label: 'Renewed', value: stats.renewed, fill: '#22c55e', status: 'RENEWED' },
    { label: 'Not Renewed', value: stats.notRenewed, fill: '#f43f5e', status: 'NOT_RENEWED' },
    { label: 'Lapsed', value: stats.lapsed, fill: '#94a3b8', status: 'LAPSED' },
    { label: 'Inactive', value: stats.inactive ?? 0, fill: '#64748b', status: 'INACTIVE' },
  ];

  const radialData = [{ name: 'Renewed', value: renewalRate, fill: 'var(--slate)' }];

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AppShellPage
      icon={TrendingUp}
      title="Portfolio Dashboard"
      subtitle="Monitor renewal pressure, conversion rate, and open risk across the book."
      actions={
        <>
          <span className="hidden rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-faint lg:inline-flex select-none">
            {todayStr}
          </span>
          <Button
            variant="secondary"
            size="md"
            loading={isRefetching}
            leftIcon={
              <RefreshCw
                size={14}
                className={cn(
                  'transition-transform duration-500 group-hover:rotate-180',
                  isRefetching && 'animate-spin',
                )}
              />
            }
            className="group font-sans border-line/60 hover:bg-paper/40 active:scale-95 shadow-sm"
            onClick={() => {
              void refetch();
            }}
          >
            <span className="hidden sm:inline">{isRefetching ? 'Syncing…' : 'Refresh'}</span>
            <span className="sm:hidden">{isRefetching ? '…' : ''}</span>
          </Button>
        </>
      }
    >
      {/* ── KPI Cards — 2-col on mobile, 4-col on md+ ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 auto-rows-fr"
      >
        {kpis.map((kpi) => (
          <motion.div key={kpi.key} variants={fadeUp}>
            <MetricCard
              label={kpi.label}
              value={kpi.value}
              description={kpi.description}
              icon={kpi.icon}
              tone={kpi.tone}
              onClick={() => {
                if (kpi.key === 'total') history.push('/policies');
                else history.push(`/policies?urgency=${kpi.key}`);
              }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Charts Row ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-5 sm:mt-6 lg:mt-8 grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[1.5fr_1fr] items-stretch"
      >
        {/* Status Mix */}
        <motion.div variants={fadeUp}>
          <SurfaceCard
            eyebrow="Operations"
            title="Renewal status mix"
            description="A quick view of where policies currently sit in the renewal workflow."
          >
            <div className="mt-2 space-y-3 sm:space-y-4">
              {statusBarData.map((s) => (
                <div
                  key={s.label}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    history.push(`/policies?renewalStatus=${s.status}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      history.push(`/policies?renewalStatus=${s.status}`);
                    }
                  }}
                  className="cursor-pointer rounded-lg outline-none"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs sm:text-sm lg:text-[15px] font-semibold text-ink-soft">
                      {s.label}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span
                        className="text-xs sm:text-sm lg:text-base font-black"
                        style={{ color: s.fill }}
                      >
                        {s.value}
                      </span>
                      <span className="text-[11px] lg:text-xs text-ink-faint">
                        {stats.total > 0 ? Math.round((s.value / stats.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 sm:h-3 lg:h-3.5 overflow-hidden rounded-full bg-paper">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: s.fill }}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${String(stats.total > 0 ? (s.value / stats.total) * 100 : 0)}%`,
                      }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Recharts horizontal bar */}
            <div className="mt-5 sm:mt-6 lg:mt-7 h-24 sm:h-28 lg:h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBarData} barCategoryGap="20%">
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'var(--ink-faint)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                    {statusBarData.map((entry, index) => (
                      // eslint-disable-next-line @typescript-eslint/no-deprecated
                      <Cell
                        key={index}
                        fill={entry.fill}
                        className="cursor-pointer"
                        onClick={() => {
                          history.push(`/policies?renewalStatus=${entry.status}`);
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SurfaceCard>
        </motion.div>

        {/* Right column */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:gap-6">
          {/* Renewal Conversion Donut */}
          <SurfaceCard
            eyebrow="Performance"
            title="Renewal conversion"
            description="Success rate across the registered policy portfolio."
            className="flex-1"
          >
            <div className="flex flex-col items-center gap-4 lg:gap-5 py-2 lg:py-3">
              {/* Radial chart — bigger on desktop */}
              <div className="relative h-32 w-32 sm:h-40 sm:w-40 lg:h-44 lg:w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="72%"
                    outerRadius="100%"
                    barSize={10}
                    data={radialData}
                    startAngle={90}
                    endAngle={90 - 360 * (renewalRate / 100)}
                  >
                    <RadialBar
                      dataKey="value"
                      background={{ fill: 'var(--paper)' }}
                      cornerRadius={8}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-ink">
                    {renewalRate}%
                  </span>
                  <span className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.22em] text-ink-faint">
                    Renewed
                  </span>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                <div className="rounded-2xl bg-paper px-3 sm:px-4 lg:px-5 py-3 lg:py-4 text-center">
                  <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.24em] text-ink-faint">
                    Active
                  </div>
                  <div className="mt-1.5 sm:mt-2 font-mono text-lg sm:text-xl lg:text-2xl font-black text-green-fg">
                    {activeCount}
                  </div>
                </div>
                <div className="rounded-2xl bg-paper px-3 sm:px-4 lg:px-5 py-3 lg:py-4 text-center">
                  <div className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.24em] text-ink-faint">
                    Lapsed
                  </div>
                  <div className="mt-1.5 sm:mt-2 font-mono text-lg sm:text-xl lg:text-2xl font-black text-red-fg">
                    {stats.lapsed}
                  </div>
                </div>
              </div>
            </div>
          </SurfaceCard>

          {/* Quick Actions */}
          <SurfaceCard
            eyebrow="Actions"
            title="Quick navigation"
            description="Move directly to the day-to-day workflow screens."
          >
            <div className="space-y-2 lg:space-y-2.5">
              {[
                { label: 'Add new policy', icon: Plus, path: '/policies/new' },
                // { label: 'View renewals list', icon: List, path: '/policies' },
                { label: 'Add new enquiry', icon: Plus, path: '/enquiries/new' },
                // { label: 'Open settings', icon: Settings, path: '/settings' },
              ].map((item) => (
                <motion.div
                  key={item.path}
                  role="button"
                  tabIndex={0}
                  whileHover={{ x: 3, backgroundColor: 'var(--paper)' }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    history.push(item.path);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      history.push(item.path);
                    }
                  }}
                  className="group flex w-full items-center justify-between rounded-2xl border border-line bg-paper/40 dark:bg-paper/20 px-3 sm:px-4 lg:px-5 py-3 sm:py-3.5 lg:py-4 text-left text-sm lg:text-[15px] font-bold text-ink-soft transition-all hover:text-ink hover:border-line-strong/80 hover:shadow-sm cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-slate/50 select-none"
                >
                  <span className="flex items-center gap-3 lg:gap-3.5">
                    <span className="flex h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 items-center justify-center rounded-xl bg-surface text-slate border border-line shadow-sm group-hover:scale-105 transition-transform">
                      <item.icon size={15} strokeWidth={2} className="lg:hidden" />
                      <item.icon size={17} strokeWidth={2} className="hidden lg:block" />
                    </span>
                    <span className="font-sans text-ink-soft group-hover:text-ink transition-colors text-sm lg:text-[15px]">
                      {item.label}
                    </span>
                  </span>
                  <ChevronRight
                    size={14}
                    className="text-ink-faint group-hover:text-ink transition-all group-hover:translate-x-0.5"
                  />
                </motion.div>
              ))}
            </div>
          </SurfaceCard>
        </motion.div>
      </motion.div>
    </AppShellPage>
  );
}
