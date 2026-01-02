// Date Utilities Unit Tests

import {
  formatDuration,
  formatDurationLong,
  formatTimerDisplay,
  formatDisplayDate,
  getDayStart,
  getDayEnd,
  getWeekStart,
  getWeekEnd,
  calculateDurationMinutes,
  isDateToday,
  isDateYesterday,
  isSameDayCheck,
  getTimeOfDayLabel,
} from '../../src/utils/dateUtils';

describe('Date Utilities', () => {
  describe('formatDuration', () => {
    it('formats minutes only', () => {
      expect(formatDuration(45)).toBe('45m');
    });

    it('formats hours only', () => {
      expect(formatDuration(120)).toBe('2h');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m');
    });

    it('handles less than 1 minute', () => {
      expect(formatDuration(0.5)).toBe('< 1m');
    });
  });

  describe('formatDurationLong', () => {
    it('formats singular minute', () => {
      expect(formatDurationLong(1)).toBe('1 minute');
    });

    it('formats plural minutes', () => {
      expect(formatDurationLong(45)).toBe('45 minutes');
    });

    it('formats singular hour', () => {
      expect(formatDurationLong(60)).toBe('1 hour');
    });

    it('formats hours and minutes together', () => {
      expect(formatDurationLong(90)).toBe('1 hour 30 minutes');
    });
  });

  describe('formatTimerDisplay', () => {
    it('formats seconds under an hour', () => {
      expect(formatTimerDisplay(125)).toBe('02:05');
    });

    it('formats seconds over an hour', () => {
      expect(formatTimerDisplay(3665)).toBe('01:01:05');
    });

    it('formats zero', () => {
      expect(formatTimerDisplay(0)).toBe('00:00');
    });
  });

  describe('getDayStart / getDayEnd', () => {
    it('returns start of day', () => {
      const date = new Date('2026-01-02T15:30:00Z');
      const start = getDayStart(date);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
    });

    it('returns end of day', () => {
      const date = new Date('2026-01-02T10:00:00Z');
      const end = getDayEnd(date);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
    });
  });

  describe('getWeekStart / getWeekEnd', () => {
    it('returns Monday as week start', () => {
      const date = new Date('2026-01-02'); // Friday
      const weekStart = getWeekStart(date);
      expect(weekStart.getDay()).toBe(1); // Monday
    });
  });

  describe('calculateDurationMinutes', () => {
    it('calculates difference in minutes', () => {
      const start = new Date('2026-01-02T10:00:00Z');
      const end = new Date('2026-01-02T10:45:00Z');
      expect(calculateDurationMinutes(start, end)).toBe(45);
    });
  });

  describe('isDateToday / isDateYesterday', () => {
    it('detects today', () => {
      expect(isDateToday(new Date())).toBe(true);
    });

    it('detects yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isDateYesterday(yesterday)).toBe(true);
    });
  });

  describe('isSameDayCheck', () => {
    it('returns true for same day', () => {
      const a = new Date('2026-01-02T08:00:00Z');
      const b = new Date('2026-01-02T20:00:00Z');
      expect(isSameDayCheck(a, b)).toBe(true);
    });

    it('returns false for different days', () => {
      const a = new Date('2026-01-02T08:00:00Z');
      const b = new Date('2026-01-03T08:00:00Z');
      expect(isSameDayCheck(a, b)).toBe(false);
    });
  });

  describe('getTimeOfDayLabel', () => {
    it('returns a string', () => {
      const label = getTimeOfDayLabel();
      expect(['morning', 'afternoon', 'evening', 'night']).toContain(label);
    });
  });
});
