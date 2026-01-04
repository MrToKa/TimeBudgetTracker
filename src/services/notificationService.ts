// Notification Service - Timer warnings and inactivity alerts

import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  AndroidStyle,
} from '@notifee/react-native';

// Channel IDs
const TIMER_CHANNEL_ID = 'timer-notifications';
const INACTIVITY_CHANNEL_ID = 'inactivity-notifications';

// ============================================
// Setup
// ============================================

export async function setupNotificationChannels(): Promise<void> {
  // Timer notifications channel
  await notifee.createChannel({
    id: TIMER_CHANNEL_ID,
    name: 'Timer Notifications',
    description: 'Notifications for timer warnings and completions',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  // Inactivity notifications channel
  await notifee.createChannel({
    id: INACTIVITY_CHANNEL_ID,
    name: 'Inactivity Notifications',
    description: 'Reminders when no timer is running',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

// ============================================
// Timer Notifications
// ============================================

export async function scheduleTimerWarning(
  sessionId: string,
  activityName: string,
  expectedMinutes: number,
  startTime: Date
): Promise<string[]> {
  const notificationIds: string[] = [];
  const endTime = new Date(startTime.getTime() + expectedMinutes * 60 * 1000);
  const now = Date.now();

  // 5 minutes before warning
  const fiveMinBefore = endTime.getTime() - 5 * 60 * 1000;
  if (fiveMinBefore > now) {
    const fiveMinTrigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fiveMinBefore,
    };

    const fiveMinId = `timer-5min-${sessionId}`;
    await notifee.createTriggerNotification(
      {
        id: fiveMinId,
        title: '⏰ 5 minutes remaining',
        body: `"${activityName}" budget ends in 5 minutes`,
        android: {
          channelId: TIMER_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: `Your timer for "${activityName}" will reach its budget in 5 minutes. Complete it soon or it will be marked as overdue.`,
          },
        },
      },
      fiveMinTrigger
    );
    notificationIds.push(fiveMinId);
  }

  // Time's up notification
  const timeUpTime = endTime.getTime();
  if (timeUpTime > now) {
    const timeUpTrigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: timeUpTime,
    };

    const timeUpId = `timer-timeup-${sessionId}`;
    await notifee.createTriggerNotification(
      {
        id: timeUpId,
        title: '🔴 Time is up!',
        body: `"${activityName}" has exceeded its budget`,
        android: {
          channelId: TIMER_CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default' },
          style: {
            type: AndroidStyle.BIGTEXT,
            text: `Your timer for "${activityName}" has reached its budget time. The timer is now overdue but still running.`,
          },
        },
      },
      timeUpTrigger
    );
    notificationIds.push(timeUpId);
  }

  return notificationIds;
}

export async function cancelTimerNotifications(sessionId: string): Promise<void> {
  try {
    await notifee.cancelNotification(`timer-5min-${sessionId}`);
    await notifee.cancelNotification(`timer-timeup-${sessionId}`);
  } catch (error) {
    console.warn('Error canceling timer notifications:', error);
  }
}

export async function showTimerStartNotification(activityName: string): Promise<void> {
  await notifee.displayNotification({
    title: '▶️ Timer Started',
    body: `Tracking "${activityName}"`,
    android: {
      channelId: TIMER_CHANNEL_ID,
      importance: AndroidImportance.DEFAULT,
      pressAction: { id: 'default' },
      smallIcon: 'ic_launcher',
      color: '#3B82F6',
    },
  });
}

// ============================================
// Inactivity Notifications
// ============================================

let inactivityIntervalId: ReturnType<typeof setInterval> | null = null;
let inactivityTimeoutMs = 5 * 60 * 1000; // Default 5 minutes, can be configured

export function setInactivityTimeout(minutes: number): void {
  inactivityTimeoutMs = minutes * 60 * 1000;
}

export function startInactivityMonitor(hasRunningTimers: boolean, intervalMinutes?: number): void {
  // Clear any existing interval
  stopInactivityMonitor();

  // Update timeout if provided
  if (intervalMinutes !== undefined && intervalMinutes > 0) {
    inactivityTimeoutMs = intervalMinutes * 60 * 1000;
  }

  // Only start monitoring if no timers are running
  if (!hasRunningTimers) {
    // Show first notification after the configured interval
    inactivityIntervalId = setInterval(async () => {
      await showInactivityNotification();
    }, inactivityTimeoutMs);
  }
}

export function stopInactivityMonitor(): void {
  if (inactivityIntervalId) {
    clearInterval(inactivityIntervalId);
    inactivityIntervalId = null;
  }
}

export async function showInactivityNotification(): Promise<void> {
  const minutes = Math.round(inactivityTimeoutMs / 60000);
  await notifee.displayNotification({
    id: 'inactivity-reminder',
    title: '💤 No timer running',
    body: `You haven't tracked any activity. Start a timer?`,
    android: {
      channelId: INACTIVITY_CHANNEL_ID,
      importance: AndroidImportance.DEFAULT,
      pressAction: { id: 'default' },
    },
  });
}

export async function cancelInactivityNotification(): Promise<void> {
  try {
    await notifee.cancelNotification('inactivity-reminder');
  } catch (error) {
    console.warn('Error canceling inactivity notification:', error);
  }
}

// ============================================
// Utility
// ============================================

export async function cancelAllNotifications(): Promise<void> {
  await notifee.cancelAllNotifications();
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1; // AUTHORIZED or PROVISIONAL
}
