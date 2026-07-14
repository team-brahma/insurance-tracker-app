import { IonContent, IonPage, IonHeader, IonToolbar } from '@ionic/react';
import { PolicyCardSkeleton, MetricCardSkeleton } from './Skeleton.js';

interface PageLoaderProps {
  message?: string;
  variant?: 'default' | 'list' | 'dashboard';
}

export default function PageLoader({ message, variant = 'default' }: PageLoaderProps) {
  if (variant === 'list') {
    return (
      <IonPage>
        <IonHeader className="ion-no-border" style={{ paddingTop: 'var(--safe-area-top)' }}>
          <IonToolbar className="ion-no-padding border-b border-line/80 bg-surface/75 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-5 py-5 lg:px-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="skeleton h-10 w-10 rounded-2xl" />
                <div className="space-y-2">
                  <div className="skeleton h-5 w-40" />
                  <div className="skeleton h-3 w-64" />
                </div>
              </div>
              <div className="skeleton h-12 w-full rounded-[22px]" />
            </div>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding-bottom">
          <div
            className="min-h-full bg-body-bg"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="mx-auto max-w-7xl px-5 pt-6 pb-24 lg:px-8">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PolicyCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (variant === 'dashboard') {
    return (
      <IonPage>
        <IonHeader className="ion-no-border" style={{ paddingTop: 'var(--safe-area-top)' }}>
          <IonToolbar className="ion-no-padding border-b border-line/80 bg-surface/75 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-5 py-5 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="skeleton h-10 w-10 rounded-2xl" />
                <div className="space-y-2">
                  <div className="skeleton h-5 w-44" />
                  <div className="skeleton h-3 w-72" />
                </div>
              </div>
            </div>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding-bottom">
          <div
            className="min-h-full bg-body-bg"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="mx-auto max-w-7xl px-5 pt-6 pb-24 lg:px-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <MetricCardSkeleton key={i} />
                ))}
              </div>
              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="skeleton h-72 rounded-[28px]" />
                <div className="skeleton h-72 rounded-[28px]" />
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="ion-padding-bottom">
        <div
          className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center"
          style={{
            paddingTop: 'var(--safe-area-top)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div className="app-spinner" aria-hidden="true" />
          {message && (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-ink">{message}</p>
              <p className="text-xs text-ink-faint">
                Preparing the latest renewal data and layout.
              </p>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
