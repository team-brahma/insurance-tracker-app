import { useEffect, useState, useRef } from 'react';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Switch, Route, Redirect, useLocation, useHistory } from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster, toast } from 'sonner';
import { TooltipProvider } from '@components/ui/Tooltip.js';
import { useAuthStore } from '@features/auth/store/AuthStore.js';
import { useThemeStore } from '@features/settings/store/ThemeStore.js';
import { settingsService } from '@features/policies/services/SettingsService.js';
import { useMeQuery } from '@features/auth/hooks/useAuth.js';
import { useMinWidth } from '@hooks/useMinWidth.js';
import {
  initPushNotifications,
  consumePendingNotification,
} from '@services/PushNotificationService.js';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@styles/global.css';

import { AppRoutes } from '@routes/index.js';
import Sidebar from '@components/Sidebar.js';

import LoginPage from '@pages/LoginPage.js';

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      showToast?: boolean;
      errorMessage?: string;
    };
    mutationMeta: {
      showToast?: boolean;
      successMessage?: string | ((variables: any, data: any) => string);
      errorMessage?: string | ((variables: any, error: any) => string);
    };
  }
}

setupIonicReact({
  mode: 'md',
  animated: true,
  rippleEffect: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.showToast === false) return;

      const queryKey = query.queryKey;
      if (queryKey[0] === 'auth' && queryKey[1] === 'me') {
        return;
      }

      const message = error instanceof Error ? error.message : 'An error occurred';
      toast.error(message, {
        description: query.meta?.errorMessage,
      });
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (data, variables, _context, mutation) => {
      const successMessage = mutation.meta?.successMessage;
      if (successMessage) {
        const text =
          typeof successMessage === 'function' ? successMessage(variables, data) : successMessage;
        if (text) {
          toast.success(text);
        }
      }
    },
    onError: (error, variables, _context, mutation) => {
      if (mutation.meta?.showToast === false) return;

      const message = error instanceof Error ? error.message : 'An error occurred';
      const errorMessage = mutation.meta?.errorMessage;
      const text =
        typeof errorMessage === 'function'
          ? errorMessage(variables, error)
          : errorMessage || message;
      toast.error(text);
    },
  }),
});

function AuthenticatedShell() {
  const history = useHistory();

  const isTablet = useMinWidth(768);
  const isDesktop = useMinWidth(1024);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Initialise push notifications once on native — navigates to policy/enquiry
  // detail page when the agent taps a renewal reminder notification.
  useEffect(() => {
    void initPushNotifications((path) => {
      history.push(path);
    });
  }, [history]);

  // Consume any pending notification navigation path that was stored before
  // the auth gate rendered this shell (e.g. killed-state launch).
  useEffect(() => {
    const pendingPath = consumePendingNotification();
    if (pendingPath) {
      history.push(pendingPath);
    }
  }, [history]);

  // Handle deep links: app opened from killed state via notification intent,
  // or custom URL scheme deep links while the app is already running.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const setup = async () => {
      const launchUrl = await CapApp.getLaunchUrl();
      if (launchUrl?.url) {
        const url = new URL(launchUrl.url);
        history.push(url.pathname + url.search);
      }

      await CapApp.addListener('appUrlOpen', (data) => {
        const url = new URL(data.url);
        history.push(url.pathname + url.search);
      });
    };

    void setup();
  }, [history]);

  useEffect(() => {
    if (isDesktop) setSidebarCollapsed(false);
  }, [isDesktop]);

  const showSidebar = isTablet;
  const sidebarWidth = sidebarCollapsed ? 64 : 256;

  return (
    <div className="flex h-full w-full overflow-hidden bg-body-bg">
      {showSidebar && (
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => {
            setSidebarCollapsed((v) => !v);
          }}
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
          className="flex flex-col bg-surface border-r border-line h-full flex-shrink-0"
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        <IonRouterOutlet id="main-content">
          <AppRoutes />
        </IonRouterOutlet>
      </div>
    </div>
  );
}

function ThemeManager() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    let isDark = false;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'system') {
        isDark = mediaQuery.matches;
      } else {
        isDark = false;
      }
      document.documentElement.classList.toggle('dark', isDark);

      if (Capacitor.isNativePlatform()) {
        try {
          void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
          if (Capacitor.getPlatform() === 'android') {
            void StatusBar.setOverlaysWebView({ overlay: false });
          }
          void StatusBar.setBackgroundColor({ color: isDark ? '#0c1624' : '#ffffff' });
        } catch (error) {
          console.error('[StatusBar] Failed to configure status bar:', error);
        }
      }
    };

    updateTheme();

    if (theme === 'system') {
      mediaQuery.addEventListener('change', updateTheme);
      return () => {
        mediaQuery.removeEventListener('change', updateTheme);
      };
    }
    return undefined;
  }, [theme]);

  return null;
}

function AuthGate() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const location = useLocation();

  const prevAuthRef = useRef(isAuthenticated);
  const prevUserIdRef = useRef(userId);

  useEffect(() => {
    // Clear query cache when authentication state changes to prevent caching across logins, but not on initial mount
    if (prevAuthRef.current !== isAuthenticated || prevUserIdRef.current !== userId) {
      queryClient.clear();
      prevAuthRef.current = isAuthenticated;
      prevUserIdRef.current = userId;

      // Sync theme from server once on login (false -> true), never on reload
      if (isAuthenticated && user?.role !== 'ADMIN') {
        settingsService
          .get()
          .then((res) => {
            const serverTheme: string = res.data.theme;
            if (serverTheme !== useThemeStore.getState().theme) {
              useThemeStore.getState().setTheme(serverTheme as 'light' | 'dark' | 'system');
            }
          })
          .catch(() => undefined);
      }
    }
  }, [isAuthenticated, userId, user?.role, queryClient]);

  // Query me API to verify session in background, using TanStack Query
  useMeQuery(isAuthenticated && user?.role !== 'ADMIN');

  if (isAuthenticated) {
    if (location.pathname === '/login' || location.pathname === '/register') {
      return <Redirect to={user?.role === 'ADMIN' ? '/users' : '/policies'} />;
    }
    return <AuthenticatedShell />;
  }

  return (
    <Switch>
      <Route exact path="/login" component={LoginPage} />
      <Route path="*" render={() => <Redirect to="/login" />} />
    </Switch>
  );
}

export default function App() {
  const exitAppRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = (ev: Event) => {
      const backButtonEvent = ev as CustomEvent<{
        register: (priority: number, handler: (processNextHandler: () => void) => void) => void;
      }>;
      backButtonEvent.detail.register(10, (processNextHandler: () => void) => {
        const path = window.location.pathname;
        const rootPaths = [
          '/policies',
          '/users',
          '/login',
          '/dashboard',
          '/enquiries',
          '/settings',
        ];
        if (rootPaths.includes(path)) {
          if (exitAppRef.current) {
            void CapApp.exitApp();
          } else {
            exitAppRef.current = true;
            toast.warning('Press back again to exit', {
              duration: 2000,
              position: 'bottom-center',
            });
            setTimeout(() => {
              exitAppRef.current = false;
            }, 2000);
          }
        } else {
          processNextHandler();
        }
      });
    };

    document.addEventListener('ionBackButton', handleBackButton);
    return () => {
      document.removeEventListener('ionBackButton', handleBackButton);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <IonApp>
          <IonReactRouter>
            <ThemeManager />
            <AuthGate />
          </IonReactRouter>

          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={15000}
            toastOptions={{
              style: {
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '13px',
              },
            }}
          />
        </IonApp>
      </TooltipProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  );
}
