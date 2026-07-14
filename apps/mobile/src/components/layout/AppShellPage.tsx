import type { ComponentType, ReactNode } from 'react';
import { IonContent, IonPage, IonHeader, IonToolbar, IonFooter } from '@ionic/react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@utils/Cn.js';
import BottomBar from '@components/BottomBar.js';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface AppShellPageProps {
  icon?: ComponentType<LucideProps>;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  hero?: ReactNode;
  /** Optional breadcrumb trail, shown above the title on tablet+ */
  breadcrumb?: BreadcrumbItem[];
  children: ReactNode;
  contentClassName?: string;
  /** If true, limits content to a narrower max-width (for detail/form pages) */
  narrow?: boolean;
  /** Optional footer component, rendered outside IonContent */
  footer?: ReactNode;
}

export default function AppShellPage({
  icon: Icon,
  title,
  subtitle,
  actions,
  hero,
  breadcrumb,
  children,
  contentClassName,
  narrow = false,
  footer,
}: AppShellPageProps) {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="ion-no-padding bg-surface/85 backdrop-blur-xl border-b border-line/80">
          <div
            className={cn(
              'mx-auto flex flex-col gap-3 px-4 py-2.5 sm:px-8 sm:py-4 lg:px-10',
              narrow ? 'max-w-5xl' : 'max-w-7xl',
            )}
          >
            {/* Breadcrumb — tablet+ only */}
            {breadcrumb && breadcrumb.length > 0 && (
              <nav
                className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-ink-faint"
                aria-label="Breadcrumb"
              >
                {breadcrumb.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-line-strong">›</span>}
                    {crumb.onClick ? (
                      <button
                        type="button"
                        onClick={crumb.onClick}
                        className="hover:text-ink transition-colors cursor-pointer"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="text-ink-soft">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}

            {/* Title row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                  <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-slate text-white shadow-[0_6px_20px_rgba(15,118,110,0.25)] lg:h-12 lg:w-12 lg:rounded-[16px]">
                    <Icon size={18} strokeWidth={2} className="lg:hidden" />
                    <Icon size={20} strokeWidth={2} className="hidden lg:block" />
                  </div>
                )}
                <div className="min-w-0 text-left">
                  <h1 className="text-[1.2rem] sm:text-[1.3rem] lg:text-[1.6rem] font-black tracking-tight text-ink leading-tight truncate !mt-0 lg:!mt-2">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-0.5 text-xs sm:text-sm text-ink-faint line-clamp-1 sm:line-clamp-none">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions — always right-aligned */}
              {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>

            {/* Hero slot (search bar, tab pills, etc.) */}
            {hero}
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding-bottom">
        <div className="min-h-full bg-body-bg">
          {/* ── Page body ── */}
          <div
            className={cn(
              'mx-auto px-4 pt-4 sm:px-8 md:pt-6 lg:px-10',
              narrow ? 'max-w-5xl' : 'max-w-7xl',
              contentClassName,
            )}
          >
            {children}
          </div>
        </div>
      </IonContent>
      {footer ?? (
        <IonFooter className="ion-no-border ion-no-padding bg-transparent md:!hidden">
          <div
            className="px-4 pt-2"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <BottomBar />
          </div>
        </IonFooter>
      )}
    </IonPage>
  );
}
