// Session Store - Zustand state management for time sessions

import { create } from 'zustand';
import { TimeSession, SessionWithDetails, CreateSessionInput, UpdateSessionInput, DailyStats, CategoryTimeBreakdown, ActivityTimeBreakdown, GoalCompliance } from '../types';
import * as sessionRepository from '../database/repositories/sessionRepository';
import * as goalRepository from '../database/repositories/goalRepository';
import { getDayStart, getDayEnd, formatDate } from '../utils/dateUtils';

interface SessionState {
  // State
  todaySessions: SessionWithDetails[];
  recentSessions: SessionWithDetails[];
  dailyStats: DailyStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadTodaySessions: () => Promise<void>;
  loadRecentSessions: (limit?: number) => Promise<void>;
  loadDailyStats: (date?: Date) => Promise<void>;
  getSessionById: (id: string) => Promise<TimeSession | null>;
  createManualSession: (input: CreateSessionInput) => Promise<TimeSession>;
  updateSession: (id: string, updates: UpdateSessionInput) => Promise<TimeSession | null>;
  deleteSession: (id: string) => Promise<boolean>;
  splitSession: (
    sessionId: string,
    splitTime: Date,
    secondActivityId: string | null,
    secondActivityName: string,
    secondCategoryId: string | null,
    secondCategoryName: string
  ) => Promise<{ first: TimeSession; second: TimeSession }>;
  getSessionsForDate: (date: Date) => Promise<SessionWithDetails[]>;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  todaySessions: [],
  recentSessions: [],
  dailyStats: null,
  isLoading: false,
  error: null,

  loadTodaySessions: async () => {
    set({ isLoading: true, error: null });
    try {
      const sessions = await sessionRepository.getSessionsForDay(new Date());
      set({ todaySessions: sessions, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadRecentSessions: async (limit = 20) => {
    set({ error: null });
    try {
      const sessions = await sessionRepository.getRecentSessions(limit);
      set({ recentSessions: sessions });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  loadDailyStats: async (date = new Date()) => {
    set({ isLoading: true, error: null });
    try {
      const dayStart = getDayStart(date);
      const dayEnd = getDayEnd(date);
      
      // Get sessions for the day
      const sessions = await sessionRepository.getSessionsForDay(date);
      
      // Calculate total time
      const totalMinutes = sessions
        .filter(s => !s.isRunning && s.actualDurationMinutes)
        .reduce((sum, s) => sum + (s.actualDurationMinutes || 0), 0);
      
      // Get planned vs unplanned
      const { plannedMinutes, unplannedMinutes } = await sessionRepository.getPlannedVsUnplannedMinutes(
        dayStart.toISOString(),
        dayEnd.toISOString()
      );
      
      // Get category breakdown
      const categoryData = await sessionRepository.getTotalMinutesByCategory(
        dayStart.toISOString(),
        dayEnd.toISOString()
      );
      
      const categoryBreakdown: CategoryTimeBreakdown[] = categoryData.map(cat => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        categoryColor: '#6B7280', // Default, would need to join with categories
        totalMinutes: cat.totalMinutes,
        plannedMinutes: 0, // Would need more complex query
        unplannedMinutes: 0,
        percentage: totalMinutes > 0 ? (cat.totalMinutes / totalMinutes) * 100 : 0,
      }));
      
      // Get activity breakdown
      const activityData = await sessionRepository.getTotalMinutesByActivity(
        dayStart.toISOString(),
        dayEnd.toISOString()
      );
      
      const activityBreakdown: ActivityTimeBreakdown[] = activityData.map(act => ({
        activityId: act.activityId,
        activityName: act.activityName,
        categoryId: null,
        categoryName: '',
        categoryColor: '#6B7280',
        totalMinutes: act.totalMinutes,
        plannedMinutes: 0,
        unplannedMinutes: 0,
        expectedMinutes: null,
        sessionsCount: act.sessionsCount,
      }));
      
      // Check for overlaps (if total > 24h or sessions overlap in time)
      const hasOverlaps = totalMinutes > 24 * 60;
      
      // Get goal compliance for daily goals
      const dailyGoals = await goalRepository.getDailyGoals();
      const goalCompliance: GoalCompliance[] = [];
      
      for (const goal of dailyGoals) {
        const activityMinutes = await sessionRepository.getTotalMinutesForDay(date, goal.activityId);
        
        let status: 'met' | 'exceeded' | 'below' = 'met';
        let difference = 0;
        
        if (goal.goalType === 'max' && activityMinutes > goal.targetMinutes) {
          status = 'exceeded';
          difference = activityMinutes - goal.targetMinutes;
        } else if (goal.goalType === 'min' && activityMinutes < goal.targetMinutes) {
          status = 'below';
          difference = goal.targetMinutes - activityMinutes;
        }
        
        goalCompliance.push({
          goal,
          actualMinutes: activityMinutes,
          status,
          difference,
        });
      }
      
      const dailyStats: DailyStats = {
        date: formatDate(date),
        totalMinutes,
        plannedMinutes,
        unplannedMinutes,
        categoryBreakdown,
        activityBreakdown,
        hasOverlaps,
        goalCompliance,
      };
      
      set({ dailyStats, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  getSessionById: async (id) => {
    try {
      return await sessionRepository.getSessionById(id);
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  createManualSession: async (input) => {
    set({ error: null });
    try {
      const session = await sessionRepository.createSession({
        ...input,
        source: 'manual',
        isRunning: false,
      });
      
      // Reload today's sessions if the session is from today
      await get().loadTodaySessions();
      await get().loadRecentSessions();
      
      return session;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateSession: async (id, updates) => {
    set({ error: null });
    try {
      const session = await sessionRepository.updateSession(id, updates);
      
      if (session) {
        await get().loadTodaySessions();
        await get().loadRecentSessions();
      }
      
      return session;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteSession: async (id) => {
    set({ error: null });
    try {
      const result = await sessionRepository.deleteSession(id);
      
      if (result) {
        await get().loadTodaySessions();
        await get().loadRecentSessions();
      }
      
      return result;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  splitSession: async (sessionId, splitTime, secondActivityId, secondActivityName, secondCategoryId, secondCategoryName) => {
    set({ error: null });
    try {
      const result = await sessionRepository.splitSession(
        sessionId,
        splitTime,
        secondActivityId,
        secondActivityName,
        secondCategoryId,
        secondCategoryName
      );
      
      await get().loadTodaySessions();
      await get().loadRecentSessions();
      
      return result;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  getSessionsForDate: async (date) => {
    try {
      return await sessionRepository.getSessionsForDay(date);
    } catch (error) {
      set({ error: (error as Error).message });
      return [];
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
