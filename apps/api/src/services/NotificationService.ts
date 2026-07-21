import { initializeApp, cert, getApp } from 'firebase-admin/app';
import type { App, ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getDb } from '@database/index.js';
import { appConfig } from '@config/index.js';

let initialized = false;

function getFirebaseApp(): App | null {
  if (initialized) return getApp();

  const serviceAccountJson = appConfig.firebase.serviceAccountJson;
  if (!serviceAccountJson) {
    console.warn(
      '[FCM] FIREBASE_SERVICE_ACCOUNT_JSON is not set - push notifications are disabled.',
    );
    return null;
  }

  try {
    let serviceAccount: ServiceAccount;
    // Match escaped quotes: \"private_key\": \"...\" or \"private_key\":\"...\"
    const regex = /\\"private_key\\":\s*\\"(.*?)\\"/;
    const match = regex.exec(serviceAccountJson);
    if (match?.[1]) {
      const rawPrivateKey = match[1];
      const placeholder = '@@PRIVATE_KEY_PLACEHOLDER@@';
      const rawWithPlaceholder = serviceAccountJson.replace(rawPrivateKey, placeholder);

      const cleanedWithPlaceholder = rawWithPlaceholder.replace(/\\n/g, '\n').replace(/\\"/g, '"');

      serviceAccount = JSON.parse(cleanedWithPlaceholder) as ServiceAccount;
      // Convert \n (backslash + n) in the private key to actual newlines for Firebase
      serviceAccount.privateKey = rawPrivateKey.replace(/\\n/g, '\n');
      (serviceAccount as ServiceAccount & { private_key?: string }).private_key =
        rawPrivateKey.replace(/\\n/g, '\n');
    } else {
      // Fallback if the regex doesn't match
      const cleanedJson = serviceAccountJson.replace(/\\n/g, '\n').replace(/\\"/g, '"');
      serviceAccount = JSON.parse(cleanedJson) as ServiceAccount;
    }

    initializeApp({ credential: cert(serviceAccount) });
    initialized = true;
    console.info('[FCM] Firebase Admin SDK initialized.');
    return getApp();
  } catch (err) {
    console.error('[FCM] Failed to initialize Firebase Admin SDK:', err);
    return null;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationJobSummary {
  agentsMatched: number;
  policyCandidates: number;
  policySent: number;
  policyFailed: number;
  enquiryCandidates: number;
  enquirySent: number;
  enquiryFailed: number;
  errors: string[];
}

export async function sendPushNotification(
  fcmToken: string,
  payload: PushPayload,
): Promise<PushSendResult> {
  const app = getFirebaseApp();
  if (!app) {
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const messaging = getMessaging(app);
    const messageId = await messaging.send({
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'policy_reminders',
        },
      },
    });

    return { success: true, messageId };
  } catch (err) {
    console.error('[FCM] Failed to send push notification to token:', fcmToken, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown FCM error',
    };
  }
}

export async function runRenewalNotificationJob(
  targetTime?: string,
  bypassLastReminded = false,
): Promise<NotificationJobSummary> {
  const db = getDb();
  const app = getFirebaseApp();
  const summary: NotificationJobSummary = {
    agentsMatched: 0,
    policyCandidates: 0,
    policySent: 0,
    policyFailed: 0,
    enquiryCandidates: 0,
    enquirySent: 0,
    enquiryFailed: 0,
    errors: [],
  };

  if (!app) {
    console.warn('[FCM] Skipping renewal notification job - Firebase not configured.');
    summary.errors.push('Firebase not configured');
    return summary;
  }

  const agents = await db.user.findMany({
    where: { role: 'AGENT', fcmToken: { not: null } },
    include: { settings: true },
  });

  const filteredAgents = targetTime
    ? agents.filter((agent) => (agent.settings?.reminderTime ?? '09:30') === targetTime)
    : agents;
  summary.agentsMatched = filteredAgents.length;

  if (filteredAgents.length === 0) {
    return summary;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  console.info(
    '[FCM] Running renewal notification job for',
    today.toDateString(),
    targetTime ? `at scheduled time ${targetTime} (${filteredAgents.length} agents matching)` : '',
  );

  for (const agent of filteredAgents) {
    const fcmToken = agent.fcmToken!;
    const offsets: number[] = Array.isArray(agent.settings?.reminderOffsets)
      ? (agent.settings.reminderOffsets as number[])
      : [7, 1, 0];

    const policies = await db.policy.findMany({
      where: {
        agentId: agent.id,
        renewalStatus: { in: ['PENDING', 'REMINDED'] },
      },
      include: { client: true, policyType: true },
    });

    for (const policy of policies) {
      const endDate = new Date(
        policy.endDate.getFullYear(),
        policy.endDate.getMonth(),
        policy.endDate.getDate(),
      );
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysLeft = Math.round((endDate.getTime() - today.getTime()) / msPerDay);

      if (!offsets.includes(daysLeft)) continue;

      if (!bypassLastReminded) {
        const lastReminded = policy.lastRemindedAt
          ? new Date(
              policy.lastRemindedAt.getFullYear(),
              policy.lastRemindedAt.getMonth(),
              policy.lastRemindedAt.getDate(),
            )
          : null;
        if (lastReminded && lastReminded.getTime() === today.getTime()) continue;
      }

      summary.policyCandidates += 1;

      const clientName = policy.insuredPersonName ?? policy.client.insuredName;
      const endDateStr = policy.endDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const urgencyLabel =
        daysLeft === 0
          ? 'expires TODAY'
          : `expires in ${String(daysLeft)} day${daysLeft === 1 ? '' : 's'}`;

      const result = await sendPushNotification(fcmToken, {
        title: `🔔 Policy Renewal Reminder`,
        body: `${clientName} — ${policy.policyType.name} policy ${urgencyLabel} (${endDateStr})`,
        data: {
          type: 'policy',
          policyId: policy.id,
          path: `/policies/${policy.id}`,
          clientName,
          policyType: policy.policyType.name,
          endDate: policy.endDate.toISOString(),
          daysLeft: String(daysLeft),
          remindedAt: new Date().toISOString(),
        },
      });

      if (result.success) {
        summary.policySent += 1;
        await db.policy.update({
          where: { id: policy.id },
          data: { renewalStatus: 'REMINDED', lastRemindedAt: new Date() },
        });

        console.info(
          `[FCM] Sent policy reminder for "${clientName}" (policy: ${policy.id}) - ${String(daysLeft)} days left`,
        );
      } else {
        summary.policyFailed += 1;
        summary.errors.push(
          `Policy ${policy.policyNumber} failed: ${result.error ?? 'Unknown error'}`,
        );
      }
    }

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const enquiries = await db.enquiry.findMany({
      where: {
        agentId: agent.id,
        status: 'OPEN',
        remindOn: { gte: today, lte: todayEnd },
      },
      include: { policyType: true },
    });

    for (const enquiry of enquiries) {
      summary.enquiryCandidates += 1;

      const remindOnStr = enquiry.remindOn!.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const result = await sendPushNotification(fcmToken, {
        title: `📋 Enquiry Follow-Up Reminder`,
        body: `${enquiry.name} — ${enquiry.policyType.name} enquiry scheduled for follow-up (${remindOnStr})`,
        data: {
          type: 'enquiry',
          enquiryId: enquiry.id,
          path: `/enquiries/${enquiry.id}`,
          name: enquiry.name,
          policyType: enquiry.policyType.name,
          remindOn: enquiry.remindOn!.toISOString(),
          remindedAt: new Date().toISOString(),
        },
      });

      if (result.success) {
        summary.enquirySent += 1;
        console.info(`[FCM] Sent enquiry reminder for "${enquiry.name}" (enquiry: ${enquiry.id})`);
      } else {
        summary.enquiryFailed += 1;
        summary.errors.push(`Enquiry ${enquiry.id} failed: ${result.error ?? 'Unknown error'}`);
      }
    }
  }

  console.info('[FCM] Renewal notification job complete.');
  return summary;
}
