// Routine Execution Store - Zustand state management for running routines

import { create } from 'zustand';
import { nowISO, calculateDurationMinutes, calculateDurationSeconds } from '../utils/dateUtils';
import * as sessionRepository from '../database/repositories/sessionRepository';
import { getRoutineWithItems } from '../database/repositories/routineRepository';
import {
  scheduleTimerWarning,
  cancelTimerNotifications,
  showTimerStartNotification,
  scheduleLongSessionReminder,
  cancelLongSessionReminder,
} from '../services/notificationService';
import { useTimerStore } from './timerStore';
import * as settingsRepository from '../database/repositories/settingsRepository';

const getRunStartKey = (routineId: string) => `runningRoutine:${routineId}:startTime`;

interface RoutineActivity {
  id: string;
  activityId: string;
  activityName: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  expectedMinutes: number | null;
  scheduledTime: string | null;
  startTime: string | null; // ISO timestamp when this activity started
  endTime: string | null; // ISO timestamp when this activity ended
  sessionId: string | null; // DB session ID for this activity
}

interface RunningRoutine {
  routineId: string;
  routineName: string;
  routineType: 'daily' | 'weekly';
  activities: RoutineActivity[];
  currentActivityIndex: number;
  startTime: string; // ISO timestamp when routine started
  isPaused: boolean;
  pausedAt: string | null;
  totalPausedDuration: number; // in seconds
  completedOccurrencesSeconds: number; // total elapsed for finished activity occurrences
  activityDurations: Record<string, number>; // cumulative time per activityId across occurrences (seconds)
}

interface RoutineExecutionState {
  // State
  runningRoutine: RunningRoutine | null;
  isLoading: boolean;
  error: string | null;
  lastAutoStartedRoutineId: string | null;

  // Actions
  startRoutine: (routineId: string) => Promise<void>;
  pauseRoutine: () => void;
  resumeRoutine: () => void;
  nextActivity: () => Promise<void>;
  stopRoutine: () => Promise<void>;
  getCurrentActivityDuration: () => number;
  getTotalRoutineDuration: () => number;
  clearError: () => void;
  hydrateRunningRoutine: () => Promise<void>;
  markAutoStartedRoutine: (id: string | null) => void;
}

export const useRoutineExecutionStore = create<RoutineExecutionState>((set, get) => ({
  runningRoutine: null,
  isLoading: false,
  error: null,
  lastAutoStartedRoutineId: null,

  startRoutine: async (routineId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const routine = await getRoutineWithItems(routineId);
      
      if (!routine) {
        throw new Error('Routine not found');
      }

      if (routine.items.length === 0) {
        throw new Error('Cannot start routine with no activities');
      }

      const activities: RoutineActivity[] = await Promise.all(
        routine.items.map(async item => {
          // Get category info
          const categoryRows = await import('../database').then(db => 
            db.executeQuery<{ id: string; name: string; color: string }>(
              'SELECT id, name, color FROM categories WHERE id = ?',
              [item.activity.categoryId]
            )
          );
          const category = categoryRows[0];

          return {
            id: item.id,
            activityId: item.activityId,
            activityName: item.activity.name,
            categoryId: item.activity.categoryId,
            categoryName: category?.name ?? 'Unknown',
            categoryColor: category?.color ?? '#gray',
            expectedMinutes: item.expectedDurationMinutes ?? item.activity.defaultExpectedMinutes,
            scheduledTime: item.scheduledTime,
            startTime: null,
            endTime: null,
            sessionId: null,
          };
        })
      );

      const now = nowISO();
      
      // Start the first activity
      const firstActivity = activities[0];
      const session = await sessionRepository.createSession({
        activityId: firstActivity.activityId,
        activityNameSnapshot: firstActivity.activityName,
        categoryId: firstActivity.categoryId,
        categoryNameSnapshot: firstActivity.categoryName,
        routineId: routine.id,
        startTime: now,
        isPlanned: true,
        expectedDurationMinutes: firstActivity.expectedMinutes,
        source: 'routine',
        isRunning: true,
        idlePromptEnabled: false,
      });

      firstActivity.startTime = now;
      firstActivity.sessionId = session.id;

      // Schedule notifications for first activity
      if (firstActivity.expectedMinutes && firstActivity.expectedMinutes > 0) {
        const startDate = new Date(now);
        await scheduleTimerWarning(
          session.id,
          firstActivity.activityName,
          firstActivity.expectedMinutes,
          startDate
        );
      }
      await scheduleLongSessionReminder(
        session.id,
        firstActivity.activityName,
        new Date(now),
        firstActivity.expectedMinutes
      );

      // Persist run start time so hydration only counts this run
      await settingsRepository.setSetting(getRunStartKey(routine.id), now);

      // Show start notification
      await showTimerStartNotification(firstActivity.activityName);
      await useTimerStore.getState().loadRunningTimers();

      set({
        runningRoutine: {
          routineId: routine.id,
          routineName: routine.name,
          routineType: routine.routineType,
          activities,
          currentActivityIndex: 0,
          startTime: now,
          isPaused: false,
          pausedAt: null,
          totalPausedDuration: 0,
          completedOccurrencesSeconds: 0,
          activityDurations: {},
        },
        isLoading: false,
        lastAutoStartedRoutineId: get().lastAutoStartedRoutineId,
      });
    } catch (error) {
      console.error('Error starting routine:', error);
      await settingsRepository.deleteSetting(getRunStartKey(routineId));
      set({ 
        error: error instanceof Error ? error.message : 'Failed to start routine',
        isLoading: false 
      });
      throw error;
    }
  },

  pauseRoutine: () => {
    const { runningRoutine } = get();
    
    if (!runningRoutine || runningRoutine.isPaused) {
      return;
    }

    set({
      runningRoutine: {
        ...runningRoutine,
        isPaused: true,
        pausedAt: nowISO(),
      },
    });

    // Cancel notifications when paused
    const currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
    if (currentActivity.sessionId) {
      cancelTimerNotifications(currentActivity.sessionId);
      cancelLongSessionReminder(currentActivity.sessionId);
    }
  },

  resumeRoutine: () => {
    const { runningRoutine } = get();
    
    if (!runningRoutine || !runningRoutine.isPaused || !runningRoutine.pausedAt) {
      return;
    }

    const pauseDuration = calculateDurationMinutes(runningRoutine.pausedAt, nowISO()) * 60;
    const currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
    
    set({
      runningRoutine: {
        ...runningRoutine,
        isPaused: false,
        pausedAt: null,
        totalPausedDuration: runningRoutine.totalPausedDuration + pauseDuration,
      },
    });

    // Reschedule notifications for remaining time
    if (currentActivity.startTime && currentActivity.sessionId) {
      const elapsed = get().getCurrentActivityDuration() / 60; // Convert to minutes
      const adjustedStartTime = new Date(Date.now() - (elapsed * 60 * 1000));

      if (currentActivity.expectedMinutes) {
        const remaining = currentActivity.expectedMinutes - elapsed;
        if (remaining > 5) {
          scheduleTimerWarning(
            currentActivity.sessionId,
            currentActivity.activityName,
            Math.floor(remaining),
            adjustedStartTime
          );
        }
      }

      scheduleLongSessionReminder(
        currentActivity.sessionId,
        currentActivity.activityName,
        adjustedStartTime,
        currentActivity.expectedMinutes
      );
    }
  },

  nextActivity: async () => {
    const { runningRoutine } = get();
    
    if (!runningRoutine) {
      return;
    }

    const currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
    const now = nowISO();
    const activityKey = currentActivity.activityId || currentActivity.activityName;
    let elapsedSeconds = 0;

    // End current activity
    if (currentActivity.sessionId && currentActivity.startTime) {
      await sessionRepository.stopSession(currentActivity.sessionId);
      elapsedSeconds = calculateDurationSeconds(currentActivity.startTime, now);
      // Cancel current notifications
      cancelTimerNotifications(currentActivity.sessionId);
      cancelLongSessionReminder(currentActivity.sessionId);
    }

    const updatedActivityDurations = { ...runningRoutine.activityDurations };
    updatedActivityDurations[activityKey] = (updatedActivityDurations[activityKey] ?? 0) + elapsedSeconds;

    // Check if there's a next activity
    const nextIndex = runningRoutine.currentActivityIndex + 1;
    
    if (nextIndex >= runningRoutine.activities.length) {
      // No more activities - stop routine
      await get().stopRoutine();
      return;
    }

    // Start next activity
    const nextActivity = runningRoutine.activities[nextIndex];
    const session = await sessionRepository.createSession({
      activityId: nextActivity.activityId,
      activityNameSnapshot: nextActivity.activityName,
      categoryId: nextActivity.categoryId,
      categoryNameSnapshot: nextActivity.categoryName,
      routineId: runningRoutine.routineId,
      startTime: now,
      isPlanned: true,
      expectedDurationMinutes: nextActivity.expectedMinutes,
      source: 'routine',
      isRunning: true,
      idlePromptEnabled: false,
    });

    const updatedActivities = runningRoutine.activities.map((activity, idx) => {
      if (idx === runningRoutine.currentActivityIndex) {
        return { ...activity, endTime: now };
      }
      if (idx === nextIndex) {
        return { ...activity, startTime: now, sessionId: session.id };
      }
      return activity;
    });

    // Schedule notifications for next activity
    if (nextActivity.expectedMinutes && nextActivity.expectedMinutes > 0) {
      const startDate = new Date(now);
      await scheduleTimerWarning(
        session.id,
        nextActivity.activityName,
        nextActivity.expectedMinutes,
        startDate
      );
    }
    await scheduleLongSessionReminder(
      session.id,
      nextActivity.activityName,
      new Date(now),
      nextActivity.expectedMinutes
    );

    // Show start notification
    await showTimerStartNotification(nextActivity.activityName);
    await useTimerStore.getState().loadRunningTimers();

    set({
      runningRoutine: {
        ...runningRoutine,
        activities: updatedActivities,
        currentActivityIndex: nextIndex,
        completedOccurrencesSeconds: runningRoutine.completedOccurrencesSeconds + elapsedSeconds,
        activityDurations: updatedActivityDurations,
      },
    });
  },

  stopRoutine: async () => {
    const { runningRoutine } = get();
    
    if (!runningRoutine) {
      return;
    }

    try {
      const now = nowISO();
      const currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];

      // End current activity if it's running
      if (currentActivity.sessionId && currentActivity.startTime && !currentActivity.endTime) {
        await sessionRepository.stopSession(currentActivity.sessionId);
        currentActivity.endTime = now;
        // Cancel all notifications
        await cancelTimerNotifications(currentActivity.sessionId);
        await cancelLongSessionReminder(currentActivity.sessionId);
      }
    } catch (err) {
      console.warn('Failed to stop current routine session', err);
    }

    try {
      await settingsRepository.deleteSetting(getRunStartKey(runningRoutine.routineId));
    } catch (err) {
      console.warn('Failed to clear routine start marker', err);
    }

    set({ runningRoutine: null, lastAutoStartedRoutineId: null });

    try {
      await useTimerStore.getState().loadRunningTimers();
    } catch (err) {
      console.warn('Failed to reload running timers after stopping routine', err);
    }
  },

  getCurrentActivityDuration: () => {
    const { runningRoutine } = get();
    
    if (!runningRoutine) {
      return 0;
    }

    const currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
    const activityKey = currentActivity.activityId || currentActivity.activityName;
    const baseSeconds = runningRoutine.activityDurations[activityKey] ?? 0;
    
    if (!currentActivity.startTime) {
      return baseSeconds;
    }

    const endTime = runningRoutine.isPaused && runningRoutine.pausedAt 
      ? runningRoutine.pausedAt 
      : nowISO();

    const currentSeconds = calculateDurationSeconds(currentActivity.startTime, endTime);
    return baseSeconds + currentSeconds;
  },

  getTotalRoutineDuration: () => {
    const { runningRoutine } = get();
    
    if (!runningRoutine) {
      return 0;
    }

    const currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
    const endTime = runningRoutine.isPaused && runningRoutine.pausedAt 
      ? runningRoutine.pausedAt 
      : nowISO();

    const completedSeconds = runningRoutine.completedOccurrencesSeconds;
    const currentSeconds = currentActivity.startTime
      ? calculateDurationSeconds(currentActivity.startTime, endTime)
      : 0;
    
    return completedSeconds + currentSeconds;
  },

  clearError: () => set({ error: null }),

  hydrateRunningRoutine: async () => {
    try {
      const existing = get().runningRoutine;
      const runningSessions = await sessionRepository.getRunningSession();
      const routineSession = runningSessions.find(s => s.source === 'routine' && s.routineId);
      if (!routineSession || !routineSession.routineId) {
        set({ runningRoutine: null });
        return;
      }
      // If our in-memory routine already matches the running session, keep it
      const existingActivity =
        existing && existing.activities
          ? existing.activities[existing.currentActivityIndex]
          : null;
      if (
        existing &&
        existing.routineId === routineSession.routineId &&
        existingActivity &&
        existingActivity.sessionId === routineSession.id
      ) {
        return;
      }

      const routine = await getRoutineWithItems(routineSession.routineId);
      if (!routine || !routine.items.length) {
        set({ runningRoutine: null });
        return;
      }

      // Get all sessions for this routine to find the earliest start time
      const db = await import('../database');
      const runStartKey = getRunStartKey(routineSession.routineId);
      const storedRunStart = await settingsRepository.getSetting(runStartKey);
      const runStartTime = storedRunStart !== null && storedRunStart !== undefined
        ? storedRunStart
        : routineSession.startTime;

      const allRoutineSessions = await db.executeQuery<{
        id: string;
        start_time: string;
        end_time: string | null;
        actual_duration_minutes: number | null;
        activity_id: string | null;
        activity_name_snapshot: string;
        is_running: number;
      }>(
        `SELECT id, start_time, end_time, actual_duration_minutes, activity_id, activity_name_snapshot, is_running 
         FROM time_sessions 
         WHERE routine_id = ? AND start_time >= ?
         ORDER BY start_time ASC`,
        [routineSession.routineId, runStartTime]
      );
      const routineStartTime = allRoutineSessions.length > 0 ? allRoutineSessions[0].start_time : runStartTime;
      const completedOccurrencesSeconds = allRoutineSessions
        .filter(session => session.is_running === 0 && session.end_time !== null)
        .reduce((sum, session) => {
          const durationSeconds = session.actual_duration_minutes !== null
            ? session.actual_duration_minutes * 60
            : session.end_time
              ? calculateDurationSeconds(session.start_time, session.end_time)
              : 0;
          return sum + durationSeconds;
        }, 0);
      const activityDurations: Record<string, number> = {};

      for (const session of allRoutineSessions) {
        if (session.is_running === 1) {
          continue;
        }
        const durationSeconds = session.actual_duration_minutes !== null
          ? session.actual_duration_minutes * 60
          : session.end_time
            ? calculateDurationSeconds(session.start_time, session.end_time)
            : 0;
        const key = session.activity_id ?? session.activity_name_snapshot;
        activityDurations[key] = (activityDurations[key] ?? 0) + durationSeconds;
      }

      const ordered = [...routine.items].sort((a, b) => a.displayOrder - b.displayOrder);
      const currentSessionIndex = allRoutineSessions.findIndex(s => s.id === routineSession.id);
      const fallbackIndex = Math.max(0, Math.min(allRoutineSessions.length - 1, ordered.length - 1));
      const chosenIndex = currentSessionIndex >= 0 ? currentSessionIndex : fallbackIndex;
      const currentIndex = Math.min(chosenIndex, ordered.length - 1);
      const currentSession = allRoutineSessions[chosenIndex] ?? routineSession;
      const activities: RoutineActivity[] = [];
      for (let idx = 0; idx < ordered.length; idx++) {
        const item = ordered[idx];
        const catRows = await db.executeQuery<{ id: string; name: string; color: string }>(
          'SELECT id, name, color FROM categories WHERE id = ?',
          [item.activity.categoryId]
        );
        const category = catRows[0];
        activities.push({
          id: item.id,
          activityId: item.activityId,
          activityName: item.activity.name,
          categoryId: item.activity.categoryId,
          categoryName: category?.name ?? item.activity.name,
          categoryColor: category?.color ?? '#6B7280',
          expectedMinutes: item.expectedDurationMinutes ?? item.activity.defaultExpectedMinutes,
          scheduledTime: item.scheduledTime,
          startTime: idx === currentIndex ? currentSession.start_time : null,
          endTime: null,
          sessionId: idx === currentIndex ? currentSession.id : null,
        });
      }

      set({
        runningRoutine: {
          routineId: routine.id,
          routineName: routine.name,
          routineType: routine.routineType,
          activities,
          currentActivityIndex: currentIndex >= 0 ? currentIndex : 0,
          startTime: routineStartTime,
          isPaused: false,
          pausedAt: null,
          totalPausedDuration: 0,
          completedOccurrencesSeconds,
          activityDurations,
        },
        lastAutoStartedRoutineId: routine.id,
      });
    } catch (err) {
      console.warn('Failed to hydrate running routine', err);
    }
  },

  markAutoStartedRoutine: (id: string | null) => set({ lastAutoStartedRoutineId: id }),
}));
