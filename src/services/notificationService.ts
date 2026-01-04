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
import { getRoutineSchedules, RoutineSchedule, getRoutineWithItems } from '../database/repositories/routineRepository';
import { RoutineWithItems } from '../types';
import * as sessionRepository from '../database/repositories/sessionRepository';
import { nowISO } from '../utils/dateUtils';
import { executeQuery } from '../database/database';
// Note: useRoutineExecutionStore is dynamically imported below to avoid circular dependency

// Channel IDs
const TIMER_CHANNEL_ID = 'timer-notifications';
const INACTIVITY_CHANNEL_ID = 'inactivity-notifications';
const ROUTINE_CHANNEL_ID = 'routine-notifications';
const ROUTINE_STEP_PREFIX = 'routine-step-';
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

function isDayAllowed(date: Date, filter: RoutineSchedule['dayFilter']): boolean {
  if (filter === 'all') {
    return true;
  }

  const day = date.getDay(); // 0 Sunday
  const isWeekend = day === 0 || day === 6;
  if (filter === 'weekdays') {
    return !isWeekend;
  }
  return isWeekend;
}

function getNextRoutineTriggerTimestamp(schedule: RoutineSchedule): number | null {
  const parsed = parseRoutineTime(schedule.scheduledTime);
  if (!parsed) {
    return null;
  }

  const now = new Date();
  const triggerDate = new Date(now);
  triggerDate.setHours(parsed.hours, parsed.minutes, 0, 0);

  let attempts = 0;
  while ((!isDayAllowed(triggerDate, schedule.dayFilter) || triggerDate.getTime() <= now.getTime()) && attempts < 7) {
    triggerDate.setDate(triggerDate.getDate() + 1);
    triggerDate.setHours(parsed.hours, parsed.minutes, 0, 0);
    attempts++;
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

async function clearRoutineStepNotifications(): Promise<void> {
  try {
    const triggers = await notifee.getTriggerNotifications();
    const routineIds = triggers
      .filter(t => t.notification?.id?.startsWith(ROUTINE_STEP_PREFIX))
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
    console.warn('[Routine] Failed to clear routine step notifications:', error);
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
    const key = `${schedule.routineId}-start`;
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
      await Promise.all([clearRoutineStartNotifications(), clearRoutineStepNotifications()]);
      return;
    }

    await Promise.all([clearRoutineStartNotifications(), clearRoutineStepNotifications()]);

    for (const schedule of schedules) {
      const triggerTime = getNextRoutineTriggerTimestamp(schedule);
      if (!triggerTime) {
        continue;
      }

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime,
        alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
        repeatFrequency: RepeatFrequency.NONE,
      };

      const notificationId = `${ROUTINE_NOTIFICATION_PREFIX}${schedule.routineId}`;

      await notifee.createTriggerNotification(
        {
          id: notificationId,
          title: 'Routine starting',
          body: `It's time to start your "${schedule.routineName}" routine.`,
          data: { routineId: schedule.routineId },
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
// Routine Automation (auto start + progression)
// ============================================

async function scheduleRoutineStepTrigger(
  routineId: string,
  currentIndex: number,
  durationMinutes: number,
  currentSessionId: string
): Promise<void> {
  try {
    const triggers = await notifee.getTriggerNotifications();
    const existing = triggers.filter(t =>
      t.notification?.id?.startsWith(`${ROUTINE_STEP_PREFIX}${routineId}-`)
    );
    await Promise.all(
      existing.map(t =>
        Promise.all([
          notifee.cancelTriggerNotification(t.notification?.id as string),
          notifee.cancelNotification(t.notification?.id as string),
        ])
      )
    );
  } catch (error) {
    console.warn('[Routine] Failed to clear previous step triggers:', error);
  }

  const triggerTime = Date.now() + durationMinutes * 60 * 1000;
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerTime,
    alarmManager: { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE },
  };

  const nextIndex = currentIndex + 1;
  const notificationId = `${ROUTINE_STEP_PREFIX}${routineId}-${nextIndex}`;

  await notifee.createTriggerNotification(
    {
      id: notificationId,
      title: 'Routine progressing',
      body: 'Moving to the next activity in your routine.',
      data: { routineId, nextIndex, previousSessionId: currentSessionId },
      android: {
        channelId: ROUTINE_CHANNEL_ID,
        importance: AndroidImportance.DEFAULT,
        pressAction: { id: 'default' },
        smallIcon: 'ic_launcher',
        color: '#3B82F6',
      },
    },
    trigger
  );
}

async function startRoutineActivity(
  routine: RoutineWithItems,
  activityIndex: number,
  previousSessionId?: string
): Promise<void> {
  const activity = routine.items[activityIndex];
  const expectedMinutes =
    activity.expectedDurationMinutes ?? activity.activity.defaultExpectedMinutes;

  if (!expectedMinutes || expectedMinutes <= 0) {
    console.warn(`[Routine] Missing duration for activity ${activity.activity.name}, skipping`);
    if (previousSessionId) {
      await sessionRepository.stopSession(previousSessionId);
    }
    const nextIndex = activityIndex + 1;
    if (nextIndex < routine.items.length) {
      await startRoutineActivity(routine, nextIndex);
    } else {
      await scheduleRoutineStartReminders();
    }
    return;
  }

  if (previousSessionId) {
    await sessionRepository.stopSession(previousSessionId);
  }

  const start = nowISO();
  const categoryRows = await executeQuery<{ id: string; name: string; color: string }>(
    'SELECT id, name, color FROM categories WHERE id = ?',
    [activity.activity.categoryId]
  );
  const category = categoryRows[0];
  const session = await sessionRepository.createSession({
    activityId: activity.activityId,
    activityNameSnapshot: activity.activity.name,
    categoryId: activity.activity.categoryId,
    categoryNameSnapshot: category?.name ?? 'Routine',
    routineId: routine.id,
    startTime: start,
    isPlanned: true,
    expectedDurationMinutes: expectedMinutes,
    source: 'routine',
    isRunning: true,
    idlePromptEnabled: false,
  });

  await scheduleTimerWarning(session.id, activity.activity.name, expectedMinutes, new Date(start));
  await showTimerStartNotification(activity.activity.name);
  const timerStore = await import('../store/timerStore');
  await timerStore.useTimerStore.getState().loadRunningTimers();

  if (activityIndex < routine.items.length - 1) {
    await scheduleRoutineStepTrigger(routine.id, activityIndex, expectedMinutes, session.id);
  } else {
    // Schedule a final stop for the last activity
    await scheduleRoutineStepTrigger(routine.id, activityIndex, expectedMinutes, session.id);
  }
}

async function handleRoutineStepEvent(
  routineId: string,
  nextIndex: number,
  previousSessionId?: string
): Promise<void> {
  const routine = await getRoutineWithItems(routineId);
  if (!routine || routine.items.length === 0) {
    return;
  }

  const ordered = [...routine.items].sort((a, b) => a.displayOrder - b.displayOrder);
  routine.items = ordered as any;

  if (previousSessionId) {
    await sessionRepository.stopSession(previousSessionId);
  }

  if (nextIndex >= ordered.length) {
    const timerStore = await import('../store/timerStore');
    await timerStore.useTimerStore.getState().loadRunningTimers();
    await scheduleRoutineStartReminders();
    return;
  }

  await startRoutineActivity(
    { ...routine, items: ordered } as RoutineWithItems,
    nextIndex
  );
}

async function startRoutineAutomatically(routineId: string): Promise<void> {
  const running = await sessionRepository.getRunningSession();
  const routineRunning = running.some(s => s.source === 'routine');
  if (routineRunning) {
    return;
  }

  await clearRoutineStepNotifications();

  const routine = await getRoutineWithItems(routineId);
  if (!routine || routine.items.length === 0) {
    return;
  }

  const ordered = [...routine.items].sort((a, b) => a.displayOrder - b.displayOrder);
  await startRoutineActivity(
    { ...routine, items: ordered } as RoutineWithItems,
    0
  );

  try {
    // Dynamic import to avoid circular dependency
    const { useRoutineExecutionStore } = await import('../store/routineExecutionStore');
    useRoutineExecutionStore.getState().markAutoStartedRoutine(routineId);
  } catch (e) {
    // ignore if store not available (e.g., background)
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
    const notificationId: string | undefined = detail.notification?.id;

    if (notificationId?.startsWith(ROUTINE_NOTIFICATION_PREFIX) && type === EventType.DELIVERED) {
      const routineId =
        detail.notification?.data?.routineId ??
        notificationId.replace(ROUTINE_NOTIFICATION_PREFIX, '');
      await startRoutineAutomatically(routineId);
      await scheduleRoutineStartReminders();
      return;
    }

    if (notificationId?.startsWith(ROUTINE_STEP_PREFIX) && type === EventType.DELIVERED) {
      const data = detail.notification?.data ?? {};
      const nextIndex = Number(data.nextIndex ?? 0);
      const routineId = data.routineId ?? notificationId.replace(ROUTINE_STEP_PREFIX, '').split('-')[0];
      await handleRoutineStepEvent(routineId, nextIndex, data.previousSessionId);
      return;
    }

    if (notificationId !== INACTIVITY_NOTIFICATION_ID) {
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
