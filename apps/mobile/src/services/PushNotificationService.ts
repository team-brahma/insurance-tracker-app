import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type Token,
  type ActionPerformed,
  type PushNotificationSchema,
} from '@capacitor/push-notifications';
import { toast } from 'sonner';
import { httpClient } from './HttpClient.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationNavigateCallback = (path: string) => void;

/**
 * Stores a navigation path when a notification tap arrives before
 * React Router's history is ready (e.g. killed-state launch).
 * AuthenticatedShell consumes this after it mounts.
 */
let pendingNavigationPath: string | null = null;

export function consumePendingNotification(): string | null {
  const path = pendingNavigationPath;
  pendingNavigationPath = null;
  return path;
}

/** Matches the data payload sent by the backend NotificationService */
interface PolicyNotificationData {
  type: 'policy';
  policyId: string;
  path?: string;
  clientName: string;
  policyType: string;
  endDate: string;
  daysLeft: string;
  remindedAt: string;
}

interface EnquiryNotificationData {
  type: 'enquiry';
  enquiryId: string;
  path?: string;
  name: string;
  policyType: string;
  remindOn: string;
  remindedAt: string;
}

type NotificationData = PolicyNotificationData | EnquiryNotificationData;

// ─── Token helpers ────────────────────────────────────────────────────────────

/**
 * Tracks the last FCM token that was already sent to the backend
 * (either via login or a prior PATCH). Used to skip redundant PATCH calls
 * when the registration listener fires with the same token after login.
 */
let lastSentToken: string | null = null;

export function setLastSentToken(token: string | null): void {
  lastSentToken = token;
}

/**
 * Sends the FCM token to the backend so the server can store it and push
 * renewal reminders to this specific device.
 * Skipped if this exact token was already sent (e.g. via login payload).
 */
async function sendTokenToBackend(fcmToken: string): Promise<void> {
  if (fcmToken === lastSentToken) return;

  try {
    await httpClient.patch('/api/v1/notifications/token', { fcmToken });
    lastSentToken = fcmToken;
    console.info('[FCM] Token registered with backend.');
  } catch (err) {
    console.error('[FCM] Failed to register token with backend:', err);
  }
}

/**
 * Retrieves the current FCM token for this device.
 * Returns null on web or if permissions were denied.
 */
export async function getFcmToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const result = await PushNotifications.checkPermissions();
    if (result.receive !== 'granted') {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== 'granted') {
        console.warn('[FCM] Notification permission denied.');
        return null;
      }
    }

    const token = await new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[FCM] Token retrieval timed out.');
        resolve(null);
      }, 8000);

      let regHandle: { remove: () => void } | null = null;
      let errHandle: { remove: () => void } | null = null;

      const settled = (value: string | null) => {
        clearTimeout(timeout);
        regHandle?.remove();
        errHandle?.remove();
        resolve(value);
      };

      // Register listeners BEFORE register() to avoid missing the event
      PushNotifications.addListener('registration', (token: Token) => {
        console.info('[FCM] Device token obtained:', token.value);
        settled(token.value);
      }).then((h) => {
        regHandle = h;
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[FCM] Registration error:', err);
        settled(null);
      }).then((h) => {
        errHandle = h;
      });

      PushNotifications.register();
      registered = true;
    });

    return token;
  } catch (err) {
    console.error('[FCM] Error getting FCM token:', err);
    return null;
  }
}

// ─── Notification data parser ─────────────────────────────────────────────────

function parseNotificationData(notification: PushNotificationSchema): NotificationData | null {
  const raw = notification.data as Record<string, unknown> | undefined;
  if (!raw || typeof raw.type !== 'string') return null;

  if (raw.type === 'policy') {
    const path = typeof raw.path === 'string' ? raw.path : null;
    return {
      type: 'policy',
      policyId: String(raw.policyId ?? ''),
      ...(path ? { path } : {}),
      clientName: String(raw.clientName ?? ''),
      policyType: String(raw.policyType ?? ''),
      endDate: String(raw.endDate ?? ''),
      daysLeft: String(raw.daysLeft ?? ''),
      remindedAt: String(raw.remindedAt ?? ''),
    };
  }

  if (raw.type === 'enquiry') {
    const path = typeof raw.path === 'string' ? raw.path : null;
    return {
      type: 'enquiry',
      enquiryId: String(raw.enquiryId ?? ''),
      ...(path ? { path } : {}),
      name: String(raw.name ?? ''),
      policyType: String(raw.policyType ?? ''),
      remindOn: String(raw.remindOn ?? ''),
      remindedAt: String(raw.remindedAt ?? ''),
    };
  }

  return null;
}

function buildNavigationPath(data: NotificationData): string {
  if (data.path) return data.path;
  if (data.type === 'policy') return `/policies/${data.policyId}`;
  if (data.type === 'enquiry') return `/enquiries/${data.enquiryId}`;
  return '/policies';
}

// ─── Main init ────────────────────────────────────────────────────────────────

let listenersAttached = false;
let registered = false;
let navigateCallback: NotificationNavigateCallback = () => {};

function setNavigate(cb: NotificationNavigateCallback): void {
  navigateCallback = cb;
}

/**
 * Initialises the push notification system.
 *
 * - Requests permission
 * - Registers the device with FCM (only on first call — getFcmToken already
 *   calls register during login, so we avoid a redundant PATCH call)
 * - Attaches listeners for foreground notifications and tap actions
 *
 * Pass a `navigate` callback (e.g. from react-router `useHistory`) so tapping
 * a notification opens the correct policy / enquiry detail page.
 *
 * Safe to call multiple times — listeners are only registered once.
 */
export async function initPushNotifications(navigate: NotificationNavigateCallback): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Always update the navigate callback so re-renders don't break navigation
  setNavigate(navigate);

  if (listenersAttached) return;
  listenersAttached = true;

  // ── Permission & registration ─────────────────────────────────────────────
  const permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive !== 'granted') {
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== 'granted') {
      console.warn('[FCM] Push notification permission denied.');
      return;
    }
  }

  if (!registered) {
    await PushNotifications.register();
    registered = true;
  }

  // ── Token registration (initial + refresh) ────────────────────────────────
  void PushNotifications.addListener('registration', (token: Token) => {
    console.info('[FCM] Token registered/refreshed:', token.value);
    void sendTokenToBackend(token.value);
  });

  void PushNotifications.addListener('registrationError', (err) => {
    console.error('[FCM] Registration error:', err);
  });

  // ── Foreground notification received ─────────────────────────────────────
  void PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      const data = parseNotificationData(notification);
      const title = notification.title ?? 'Reminder';
      const body = notification.body ?? '';

      if (data) {
        const path = buildNavigationPath(data);
        toast(title, {
          description: body,
          duration: 15000,
          action: {
            label: data.type === 'policy' ? 'View Policy' : 'View Enquiry',
            onClick: () => {
              navigateCallback(path);
            },
          },
        });
      } else {
        toast(title, { description: body, duration: 8000 });
      }
    },
  );

  // ── Notification tapped (background / killed state) ───────────────────────
  void PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      const data = parseNotificationData(action.notification);
      if (data) {
        const path = buildNavigationPath(data);
        console.info('[FCM] Notification tapped → navigating to', path);
        // Store the path as fallback in case the navigator isn't ready yet
        // (e.g. auth gate hasn't rendered AuthenticatedShell).
        pendingNavigationPath = path;
        navigateCallback(path);
      }
    },
  );
}
