// Timer Store - Zustand state management for running timers

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { RunningTimer, ActivityWithCategory, TimeSession } from '../types';
import * as sessionRepository from '../database/repositories/sessionRepository';
import * as activityRepository from '../database/repositories/activityRepository';
import { nowISO, calculateDurationMinutes } from '../utils/dateUtils';
import {
  scheduleTimerWarning,
  cancelTimerNotifications,
  startInactivityMonitor,
  stopInactivityMonitor,
  cancelInactivityNotification,
} from '../services/notificationService';

interface TimerState {
  // State
  runningTimers: RunningTimer[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadRunningTimers: () => Promise<void>;
  startTimer: (activity: ActivityWithCategory, isPlanned?: boolean, expectedMinutes?: number | null) => Promise<RunningTimer>;
  startQuickTimer: (activityName: string, categoryId: string, categoryName: string, categoryColor: string, isPlanned?: boolean) => Promise<RunningTimer>;
  startManualTimer: (activityName: string, categoryId: string, categoryName: string, categoryColor: string, expectedMinutes: number, isPlanned?: boolean) => Promise<RunningTimer>;
  stopTimer: (timerId: string) => Promise<TimeSession | null>;
  stopAllTimers: () => Promise<number>;
  getTimerDuration: (timerId: string) => number;
  clearError: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  runningTimers: [],
  isLoading: false,
  error: null,

  loadRunningTimers: async () => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await sessionRepository.getRunningSession();
      
      const timers: RunningTimer[] = sessions.map(session => ({
        id: uuidv4(), // Local timer ID
        sessionId: session.id,
        activityId: session.activityId,
        activityName: session.activityNameSnapshot,
        categoryId: session.categoryId,
        categoryName: session.categoryNameSnapshot,
        categoryColor: '#6B7280', // Default, will be updated from session details
        startTime: new Date(session.startTime),
        expectedDurationMinutes: session.expectedDurationMinutes,
        isPlanned: session.isPlanned,
        idlePromptEnabled: session.idlePromptEnabled,
      }));
      
      set({ runningTimers: timers, isLoading: false });
      
      // Update inactivity monitor based on running timers
      if (timers.length > 0) {
        await stopInactivityMonitor();
        await cancelInactivityNotification();
      } else {
        await startInactivityMonitor(false);
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  startTimer: async (activity, isPlanned = true, expectedMinutes = null) => {
    set({ error: null });
    try {
      // Check if a timer with the same activity name is already running
      const { runningTimers } = get();
      const existingTimer = runningTimers.find(
        t => t.activityName.toLowerCase() === activity.name.toLowerCase()
      );
      
      if (existingTimer) {
        const error = new Error(`Timer for "${activity.name}" is already running`);
        set({ error: error.message });
        throw error;
      }
      
      // Get category info
      const activityWithCategory = await activityRepository.getActivityByIdWithCategory(activity.id);
      if (!activityWithCategory) {
        throw new Error('Activity not found');
      }
      
      const startTime = nowISO();
      
      // Create session in database
      const session = await sessionRepository.createSession({
        activityId: activity.id,
        activityNameSnapshot: activity.name,
        categoryId: activity.categoryId,
        categoryNameSnapshot: activityWithCategory.categoryName,
        startTime,
        isPlanned: isPlanned ?? activity.isPlannedDefault,
        expectedDurationMinutes: expectedMinutes ?? activity.defaultExpectedMinutes,
        source: 'timer',
        isRunning: true,
        idlePromptEnabled: activity.idlePromptEnabled,
      });
      
      // Update activity usage
      await activityRepository.incrementActivityUsage(activity.id);
      
      // Create running timer
      const timer: RunningTimer = {
        id: uuidv4(),
        sessionId: session.id,
        activityId: activity.id,
        activityName: activity.name,
        categoryId: activity.categoryId,
        categoryName: activityWithCategory.categoryName,
        categoryColor: activityWithCategory.categoryColor,
        startTime: new Date(startTime),
        expectedDurationMinutes: expectedMinutes ?? activity.defaultExpectedMinutes,
        isPlanned: isPlanned ?? activity.isPlannedDefault,
        idlePromptEnabled: activity.idlePromptEnabled,
      };
      
      set(state => ({
        runningTimers: [...state.runningTimers, timer],
      }));
      
      // Schedule notifications if expected duration is set
      const finalExpectedMinutes = expectedMinutes ?? activity.defaultExpectedMinutes;
      if (finalExpectedMinutes && finalExpectedMinutes > 0) {
        await scheduleTimerWarning(
          session.id,
          activity.name,
          finalExpectedMinutes,
          new Date(startTime)
        );
      }
      
      // Stop inactivity monitor since a timer is now running
      await stopInactivityMonitor();
      await cancelInactivityNotification();
      
      // Show timer start notification
      const { showTimerStartNotification } = await import('../services/notificationService');
      await showTimerStartNotification(activity.name);
      
      return timer;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  startQuickTimer: async (activityName, categoryId, categoryName, categoryColor, isPlanned = true) => {
    set({ error: null });
    try {
      // Check if a timer with the same activity name is already running
      const { runningTimers } = get();
      const existingTimer = runningTimers.find(
        t => t.activityName.toLowerCase() === activityName.toLowerCase()
      );
      
      if (existingTimer) {
        const error = new Error(`Timer for "${activityName}" is already running`);
        set({ error: error.message });
        throw error;
      }
      
      const startTime = nowISO();
      
      // Create session in database without activity reference
      const session = await sessionRepository.createSession({
        activityId: null,
        activityNameSnapshot: activityName,
        categoryId,
        categoryNameSnapshot: categoryName,
        startTime,
        isPlanned,
        source: 'timer',
        isRunning: true,
        idlePromptEnabled: true,
      });
      
      // Create running timer
      const timer: RunningTimer = {
        id: uuidv4(),
        sessionId: session.id,
        activityId: null,
        activityName,
        categoryId,
        categoryName,
        categoryColor,
        startTime: new Date(startTime),
        expectedDurationMinutes: null,
        isPlanned,
        idlePromptEnabled: true,
      };
      
      set(state => ({
        runningTimers: [...state.runningTimers, timer],
      }));
      
      // Show timer start notification
      const { showTimerStartNotification } = await import('../services/notificationService');
      await showTimerStartNotification(activityName);
      
      return timer;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  startManualTimer: async (activityName, categoryId, categoryName, categoryColor, expectedMinutes, isPlanned = true) => {
    set({ error: null });
    try {
      // Check if a timer with the same activity name is already running
      const { runningTimers } = get();
      const existingTimer = runningTimers.find(
        t => t.activityName.toLowerCase() === activityName.toLowerCase()
      );
      
      if (existingTimer) {
        const error = new Error(`Timer for "${activityName}" is already running`);
        set({ error: error.message });
        throw error;
      }
      
      const startTime = nowISO();
      
      // Create session in database as a running timer
      const session = await sessionRepository.createSession({
        activityId: null,
        activityNameSnapshot: activityName,
        categoryId,
        categoryNameSnapshot: categoryName,
        startTime,
        isPlanned,
        expectedDurationMinutes: expectedMinutes,
        source: 'manual',
        isRunning: true,
        idlePromptEnabled: true,
      });
      
      // Create running timer
      const timer: RunningTimer = {
        id: uuidv4(),
        sessionId: session.id,
        activityId: null,
        activityName,
        categoryId,
        categoryName,
        categoryColor,
        startTime: new Date(startTime),
        expectedDurationMinutes: expectedMinutes,
        isPlanned,
        idlePromptEnabled: true,
      };
      
      set(state => ({
        runningTimers: [...state.runningTimers, timer],
      }));
      
      // Schedule notifications for timer warnings
      if (expectedMinutes > 0) {
        await scheduleTimerWarning(
          session.id,
          activityName,
          expectedMinutes,
          new Date(startTime)
        );
      }
      
      // Stop inactivity monitor since a timer is now running
      await stopInactivityMonitor();
      await cancelInactivityNotification();
      
      // Show timer start notification
      const { showTimerStartNotification } = await import('../services/notificationService');
      await showTimerStartNotification(activityName);
      
      return timer;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  stopTimer: async (timerId) => {
    set({ error: null });
    try {
      const { runningTimers } = get();
      const timer = runningTimers.find(t => t.id === timerId);
      
      if (!timer) {
        throw new Error('Timer not found');
      }
      
      // Cancel any scheduled notifications for this timer
      await cancelTimerNotifications(timer.sessionId);
      
      // Stop session in database
      const session = await sessionRepository.stopSession(timer.sessionId);
      
      // Remove from running timers
      set(state => ({
        runningTimers: state.runningTimers.filter(t => t.id !== timerId),
      }));
      
      // If no more timers running, start inactivity monitor
      const remainingTimers = get().runningTimers;
      if (remainingTimers.length === 0) {
        await startInactivityMonitor(false);
      }
      
      return session;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  stopAllTimers: async () => {
    set({ error: null });
    try {
      const { runningTimers } = get();
      
      for (const timer of runningTimers) {
        await sessionRepository.stopSession(timer.sessionId);
      }
      
      const count = runningTimers.length;
      set({ runningTimers: [] });
      
      // Start inactivity reminders now that no timers are running
      await startInactivityMonitor(false);
      
      return count;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  getTimerDuration: (timerId) => {
    const { runningTimers } = get();
    const timer = runningTimers.find(t => t.id === timerId);
    
    if (!timer) {
      return 0;
    }
    
    return Math.floor((Date.now() - timer.startTime.getTime()) / 1000);
  },

  clearError: () => {
    set({ error: null });
  },
}));
