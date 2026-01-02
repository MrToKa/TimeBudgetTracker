// Date Utility Functions

import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  differenceInMinutes,
  differenceInSeconds,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  isSameDay,
  isBefore,
  isAfter,
  isWithinInterval,
  eachDayOfInterval,
  eachWeekOfInterval,
  getDay,
  getHours,
  getMinutes,
} from 'date-fns';

// ============================================
// Date Formatting
// ============================================

export function formatDate(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd HH:mm');
}

export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(d)) {
    return 'Today';
  }
  if (isYesterday(d)) {
    return 'Yesterday';
  }
  if (isThisWeek(d, { weekStartsOn: 1 })) {
    return format(d, 'EEEE'); // Day name
  }
  if (isThisMonth(d)) {
    return format(d, 'EEEE, MMM d');
  }
  return format(d, 'MMM d, yyyy');
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return '< 1m';
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export function formatDurationLong(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
}

export function formatTimerDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
}

// ============================================
// Date Calculations
// ============================================

export function getDayStart(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfDay(d);
}

export function getDayEnd(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return endOfDay(d);
}

export function getWeekStart(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfWeek(d, { weekStartsOn: 1 }); // Monday
}

export function getWeekEnd(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return endOfWeek(d, { weekStartsOn: 1 }); // Sunday
}

export function getMonthStart(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfMonth(d);
}

export function getMonthEnd(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return endOfMonth(d);
}

export function calculateDurationMinutes(startTime: Date | string, endTime: Date | string): number {
  const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  const end = typeof endTime === 'string' ? parseISO(endTime) : endTime;
  return differenceInMinutes(end, start);
}

export function calculateDurationSeconds(startTime: Date | string, endTime: Date | string): number {
  const start = typeof startTime === 'string' ? parseISO(startTime) : startTime;
  const end = typeof endTime === 'string' ? parseISO(endTime) : endTime;
  return differenceInSeconds(end, start);
}

// ============================================
// Date Navigation
// ============================================

export function getNextDay(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addDays(d, 1);
}

export function getPreviousDay(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return subDays(d, 1);
}

export function getNextWeek(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addWeeks(d, 1);
}

export function getPreviousWeek(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return subWeeks(d, 1);
}

export function getNextMonth(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addMonths(d, 1);
}

export function getPreviousMonth(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return subMonths(d, 1);
}

// ============================================
// Date Ranges
// ============================================

export function getDaysInRange(startDate: Date, endDate: Date): Date[] {
  return eachDayOfInterval({ start: startDate, end: endDate });
}

export function getWeeksInRange(startDate: Date, endDate: Date): Date[] {
  return eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
}

// ============================================
// Date Checks
// ============================================

export function isDateToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isToday(d);
}

export function isDateYesterday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isYesterday(d);
}

export function isSameDayCheck(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return isSameDay(d1, d2);
}

export function isDateBefore(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return isBefore(d1, d2);
}

export function isDateAfter(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return isAfter(d1, d2);
}

export function isDateWithinInterval(
  date: Date | string,
  intervalStart: Date | string,
  intervalEnd: Date | string
): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const start = typeof intervalStart === 'string' ? parseISO(intervalStart) : intervalStart;
  const end = typeof intervalEnd === 'string' ? parseISO(intervalEnd) : intervalEnd;
  return isWithinInterval(d, { start, end });
}

// ============================================
// Time Pattern Helpers
// ============================================

export function getCurrentHour(): number {
  return getHours(new Date());
}

export function getCurrentDayOfWeek(): number {
  return getDay(new Date()); // 0 = Sunday, 1 = Monday, etc.
}

export function getTimeOfDayLabel(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = getCurrentHour();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ============================================
// ISO String Helpers
// ============================================

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function fromISOString(isoString: string): Date {
  return parseISO(isoString);
}

export function nowISO(): string {
  return new Date().toISOString();
}
