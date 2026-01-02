// Session Repository - Database Operations for Time Sessions

import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeQuerySingle, executeSql } from '../database';
import { TimeSession, SessionWithDetails, CreateSessionInput, UpdateSessionInput, SessionSource } from '../../types';
import { nowISO, getDayStart, getDayEnd, getWeekStart, getWeekEnd, getMonthStart, getMonthEnd, calculateDurationMinutes } from '../../utils/dateUtils';

// Database row type (snake_case)
interface SessionRow {
  id: string;
  activity_id: string | null;
  activity_name_snapshot: string;
  category_id: string | null;
  category_name_snapshot: string;
  start_time: string;
  end_time: string | null;
  actual_duration_minutes: number | null;
  expected_duration_minutes: number | null;
  is_planned: number;
  source: SessionSource;
  is_running: number;
  idle_prompt_enabled: number;
  created_at: string;
  updated_at: string;
}

interface SessionWithDetailsRow extends SessionRow {
  category_color?: string;
  category_icon?: string;
}

// Convert database row to TimeSession type
function rowToSession(row: SessionRow): TimeSession {
  return {
    id: row.id,
    activityId: row.activity_id,
    activityNameSnapshot: row.activity_name_snapshot,
    categoryId: row.category_id,
    categoryNameSnapshot: row.category_name_snapshot,
    startTime: row.start_time,
    endTime: row.end_time,
    actualDurationMinutes: row.actual_duration_minutes,
    expectedDurationMinutes: row.expected_duration_minutes,
    isPlanned: row.is_planned === 1,
    source: row.source,
    isRunning: row.is_running === 1,
    idlePromptEnabled: row.idle_prompt_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSessionWithDetails(row: SessionWithDetailsRow): SessionWithDetails {
  return {
    ...rowToSession(row),
    categoryColor: row.category_color,
    categoryIcon: row.category_icon,
  };
}

// ============================================
// CRUD Operations
// ============================================

export async function getSessionById(id: string): Promise<TimeSession | null> {
  const row = await executeQuerySingle<SessionRow>(
    'SELECT * FROM time_sessions WHERE id = ?',
    [id]
  );
  return row ? rowToSession(row) : null;
}

export async function createSession(input: CreateSessionInput): Promise<TimeSession> {
  const id = uuidv4();
  const now = nowISO();
  
  await executeSql(
    `INSERT INTO time_sessions (id, activity_id, activity_name_snapshot, category_id, category_name_snapshot, start_time, end_time, actual_duration_minutes, expected_duration_minutes, is_planned, source, is_running, idle_prompt_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.activityId ?? null,
      input.activityNameSnapshot,
      input.categoryId ?? null,
      input.categoryNameSnapshot,
      input.startTime,
      input.endTime ?? null,
      input.actualDurationMinutes ?? null,
      input.expectedDurationMinutes ?? null,
      input.isPlanned !== false ? 1 : 0,
      input.source,
      input.isRunning === true ? 1 : 0,
      input.idlePromptEnabled !== false ? 1 : 0,
      now,
      now,
    ]
  );
  
  const session = await getSessionById(id);
  if (!session) {
    throw new Error('Failed to create session');
  }
  return session;
}

export async function updateSession(
  id: string,
  updates: UpdateSessionInput
): Promise<TimeSession | null> {
  const existing = await getSessionById(id);
  if (!existing) {
    return null;
  }
  
  const now = nowISO();
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [now];
  
  if (updates.activityId !== undefined) {
    fields.push('activity_id = ?');
    values.push(updates.activityId);
  }
  if (updates.activityNameSnapshot !== undefined) {
    fields.push('activity_name_snapshot = ?');
    values.push(updates.activityNameSnapshot);
  }
  if (updates.categoryId !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.categoryId);
  }
  if (updates.categoryNameSnapshot !== undefined) {
    fields.push('category_name_snapshot = ?');
    values.push(updates.categoryNameSnapshot);
  }
  if (updates.startTime !== undefined) {
    fields.push('start_time = ?');
    values.push(updates.startTime);
  }
  if (updates.endTime !== undefined) {
    fields.push('end_time = ?');
    values.push(updates.endTime);
  }
  if (updates.actualDurationMinutes !== undefined) {
    fields.push('actual_duration_minutes = ?');
    values.push(updates.actualDurationMinutes);
  }
  if (updates.expectedDurationMinutes !== undefined) {
    fields.push('expected_duration_minutes = ?');
    values.push(updates.expectedDurationMinutes);
  }
  if (updates.isPlanned !== undefined) {
    fields.push('is_planned = ?');
    values.push(updates.isPlanned ? 1 : 0);
  }
  if (updates.isRunning !== undefined) {
    fields.push('is_running = ?');
    values.push(updates.isRunning ? 1 : 0);
  }
  
  values.push(id);
  
  await executeSql(
    `UPDATE time_sessions SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  return getSessionById(id);
}

export async function deleteSession(id: string): Promise<boolean> {
  const result = await executeSql('DELETE FROM time_sessions WHERE id = ?', [id]);
  return result.rowsAffected > 0;
}

// ============================================
// Timer Operations
// ============================================

export async function getRunningSession(): Promise<TimeSession[]> {
  const rows = await executeQuery<SessionRow>(
    'SELECT * FROM time_sessions WHERE is_running = 1 ORDER BY start_time DESC'
  );
  return rows.map(rowToSession);
}

export async function stopSession(id: string): Promise<TimeSession | null> {
  const session = await getSessionById(id);
  if (!session || !session.isRunning) {
    return null;
  }
  
  const endTime = nowISO();
  const durationMinutes = calculateDurationMinutes(session.startTime, endTime);
  
  await executeSql(
    `UPDATE time_sessions 
     SET is_running = 0, end_time = ?, actual_duration_minutes = ?, updated_at = ?
     WHERE id = ?`,
    [endTime, durationMinutes, nowISO(), id]
  );
  
  return getSessionById(id);
}

export async function stopAllRunningSessions(): Promise<number> {
  const running = await getRunningSession();
  let stopped = 0;
  
  for (const session of running) {
    await stopSession(session.id);
    stopped++;
  }
  
  return stopped;
}

// ============================================
// Query by Date Range
// ============================================

export async function getSessionsForDay(date: Date | string): Promise<SessionWithDetails[]> {
  const dayStart = getDayStart(date).toISOString();
  const dayEnd = getDayEnd(date).toISOString();
  
  const rows = await executeQuery<SessionWithDetailsRow>(
    `SELECT s.*, c.color as category_color, c.icon as category_icon
     FROM time_sessions s
     LEFT JOIN categories c ON s.category_id = c.id
     WHERE s.start_time >= ? AND s.start_time <= ?
     ORDER BY s.start_time ASC`,
    [dayStart, dayEnd]
  );
  
  return rows.map(rowToSessionWithDetails);
}

export async function getSessionsForWeek(date: Date | string): Promise<SessionWithDetails[]> {
  const weekStart = getWeekStart(date).toISOString();
  const weekEnd = getWeekEnd(date).toISOString();
  
  const rows = await executeQuery<SessionWithDetailsRow>(
    `SELECT s.*, c.color as category_color, c.icon as category_icon
     FROM time_sessions s
     LEFT JOIN categories c ON s.category_id = c.id
     WHERE s.start_time >= ? AND s.start_time <= ?
     ORDER BY s.start_time ASC`,
    [weekStart, weekEnd]
  );
  
  return rows.map(rowToSessionWithDetails);
}

export async function getSessionsForMonth(date: Date | string): Promise<SessionWithDetails[]> {
  const monthStart = getMonthStart(date).toISOString();
  const monthEnd = getMonthEnd(date).toISOString();
  
  const rows = await executeQuery<SessionWithDetailsRow>(
    `SELECT s.*, c.color as category_color, c.icon as category_icon
     FROM time_sessions s
     LEFT JOIN categories c ON s.category_id = c.id
     WHERE s.start_time >= ? AND s.start_time <= ?
     ORDER BY s.start_time ASC`,
    [monthStart, monthEnd]
  );
  
  return rows.map(rowToSessionWithDetails);
}

export async function getSessionsInRange(
  startDate: Date | string,
  endDate: Date | string
): Promise<SessionWithDetails[]> {
  const start = typeof startDate === 'string' ? startDate : startDate.toISOString();
  const end = typeof endDate === 'string' ? endDate : endDate.toISOString();
  
  const rows = await executeQuery<SessionWithDetailsRow>(
    `SELECT s.*, c.color as category_color, c.icon as category_icon
     FROM time_sessions s
     LEFT JOIN categories c ON s.category_id = c.id
     WHERE s.start_time >= ? AND s.start_time <= ?
     ORDER BY s.start_time ASC`,
    [start, end]
  );
  
  return rows.map(rowToSessionWithDetails);
}

// ============================================
// Aggregation Queries
// ============================================

export async function getTotalMinutesForDay(
  date: Date | string,
  activityId?: string
): Promise<number> {
  const dayStart = getDayStart(date).toISOString();
  const dayEnd = getDayEnd(date).toISOString();
  
  let query = `
    SELECT COALESCE(SUM(actual_duration_minutes), 0) as total
    FROM time_sessions
    WHERE start_time >= ? AND start_time <= ? AND is_running = 0
  `;
  const params: any[] = [dayStart, dayEnd];
  
  if (activityId) {
    query += ' AND activity_id = ?';
    params.push(activityId);
  }
  
  const result = await executeQuerySingle<{ total: number }>(query, params);
  return result?.total ?? 0;
}

export async function getTotalMinutesByCategory(
  startDate: Date | string,
  endDate: Date | string
): Promise<{ categoryId: string; categoryName: string; totalMinutes: number }[]> {
  const start = typeof startDate === 'string' ? startDate : startDate.toISOString();
  const end = typeof endDate === 'string' ? endDate : endDate.toISOString();
  
  const rows = await executeQuery<{
    category_id: string;
    category_name_snapshot: string;
    total_minutes: number;
  }>(
    `SELECT category_id, category_name_snapshot, SUM(actual_duration_minutes) as total_minutes
     FROM time_sessions
     WHERE start_time >= ? AND start_time <= ? AND is_running = 0
     GROUP BY category_id, category_name_snapshot
     ORDER BY total_minutes DESC`,
    [start, end]
  );
  
  return rows.map(row => ({
    categoryId: row.category_id,
    categoryName: row.category_name_snapshot,
    totalMinutes: row.total_minutes ?? 0,
  }));
}

export async function getTotalMinutesByActivity(
  startDate: Date | string,
  endDate: Date | string
): Promise<{ activityId: string; activityName: string; totalMinutes: number; sessionsCount: number }[]> {
  const start = typeof startDate === 'string' ? startDate : startDate.toISOString();
  const end = typeof endDate === 'string' ? endDate : endDate.toISOString();
  
  const rows = await executeQuery<{
    activity_id: string;
    activity_name_snapshot: string;
    total_minutes: number;
    sessions_count: number;
  }>(
    `SELECT activity_id, activity_name_snapshot, SUM(actual_duration_minutes) as total_minutes, COUNT(*) as sessions_count
     FROM time_sessions
     WHERE start_time >= ? AND start_time <= ? AND is_running = 0
     GROUP BY activity_id, activity_name_snapshot
     ORDER BY total_minutes DESC`,
    [start, end]
  );
  
  return rows.map(row => ({
    activityId: row.activity_id,
    activityName: row.activity_name_snapshot,
    totalMinutes: row.total_minutes ?? 0,
    sessionsCount: row.sessions_count,
  }));
}

export async function getPlannedVsUnplannedMinutes(
  startDate: Date | string,
  endDate: Date | string
): Promise<{ plannedMinutes: number; unplannedMinutes: number }> {
  const start = typeof startDate === 'string' ? startDate : startDate.toISOString();
  const end = typeof endDate === 'string' ? endDate : endDate.toISOString();
  
  const result = await executeQuerySingle<{
    planned_minutes: number;
    unplanned_minutes: number;
  }>(
    `SELECT 
       COALESCE(SUM(CASE WHEN is_planned = 1 THEN actual_duration_minutes ELSE 0 END), 0) as planned_minutes,
       COALESCE(SUM(CASE WHEN is_planned = 0 THEN actual_duration_minutes ELSE 0 END), 0) as unplanned_minutes
     FROM time_sessions
     WHERE start_time >= ? AND start_time <= ? AND is_running = 0`,
    [start, end]
  );
  
  return {
    plannedMinutes: result?.planned_minutes ?? 0,
    unplannedMinutes: result?.unplanned_minutes ?? 0,
  };
}

// ============================================
// Session Splitting
// ============================================

export async function splitSession(
  sessionId: string,
  splitTime: Date | string,
  secondActivityId: string | null,
  secondActivityName: string,
  secondCategoryId: string | null,
  secondCategoryName: string
): Promise<{ first: TimeSession; second: TimeSession }> {
  const original = await getSessionById(sessionId);
  if (!original) {
    throw new Error('Session not found');
  }
  
  const splitTimeStr = typeof splitTime === 'string' ? splitTime : splitTime.toISOString();
  const now = nowISO();
  
  // Calculate durations
  const firstDuration = calculateDurationMinutes(original.startTime, splitTimeStr);
  const secondDuration = original.endTime 
    ? calculateDurationMinutes(splitTimeStr, original.endTime) 
    : null;
  
  // Update original session
  await executeSql(
    `UPDATE time_sessions 
     SET end_time = ?, actual_duration_minutes = ?, updated_at = ?
     WHERE id = ?`,
    [splitTimeStr, firstDuration, now, sessionId]
  );
  
  // Create second session
  const secondSession = await createSession({
    activityId: secondActivityId,
    activityNameSnapshot: secondActivityName,
    categoryId: secondCategoryId,
    categoryNameSnapshot: secondCategoryName,
    startTime: splitTimeStr,
    endTime: original.endTime,
    actualDurationMinutes: secondDuration,
    expectedDurationMinutes: null,
    isPlanned: original.isPlanned,
    source: 'manual',
    isRunning: false,
  });
  
  const first = await getSessionById(sessionId);
  if (!first) {
    throw new Error('Failed to get updated first session');
  }
  
  return { first, second: secondSession };
}

// ============================================
// Recent Sessions
// ============================================

export async function getRecentSessions(limit = 20): Promise<SessionWithDetails[]> {
  const rows = await executeQuery<SessionWithDetailsRow>(
    `SELECT s.*, c.color as category_color, c.icon as category_icon
     FROM time_sessions s
     LEFT JOIN categories c ON s.category_id = c.id
     ORDER BY s.start_time DESC
     LIMIT ?`,
    [limit]
  );
  
  return rows.map(rowToSessionWithDetails);
}
