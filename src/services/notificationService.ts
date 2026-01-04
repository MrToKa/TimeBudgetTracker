// Notification Service - Timer warnings and inactivity alerts

import notifee, {
  AlarmType,
  AndroidImportance,
  AndroidStyle,
  EventType,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { getSettingBoolean, getSettingNumber } from '../database/repositories/settingsRepository';
import { getRunningSession } from '../database/repositories/sessionRepository';
import { getRoutineSchedules, RoutineSchedule } from '../database/repositories/routineRepository';

// Channel IDs
const TIMER_CHANNEL_ID = 'timer-notifications';
const INACTIVITY_CHANNEL_ID = 'inactivity-notifications';
const ROUTINE_CHANNEL_ID = 'routine-notifications';
const INACTIVITY_NOTIFICATION_ID = 'inactivity-reminder';
const DEFAULT_INACTIVITY_MINUTES = 5;
const ROUTINE_NOTIFICATION_PREFIX = 'routine-start-';

// ============================================
// Setup
// ============================================

export async function setupNotificationChannels(): Promise<void> {
  await notifee.createChannel({
    id: TIMER_CHANNEL_ID,
    name: 'Timer Notifications',
    description: 'Notifications for timer warnings and completions',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  await notifee.createChannel({
    id: INACTIVITY_CHANNEL_ID,
    name: 'Inactivity Notifications',
    description: 'Reminders when no timer is running',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await notifee.createChannel({
    id: ROUTINE_CHANNEL_ID,
    name: 'Routine Notifications',
    description: 'Notifications for scheduled routine starts',
    importance: AndroidImportance.HIGH,
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
        title: '5 minutes remaining',
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
        title: 'Time is up!',
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
    title: 'Timer Started',
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
// Routine Notifications
// ============================================

function parseRoutineTime(time: string | null): { hours: number; minutes: number } | null {
  if (!time) {
    return null;
  }
  const [hoursStr, minutesStr] = time.split(':');
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return { hours, minutes };
}

function formatRoutineTime(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function getNextRoutineTriggerTimestamp(schedule: RoutineSchedule): number | null {
  const parsed = parseRoutineTime(schedule.scheduledTime);
  if (!parsed) {
    return null;
  }

  const now = new Date();
  const triggerDate = new Date(now);
  triggerDate.setHours(parsed.hours, parsed.minutes, 0, 0);

  if (schedule.dayOfWeek !== null) {
    const currentDay = triggerDate.getDay();
    let daysToAdd = (schedule.dayOfWeek - currentDay + 7) % 7;
    if (daysToAdd === 0 && triggerDate.getTime() <= now.getTime()) {
      daysToAdd = 7;
    }
    triggerDate.setDate(triggerDate.getDate() + daysToAdd);
  } else if (triggerDate.getTime() <= now.getTime()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  return triggerDate.getTime();
}

async function clearRoutineStartNotifications(): Promise<void> {
  try {
    const triggers = await notifee.getTriggerNotifications();
    const routineIds = triggers
      .filter(t => t.notification?.id?.startsWith(ROUTINE_NOTIFICATION_PREFIX))
      .map(t => t.notification?.id as string);

    await Promise.all(
      routineIds.map(id =>
        Promise.all([
          notifee.cancelTriggerNotification(id),
          notifee.cancelNotification(id),
        ])
      )
    );
  } catch (error) {
    console.warn('[Routine] Failed to clear routine notifications:', error);
  }
}

function pickEarliestRoutineSchedules(schedules: RoutineSchedule[]): RoutineSchedule[] {
  const grouped = new Map<
    string,
    RoutineSchedule & { totalMinutes: number }
  >();

  schedules.forEach(schedule => {
    const parsed = parseRoutineTime(schedule.scheduledTime);
    if (!parsed) {
      return;
    }
    const totalMinutes = parsed.hours * 60 + parsed.minutes;
    const key = `${schedule.routineId}-${schedule.dayOfWeek ?? 'daily'}`;
    const existing = grouped.get(key);
    if (!existing || totalMinutes < existing.totalMinutes) {
      grouped.set(key, {
        ...schedule,
        scheduledTime: formatRoutineTime(parsed.hours, parsed.minutes),
        totalMinutes,
      });
    }
  });

  return Array.from(grouped.values()).map(({ totalMinutes, ...rest }) => rest);
}

export async function scheduleRoutineStartReminders(): Promise<void> {
  try {
    const notificationsEnabled = await getSettingBoolean('notificationsEnabled', true);
    const routineRemindersEnabled = await getSettingBoolean('reminderRoutineStart', true);

    if (!notificationsEnabled || !routineRemindersEnabled) {
      await clearRoutineStartNotifications();
      return;
    }

    const schedules = pickEarliestRoutineSchedules(await getRoutineSchedules());

    if (schedules.length === 0) {
      await clearRoutineStartNotifications();
      return;
    }

    await clearRoutineStartNotifications();

    for (const schedule of schedules) {
      const triggerTime = getNextRoutineTriggerTimestamp(schedule);
      if (!triggerTime) {
        continue;
      }

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime,
        alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
        repeatFrequency:
          schedule.dayOfWeek !== null ? RepeatFrequency.WEEKLY : RepeatFrequency.DAILY,
      };

      const notificationId = `${ROUTINE_NOTIFICATION_PREFIX}${schedule.routineId}-${
        schedule.dayOfWeek ?? 'daily'
      }`;

      await notifee.createTriggerNotification(
        {
          id: notificationId,
          title: 'Routine starting',
          body: `It's time to start your "${schedule.routineName}" routine.`,
          android: {
            channelId: ROUTINE_CHANNEL_ID,
            importance: AndroidImportance.HIGH,
            pressAction: { id: 'default' },
            smallIcon: 'ic_launcher',
            color: '#3B82F6',
          },
        },
        trigger
      );
    }
  } catch (error) {
    console.warn('[Routine] Failed to schedule routine reminders:', error);
  }
}

// ============================================
// Inactivity Notifications
// ============================================

let inactivityTimeoutMs = DEFAULT_INACTIVITY_MINUTES * 60 * 1000;
let listenersRegistered = false;
let currentIntervalMinutes: number | undefined = undefined;

const reminderNotification = {
  id: INACTIVITY_NOTIFICATION_ID,
  title: 'No timer running',
  body: "You haven't tracked any activity. Start a timer?",
  android: {
    channelId: INACTIVITY_CHANNEL_ID,
    importance: AndroidImportance.DEFAULT,
    pressAction: { id: 'default' },
    smallIcon: 'ic_launcher',
    color: '#3B82F6',
  },
};

async function shouldScheduleInactivityReminder(intervalMinutes?: number): Promise<number | null> {
  const notificationsEnabled = await getSettingBoolean('notificationsEnabled', true);
  const reminderEnabled = await getSettingBoolean('noTimerReminderEnabled', true);
  if (!notificationsEnabled || !reminderEnabled) {
    return null;
  }

  const runningSessions = await getRunningSession();
  if (runningSessions.length > 0) {
    return null;
  }

  const minutes =
    intervalMinutes ??
    (await getSettingNumber('noTimerReminderMinutes', DEFAULT_INACTIVITY_MINUTES));

  if (!minutes || minutes <= 0) {
    return null;
  }

  inactivityTimeoutMs = minutes * 60 * 1000;
  currentIntervalMinutes = minutes;
  return minutes;
}

async function scheduleInactivityReminder(intervalMinutes?: number): Promise<number | null> {
  const minutes = await shouldScheduleInactivityReminder(intervalMinutes);
  if (!minutes) {
    return null;
  }

  const triggerTime = Date.now() + minutes * 60 * 1000;
  
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerTime,
    alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
  };

  // First cancel any existing trigger
  try {
    await notifee.cancelTriggerNotification(INACTIVITY_NOTIFICATION_ID);
  } catch (e) {
    // Ignore
  }
  
  await notifee.createTriggerNotification(
    {
      ...reminderNotification,
      body: `You haven't tracked any activity. Start a timer?`,
    },
    trigger
  );
  
  return minutes;
}

export function setInactivityTimeout(minutes: number): void {
  inactivityTimeoutMs = minutes * 60 * 1000;
  currentIntervalMinutes = minutes;
}

export async function startInactivityMonitor(hasRunningTimers: boolean, intervalMinutes?: number): Promise<void> {
  if (hasRunningTimers) {
    // If there are running timers, cancel any scheduled reminder
    await stopInactivityMonitor();
    return;
  }
  
  // Schedule the inactivity reminder
  try {
    await scheduleInactivityReminder(intervalMinutes);
  } catch (error) {
    console.warn('[Inactivity] Error starting monitor:', error);
  }
}

export async function stopInactivityMonitor(): Promise<void> {
  currentIntervalMinutes = undefined;
  
  try {
    await notifee.cancelTriggerNotification(INACTIVITY_NOTIFICATION_ID);
  } catch (error) {
    // Ignore - notification may not exist
  }
}

export async function showInactivityNotification(): Promise<void> {
  const minutes = Math.round(inactivityTimeoutMs / 60000);
  await notifee.displayNotification({
    ...reminderNotification,
    body: `You haven't tracked any activity in the last ${minutes} minute${minutes === 1 ? '' : 's'}. Start a timer?`,
  });
}

export async function cancelInactivityNotification(): Promise<void> {
  try {
    await Promise.all([
      notifee.cancelNotification(INACTIVITY_NOTIFICATION_ID),
      notifee.cancelTriggerNotification(INACTIVITY_NOTIFICATION_ID),
    ]);
  } catch (error) {
    console.warn('Error canceling inactivity notification:', error);
  }
}

async function handleInactivityReminderDelivered(): Promise<void> {
  try {
    // Schedule the next reminder - always read the latest interval from settings
    await scheduleInactivityReminder();
  } catch (error) {
    console.warn('[Inactivity] Error scheduling next inactivity reminder:', error);
  }
}

export function registerNotificationListeners(): void {
  if (listenersRegistered) {
    return;
  }
  listenersRegistered = true;

  const handler = async ({ type, detail }: { type: EventType; detail: any }) => {
    if (detail.notification?.id !== INACTIVITY_NOTIFICATION_ID) {
      return;
    }

    if (type === EventType.DELIVERED) {
      await handleInactivityReminderDelivered();
    }
  };

  notifee.onForegroundEvent(handler);
  notifee.onBackgroundEvent(handler);
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
