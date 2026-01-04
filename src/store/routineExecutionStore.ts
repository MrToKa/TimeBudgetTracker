// Routine Execution Store - Zustand state management for running routines

import { create } from 'zustand';
import { nowISO, calculateDurationMinutes, calculateDurationSeconds } from '../utils/dateUtils';
import * as sessionRepository from '../database/repositories/sessionRepository';
import { getRoutineWithItems } from '../database/repositories/routineRepository';
import {
  scheduleTimerWarning,
  cancelTimerNotifications,
  showTimerStartNotification,
} from '../services/notificationService';
import { useTimerStore } from './timerStore';
import { useTimerEvents } from './timerEvents';

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
  completedDurationSeconds: number; // accumulated time for finished activities
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
            expectedMinutes: item.activity.defaultExpectedMinutes,
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
          completedDurationSeconds: 0,
          activityDurations: {},
        },
        isLoading: false,
        lastAutoStartedRoutineId: get().lastAutoStartedRoutineId,
      });
    } catch (error) {
      console.error('Error starting routine:', error);
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
    if (currentActivity.expectedMinutes && currentActivity.startTime && currentActivity.sessionId) {
      const elapsed = get().getCurrentActivityDuration() / 60; // Convert to minutes
      const remaining = currentActivity.expectedMinutes - elapsed;
      
      if (remaining > 5) {
        const adjustedStartTime = new Date(Date.now() - (elapsed * 60 * 1000));
        scheduleTimerWarning(
          currentActivity.sessionId,
          currentActivity.activityName,
          Math.floor(remaining),
          adjustedStartTime
        );
      }
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

    // Show start notification
    await showTimerStartNotification(nextActivity.activityName);
    await useTimerStore.getState().loadRunningTimers();

    set({
      runningRoutine: {
        ...runningRoutine,
        activities: updatedActivities,
        currentActivityIndex: nextIndex,
        completedDurationSeconds: runningRoutine.completedDurationSeconds + elapsedSeconds,
        activityDurations: updatedActivityDurations,
      },
    });
  },

  stopRoutine: async () => {
    const { runningRoutine } = get();
    
    if (!runningRoutine) {
      return;
    }

    const now = nowISO();
    const currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];

    // End current activity if it's running
    if (currentActivity.sessionId && currentActivity.startTime && !currentActivity.endTime) {
      await sessionRepository.stopSession(currentActivity.sessionId);
      currentActivity.endTime = now;
      // Cancel all notifications
      cancelTimerNotifications(currentActivity.sessionId);
    }

    set({ runningRoutine: null, lastAutoStartedRoutineId: null });
    await useTimerStore.getState().loadRunningTimers();
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

    const currentSeconds = currentActivity.startTime
      ? calculateDurationSeconds(currentActivity.startTime, endTime)
      : 0;
    
    return runningRoutine.completedDurationSeconds + currentSeconds;
  },

  clearError: () => set({ error: null }),

  hydrateRunningRoutine: async () => {
    try {
      const runningSessions = await sessionRepository.getRunningSession();
      const routineSession = runningSessions.find(s => s.source === 'routine' && s.routineId);
      if (!routineSession || !routineSession.routineId) {
        set({ runningRoutine: null });
        return;
      }

      const routine = await getRoutineWithItems(routineSession.routineId);
      if (!routine || !routine.items.length) {
        set({ runningRoutine: null });
        return;
      }

      // Get all sessions for this routine to find the earliest start time
      const db = await import('../database');
      const allRoutineSessions = await db.executeQuery<{
        start_time: string;
        end_time: string | null;
        actual_duration_minutes: number | null;
        activity_id: string | null;
        activity_name_snapshot: string;
        is_running: number;
      }>(
        `SELECT start_time, end_time, actual_duration_minutes, activity_id, activity_name_snapshot, is_running 
         FROM time_sessions 
         WHERE routine_id = ? 
         ORDER BY start_time ASC`,
        [routineSession.routineId]
      );
      const routineStartTime = allRoutineSessions.length > 0 ? allRoutineSessions[0].start_time : routineSession.startTime;
      const activityDurations: Record<string, number> = {};
      let completedDurationSeconds = 0;

      for (const session of allRoutineSessions) {
        if (session.is_running === 1) {
          continue;
        }
        const durationSeconds = session.actual_duration_minutes !== null
          ? session.actual_duration_minutes * 60
          : session.end_time
            ? calculateDurationSeconds(session.start_time, session.end_time)
            : 0;
        completedDurationSeconds += durationSeconds;
        const key = session.activity_id ?? session.activity_name_snapshot;
        activityDurations[key] = (activityDurations[key] ?? 0) + durationSeconds;
      }

      const ordered = [...routine.items].sort((a, b) => a.displayOrder - b.displayOrder);
      const currentIndex = ordered.findIndex(item => item.activityId === routineSession.activityId);
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
          expectedMinutes: item.activity.defaultExpectedMinutes,
          scheduledTime: item.scheduledTime,
          startTime: idx === currentIndex ? routineSession.startTime : null,
          endTime: null,
          sessionId: idx === currentIndex ? routineSession.id : null,
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
          completedDurationSeconds,
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
