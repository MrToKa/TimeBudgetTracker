// Routine Execution Store - Zustand state management for running routines

import { create } from 'zustand';
import { nowISO, calculateDurationMinutes } from '../utils/dateUtils';
import * as sessionRepository from '../database/repositories/sessionRepository';
import { getRoutineWithItems } from '../database/repositories/routineRepository';
import {
  scheduleTimerWarning,
  cancelTimerNotifications,
  showTimerStartNotification,
} from '../services/notificationService';

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
}

interface RoutineExecutionState {
  // State
  runningRoutine: RunningRoutine | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  startRoutine: (routineId: string) => Promise<void>;
  pauseRoutine: () => void;
  resumeRoutine: () => void;
  nextActivity: () => Promise<void>;
  stopRoutine: () => Promise<void>;
  getCurrentActivityDuration: () => number;
  getTotalRoutineDuration: () => number;
  clearError: () => void;
}

export const useRoutineExecutionStore = create<RoutineExecutionState>((set, get) => ({
  runningRoutine: null,
  isLoading: false,
  error: null,

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
      if (firstActivity.expectedMinutes && firstActivity.expectedMinutes > 5) {
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
        },
        isLoading: false,
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

    // End current activity
    if (currentActivity.sessionId && currentActivity.startTime) {
      await sessionRepository.stopSession(currentActivity.sessionId);
      currentActivity.endTime = now;
      // Cancel current notifications
      cancelTimerNotifications(currentActivity.sessionId);
    }

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
      startTime: now,
      isPlanned: true,
      expectedDurationMinutes: nextActivity.expectedMinutes,
      source: 'routine',
      isRunning: true,
      idlePromptEnabled: false,
    });

    nextActivity.startTime = now;
    nextActivity.sessionId = session.id;

    // Schedule notifications for next activity
    if (nextActivity.expectedMinutes && nextActivity.expectedMinutes > 5) {
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

    set({
      runningRoutine: {
        ...runningRoutine,
        currentActivityIndex: nextIndex,
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

    set({ runningRoutine: null });
  },

  getCurrentActivityDuration: () => {
    const { runningRoutine } = get();
    
    if (!runningRoutine) {
      return 0;
    }

    const currentActivity = runningRoutine.activities[runningRoutine.currentActivityIndex];
    
    if (!currentActivity.startTime) {
      return 0;
    }

    const now = nowISO();
    const startTime = currentActivity.startTime;
    const endTime = runningRoutine.isPaused && runningRoutine.pausedAt 
      ? runningRoutine.pausedAt 
      : now;

    return calculateDurationMinutes(startTime, endTime) * 60; // Return in seconds
  },

  getTotalRoutineDuration: () => {
    const { runningRoutine } = get();
    
    if (!runningRoutine) {
      return 0;
    }

    const now = nowISO();
    const totalDuration = calculateDurationMinutes(runningRoutine.startTime, now) * 60; // in seconds
    
    return totalDuration - runningRoutine.totalPausedDuration;
  },

  clearError: () => set({ error: null }),
}));
