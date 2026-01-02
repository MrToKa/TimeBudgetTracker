// Timer Store Unit Tests

import { useTimerStore } from '../../src/store/timerStore';
import * as sessionRepository from '../../src/database/repositories/sessionRepository';
import * as activityRepository from '../../src/database/repositories/activityRepository';

// Mock repositories
jest.mock('../../src/database/repositories/sessionRepository');
jest.mock('../../src/database/repositories/activityRepository');

const mockSessionRepo = sessionRepository as jest.Mocked<typeof sessionRepository>;
const mockActivityRepo = activityRepository as jest.Mocked<typeof activityRepository>;

describe('Timer Store', () => {
  beforeEach(() => {
    // Reset store state
    useTimerStore.setState({ runningTimers: [], isLoading: false, error: null });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty running timers', () => {
      const { runningTimers } = useTimerStore.getState();
      expect(runningTimers).toEqual([]);
    });

    it('starts with isLoading false', () => {
      const { isLoading } = useTimerStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('loadRunningTimers', () => {
    it('loads running sessions from database', async () => {
      mockSessionRepo.getRunningSession.mockResolvedValue([
        {
          id: 'session-1',
          activityId: 'act-1',
          activityNameSnapshot: 'Test Activity',
          categoryId: 'cat-1',
          categoryNameSnapshot: 'Test Category',
          startTime: new Date().toISOString(),
          endTime: null,
          actualDurationMinutes: null,
          expectedDurationMinutes: 30,
          isPlanned: true,
          source: 'timer',
          isRunning: true,
          idlePromptEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await useTimerStore.getState().loadRunningTimers();

      const { runningTimers, isLoading } = useTimerStore.getState();
      expect(runningTimers).toHaveLength(1);
      expect(runningTimers[0].activityName).toBe('Test Activity');
      expect(isLoading).toBe(false);
    });

    it('handles errors gracefully', async () => {
      mockSessionRepo.getRunningSession.mockRejectedValue(new Error('DB Error'));

      await useTimerStore.getState().loadRunningTimers();

      const { error, isLoading } = useTimerStore.getState();
      expect(error).toBe('DB Error');
      expect(isLoading).toBe(false);
    });
  });

  describe('stopTimer', () => {
    it('removes timer from running timers', async () => {
      // Setup initial state with a timer
      useTimerStore.setState({
        runningTimers: [
          {
            id: 'timer-1',
            sessionId: 'session-1',
            activityId: 'act-1',
            activityName: 'Test',
            categoryId: 'cat-1',
            categoryName: 'Category',
            categoryColor: '#000',
            startTime: new Date(),
            expectedDurationMinutes: null,
            isPlanned: true,
            idlePromptEnabled: true,
          },
        ],
      });

      mockSessionRepo.stopSession.mockResolvedValue({
        id: 'session-1',
        activityId: 'act-1',
        activityNameSnapshot: 'Test',
        categoryId: 'cat-1',
        categoryNameSnapshot: 'Category',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        actualDurationMinutes: 30,
        expectedDurationMinutes: null,
        isPlanned: true,
        source: 'timer',
        isRunning: false,
        idlePromptEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await useTimerStore.getState().stopTimer('timer-1');

      const { runningTimers } = useTimerStore.getState();
      expect(runningTimers).toHaveLength(0);
    });
  });

  describe('getTimerDuration', () => {
    it('returns elapsed seconds for running timer', () => {
      const startTime = new Date(Date.now() - 60000); // 1 minute ago
      useTimerStore.setState({
        runningTimers: [
          {
            id: 'timer-1',
            sessionId: 'session-1',
            activityId: 'act-1',
            activityName: 'Test',
            categoryId: 'cat-1',
            categoryName: 'Category',
            categoryColor: '#000',
            startTime,
            expectedDurationMinutes: null,
            isPlanned: true,
            idlePromptEnabled: true,
          },
        ],
      });

      const duration = useTimerStore.getState().getTimerDuration('timer-1');
      expect(duration).toBeGreaterThanOrEqual(59);
      expect(duration).toBeLessThanOrEqual(61);
    });

    it('returns 0 for non-existent timer', () => {
      const duration = useTimerStore.getState().getTimerDuration('non-existent');
      expect(duration).toBe(0);
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      useTimerStore.setState({ error: 'Some error' });
      useTimerStore.getState().clearError();
      expect(useTimerStore.getState().error).toBeNull();
    });
  });
});
