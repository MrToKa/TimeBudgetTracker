// Session Store Tests

// Mock the repositories before importing the store
const mockGetSessionsForDay = jest.fn();
const mockGetRecentSessions = jest.fn();
const mockGetSessionById = jest.fn();
const mockCreateSession = jest.fn();
const mockUpdateSession = jest.fn();
const mockDeleteSession = jest.fn();

jest.mock('../../src/database/repositories/sessionRepository', () => ({
  getSessionsForDay: (...args: any[]) => mockGetSessionsForDay(...args),
  getRecentSessions: (...args: any[]) => mockGetRecentSessions(...args),
  getSessionById: (...args: any[]) => mockGetSessionById(...args),
  createSession: (...args: any[]) => mockCreateSession(...args),
  updateSession: (...args: any[]) => mockUpdateSession(...args),
  deleteSession: (...args: any[]) => mockDeleteSession(...args),
}));

jest.mock('../../src/database/repositories/goalRepository', () => ({
  getAllGoals: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/utils/dateUtils', () => ({
  getDayStart: jest.fn((date: Date) => new Date(date.setHours(0, 0, 0, 0))),
  getDayEnd: jest.fn((date: Date) => new Date(date.setHours(23, 59, 59, 999))),
  formatDate: jest.fn((date: Date) => date.toISOString().split('T')[0]),
}));

import { useSessionStore } from '../../src/store/sessionStore';

describe('sessionStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useSessionStore.setState({
      todaySessions: [],
      recentSessions: [],
      dailyStats: null,
      isLoading: false,
      error: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useSessionStore.getState();

      expect(state.todaySessions).toEqual([]);
      expect(state.recentSessions).toEqual([]);
      expect(state.dailyStats).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadTodaySessions', () => {
    it('should load today sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'sess-1',
          activityId: 'act-1',
          activityName: 'Work',
          categoryId: 'cat-1',
          categoryName: 'Productivity',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 3600,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockGetSessionsForDay.mockResolvedValue(mockSessions);

      await useSessionStore.getState().loadTodaySessions();

      const state = useSessionStore.getState();
      expect(state.todaySessions).toEqual(mockSessions);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on failure', async () => {
      mockGetSessionsForDay.mockRejectedValue(new Error('Database error'));

      await useSessionStore.getState().loadTodaySessions();

      const state = useSessionStore.getState();
      expect(state.error).toBe('Database error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadRecentSessions', () => {
    it('should load recent sessions with default limit', async () => {
      const mockSessions = [
        {
          id: 'sess-1',
          activityId: 'act-1',
          activityName: 'Work',
          startTime: new Date().toISOString(),
          duration: 3600,
        },
      ];

      mockGetRecentSessions.mockResolvedValue(mockSessions);

      await useSessionStore.getState().loadRecentSessions();

      const state = useSessionStore.getState();
      expect(mockGetRecentSessions).toHaveBeenCalledWith(20);
      expect(state.recentSessions).toEqual(mockSessions);
    });

    it('should load recent sessions with custom limit', async () => {
      mockGetRecentSessions.mockResolvedValue([]);

      await useSessionStore.getState().loadRecentSessions(10);

      expect(mockGetRecentSessions).toHaveBeenCalledWith(10);
    });
  });

  describe('getSessionById', () => {
    it('should get session by id', async () => {
      const mockSession = {
        id: 'sess-1',
        activityId: 'act-1',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 3600,
      };

      mockGetSessionById.mockResolvedValue(mockSession);

      const result = await useSessionStore.getState().getSessionById('sess-1');

      expect(mockGetSessionById).toHaveBeenCalledWith('sess-1');
      expect(result).toEqual(mockSession);
    });

    it('should return null for non-existent session', async () => {
      mockGetSessionById.mockResolvedValue(null);

      const result = await useSessionStore.getState().getSessionById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      // Setup initial state with sessions
      useSessionStore.setState({
        todaySessions: [
          {
            id: 'sess-1',
            activityId: 'act-1',
            activityName: 'Work',
            categoryId: 'cat-1',
            categoryName: 'Productivity',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: 3600,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        recentSessions: [],
        dailyStats: null,
        isLoading: false,
        error: null,
      });

      mockDeleteSession.mockResolvedValue(true);

      const result = await useSessionStore.getState().deleteSession('sess-1');

      expect(mockDeleteSession).toHaveBeenCalledWith('sess-1');
      expect(result).toBe(true);
    });

    it('should return false when session not found', async () => {
      mockDeleteSession.mockResolvedValue(false);

      const result = await useSessionStore.getState().deleteSession('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useSessionStore.setState({
        todaySessions: [],
        recentSessions: [],
        dailyStats: null,
        isLoading: false,
        error: 'Some error',
      });

      useSessionStore.getState().clearError();

      const state = useSessionStore.getState();
      expect(state.error).toBeNull();
    });
  });
});