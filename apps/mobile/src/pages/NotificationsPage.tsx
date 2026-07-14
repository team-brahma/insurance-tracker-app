import { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { IonRefresher, IonRefresherContent } from '@ionic/react';
import { useNotificationsQuery } from '@features/notifications/hooks/useNotificationsQuery.js';
import NotificationList from '@components/NotificationList.js';
import AppShellPage from '@components/layout/AppShellPage.js';
import PageLoader from '@components/ui/PageLoader.js';
import { cn } from '@utils/Cn.js';

const tabs = [
  { key: 'all' as const, label: 'All' },
  { key: 'policies' as const, label: 'Policy Renewals' },
  { key: 'enquiries' as const, label: 'Enquiry Follow-ups' },
];

export default function NotificationsPage() {
  const history = useHistory();
  const { data: notifications, isLoading, refetch } = useNotificationsQuery();
  const [activeTab, setActiveTab] = useState<'all' | 'policies' | 'enquiries'>('all');

  const searchParams = new URLSearchParams(history.location.search);
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam && (tabParam === 'all' || tabParam === 'policies' || tabParam === 'enquiries')) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const policyCount = notifications?.policies.length ?? 0;
  const enquiryCount = notifications?.enquiries.length ?? 0;
  const totalCount = notifications?.totalCount ?? 0;

  const tabCounts: Record<string, number> = {
    all: totalCount,
    policies: policyCount,
    enquiries: enquiryCount,
  };

  const subtitle =
    totalCount > 0
      ? `${String(totalCount)} upcoming reminder${totalCount === 1 ? '' : 's'}`
      : 'No pending reminders';

  function handleTabChange(key: 'all' | 'policies' | 'enquiries') {
    setActiveTab(key);
    if (key === 'all') {
      history.replace('/notifications');
    } else {
      history.replace(`/notifications?tab=${key}`);
    }
  }

  if (isLoading) return <PageLoader variant="default" />;

  return (
    <AppShellPage
      icon={Bell}
      title="Notifications"
      subtitle={subtitle}
      hero={
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1.5 pb-0.5">
            {tabs.map((tab) => {
              const isActive = tab.key === activeTab;
              const tabCount = tabCounts[tab.key];
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    handleTabChange(tab.key);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 sm:px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                    isActive
                      ? 'border-slate bg-slate text-white shadow-sm'
                      : 'border-line-strong bg-surface text-ink-soft hover:bg-paper',
                  )}
                >
                  {tab.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[9px] font-black',
                      isActive ? 'bg-white/20 text-white' : 'bg-paper text-ink-faint',
                    )}
                  >
                    {tabCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <IonRefresher
        slot="fixed"
        onIonRefresh={(event) => {
          void refetch().finally(() => {
            event.detail.complete();
          });
        }}
      >
        <IonRefresherContent />
      </IonRefresher>

      <div className="min-w-0">
        <NotificationList variant="full" filter={activeTab} />
      </div>
    </AppShellPage>
  );
}
