import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Settings, AlarmClock, Bell, Palette, Shield, UserCheck, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import AppShellPage from '@components/layout/AppShellPage.js';
import SurfaceCard from '@components/ui/SurfaceCard.js';
import Select from '@components/ui/Select.js';
import Button from '@components/ui/Button.js';
import PageLoader from '@components/ui/PageLoader.js';
import {
  useSettingsQuery,
  useUpdateSettingsMutation,
} from '@features/policies/hooks/useSettingsQuery.js';
import { useThemeStore } from '@features/settings/store/ThemeStore.js';
import type { Theme } from '@features/settings/store/ThemeStore.js';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
};

const firstAlertOptions = [3, 5, 7, 10, 14].map((v) => ({
  value: String(v),
  label: `${String(v)} days`,
}));
const secondAlertOptions = [1, 2, 3].map((v) => ({
  value: String(v),
  label: `${String(v)} day${v > 1 ? 's' : ''}`,
}));
const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const timeOptions = Array.from({ length: 24 }).flatMap((_, h) => {
  const hourStr = String(h).padStart(2, '0');
  const labelHour = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return [
    { value: `${hourStr}:00`, label: `${String(labelHour)}:00 ${ampm}` },
    { value: `${hourStr}:30`, label: `${String(labelHour)}:30 ${ampm}` },
  ];
});

export default function SettingsPage() {
  const history = useHistory();
  const { data: settingsData, isLoading } = useSettingsQuery();
  const updateMutation = useUpdateSettingsMutation();
  const setStoredTheme = useThemeStore((s) => s.setTheme);

  const settingsObj = settingsData?.data;

  const [offsets, setOffsets] = useState<number[]>([7, 1]);
  const [theme, setTheme] = useState('light');
  const [reminderTime, setReminderTime] = useState('09:30');

  useEffect(() => {
    if (settingsObj) {
      setOffsets(settingsObj.reminderOffsets);
      setTheme(settingsObj.theme);
      setReminderTime(settingsObj.reminderTime);
    }
  }, [settingsObj]);

  function saveReminderTime(nextTime: string) {
    setReminderTime(nextTime);
    updateMutation.mutate({ reminderTime: nextTime });
  }

  function saveOffsets(first: number, second: number) {
    const nextOffsets = [first, second];
    setOffsets(nextOffsets);
    updateMutation.mutate({ reminderOffsets: nextOffsets });
  }

  function saveTheme(nextTheme: string) {
    setTheme(nextTheme);
    setStoredTheme(nextTheme as Theme);
    updateMutation.mutate({ theme: nextTheme });
  }

  if (isLoading) return <PageLoader variant="default" />;

  return (
    <AppShellPage
      icon={Settings}
      title="System Settings"
      subtitle="Control reminder timing, workspace appearance, and secure access preferences."
    >
      {/* Settings cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="mt-5 sm:mt-6 lg:mt-8 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 items-stretch"
      >
        {/* Reminder cadence */}
        <motion.div variants={fadeUp}>
          <SurfaceCard
            eyebrow="Automation"
            title="Reminder cadence"
            description="Keep reminder timing predictable across the renewal workflow."
          >
            <div className="space-y-3">
              <SettingsRow
                icon={<Bell size={16} className="text-slate" />}
                title="First renewal alert"
                description="Initial reminder before the policy end date."
              >
                <Select
                  value={String(offsets[0] ?? 7)}
                  onValueChange={(v) => {
                    saveOffsets(Number(v), offsets[1] ?? 1);
                  }}
                  options={firstAlertOptions}
                  className="w-28"
                />
              </SettingsRow>

              <SettingsRow
                icon={<Bell size={16} className="text-amber-fg" />}
                title="Final renewal alert"
                description="Last escalation before expiry."
              >
                <Select
                  value={String(offsets[1] ?? 1)}
                  onValueChange={(v) => {
                    saveOffsets(offsets[0] ?? 7, Number(v));
                  }}
                  options={secondAlertOptions}
                  className="w-28"
                />
              </SettingsRow>

              <SettingsRow
                icon={<AlarmClock size={16} className="text-indigo-500" />}
                title="Renewal reminder time"
                description="Time of day when alerts will be sent."
              >
                <Select
                  value={reminderTime}
                  onValueChange={saveReminderTime}
                  options={timeOptions}
                  className="w-32"
                />
              </SettingsRow>
            </div>
          </SurfaceCard>
          {/* Info card */}
          <SurfaceCard className=" mt-4 border-dashed bg-paper/70">
            <div className="flex items-start gap-3 text-left">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-slate border border-line">
                <Shield size={16} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">Server-backed preferences</p>
                <p className="mt-1 text-sm leading-6 text-ink-faint">
                  Reminder offsets and theme changes sync to the backend immediately so the wider
                  workflow stays aligned.
                </p>
              </div>
            </div>
          </SurfaceCard>
        </motion.div>

        {/* Right column */}
        <motion.div variants={fadeUp}>
          {/* Appearance */}
          <SurfaceCard
            eyebrow="Workspace"
            title="Appearance & Master Data"
            description="Choose how the app renders and manage associate agent profiles."
          >
            <div className="space-y-3">
              <SettingsRow
                icon={<Palette size={16} className="text-violet-500" />}
                title="Application theme"
                description="Switch between light, dark, or system sync."
              >
                <Select
                  value={theme}
                  onValueChange={saveTheme}
                  options={themeOptions}
                  className="w-32"
                />
              </SettingsRow>

              <SettingsRow
                icon={<UserCheck size={16} className="text-purple-500" />}
                title="Associate Agents"
                description="Manage external partner agents who outsource policies to you."
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => history.push('/associate-agents')}
                  className="gap-1 font-semibold"
                >
                  <span>Manage</span>
                  <ChevronRight size={14} />
                </Button>
              </SettingsRow>
            </div>
          </SurfaceCard>
        </motion.div>
      </motion.div>

      {/* Sign out */}
      {/* <motion.div variants={fadeUp} initial="hidden" animate="show" className="mt-6 sm:mt-8 hidden md:block">
        <SurfaceCard
          eyebrow="Account"
          title="Sign out"
          description="End your current session. You'll be redirected to the login screen."
        >
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            onClick={() => {
              void logoutMutation.mutateAsync().then(() => {
                history.push('/login');
              });
            }}
            loading={logoutMutation.isPending}
          >
            <LogOut size={16} className="mr-2" />
            {logoutMutation.isPending ? 'Signing out...' : 'Sign out'}
          </Button>
        </SurfaceCard>
      </motion.div> */}
    </AppShellPage>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl bg-paper/80 px-4 py-4">
      <div className="flex items-center gap-3 text-left min-w-0 flex-1">
        <span className="shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{title}</p>
          <p className="mt-0.5 text-xs text-ink-faint">{description}</p>
        </div>
      </div>
      <div className="shrink-0 self-end sm:self-auto">{children}</div>
    </div>
  );
}
