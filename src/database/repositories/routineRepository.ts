// Routine Repository - Database Operations for Routines

import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeQuerySingle, executeSql } from '../database';
import { Routine, RoutineType, RoutineItem, RoutineWithItems, Activity } from '../../types';
import { nowISO } from '../../utils/dateUtils';

// Database row types (snake_case)
interface RoutineRow {
  id: string;
  name: string;
  routine_type: RoutineType;
  start_time: string | null;
  day_filter: 'all' | 'weekdays' | 'weekend' | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface RoutineItemRow {
  id: string;
  routine_id: string;
  activity_id: string;
  scheduled_time: string | null;
  expected_duration_minutes: number | null;
  day_of_week: number | null;
  display_order: number;
}

// Convert database row to Routine type
function rowToRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    routineType: row.routine_type,
    startTime: row.start_time ?? null,
    dayFilter: (row.day_filter as Routine['dayFilter']) ?? 'all',
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToRoutineItem(row: RoutineItemRow): RoutineItem {
  return {
    id: row.id,
    routineId: row.routine_id,
    activityId: row.activity_id,
    scheduledTime: row.scheduled_time,
    expectedDurationMinutes: row.expected_duration_minutes,
    dayOfWeek: row.day_of_week,
    displayOrder: row.display_order,
  };
}

const normalizeRoutineStartTime = (value?: string | null): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

// ============================================
// Routine CRUD Operations
// ============================================

export async function getAllRoutines(activeOnly = true): Promise<Routine[]> {
  const activeClause = activeOnly ? 'WHERE is_active = 1' : '';
  const rows = await executeQuery<RoutineRow>(
    `SELECT * FROM routines ${activeClause} ORDER BY name`
  );
  return rows.map(rowToRoutine);
}

export async function getRoutineById(id: string): Promise<Routine | null> {
  const row = await executeQuerySingle<RoutineRow>(
    'SELECT * FROM routines WHERE id = ?',
    [id]
  );
  return row ? rowToRoutine(row) : null;
}

export async function getRoutineWithItems(id: string): Promise<RoutineWithItems | null> {
  const routine = await getRoutineById(id);
  if (!routine) {
    return null;
  }

  const itemRows = await executeQuery<RoutineItemRow & { 
    activity_name: string;
    category_id: string;
    default_expected_minutes: number | null;
    is_planned_default: number;
    is_favorite: number;
    idle_prompt_enabled: number;
    is_archived: number;
    usage_count: number;
    last_used_at: string | null;
    activity_created_at: string;
    activity_updated_at: string;
  }>(
    `SELECT ri.*, a.name as activity_name, a.category_id, 
            a.default_expected_minutes, a.is_planned_default, a.is_favorite,
            a.display_order as activity_display_order, a.idle_prompt_enabled, 
            a.is_archived, a.usage_count, a.last_used_at,
            a.created_at as activity_created_at, a.updated_at as activity_updated_at
     FROM routine_items ri
     JOIN activities a ON ri.activity_id = a.id
     WHERE ri.routine_id = ?
     ORDER BY ri.display_order`,
    [id]
  );

  const items = itemRows.map(row => ({
    ...rowToRoutineItem(row),
    activity: {
      id: row.activity_id,
      name: row.activity_name,
      categoryId: row.category_id,
      defaultExpectedMinutes: row.default_expected_minutes,
      isPlannedDefault: row.is_planned_default === 1,
      isFavorite: row.is_favorite === 1,
      displayOrder: row.display_order,
      idlePromptEnabled: row.idle_prompt_enabled === 1,
      isArchived: row.is_archived === 1,
      usageCount: row.usage_count,
      lastUsedAt: row.last_used_at,
      createdAt: row.activity_created_at,
      updatedAt: row.activity_updated_at,
    } as Activity,
  }));

  return {
    ...routine,
    items,
  };
}

interface CreateRoutineInput {
  name: string;
  routineType: RoutineType;
  startTime?: string | null;
  dayFilter?: Routine['dayFilter'];
}

export async function createRoutine(input: CreateRoutineInput): Promise<Routine> {
  const id = uuidv4();
  const now = nowISO();
  const normalizedStartTime = normalizeRoutineStartTime(input.startTime);

  await executeSql(
    `INSERT INTO routines (id, name, routine_type, start_time, day_filter, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, input.name, input.routineType, normalizedStartTime ?? null, input.dayFilter ?? 'all', now, now]
  );

  const routine = await getRoutineById(id);
  if (!routine) {
    throw new Error('Failed to create routine');
  }
  return routine;
}

export async function updateRoutine(
  id: string,
  updates: Partial<CreateRoutineInput> & { isActive?: boolean }
): Promise<Routine | null> {
  const existing = await getRoutineById(id);
  if (!existing) {
    return null;
  }

  const now = nowISO();
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.routineType !== undefined) {
    fields.push('routine_type = ?');
    values.push(updates.routineType);
  }
  const normalizedStartTime = normalizeRoutineStartTime(updates.startTime);
  if (normalizedStartTime !== undefined) {
    fields.push('start_time = ?');
    values.push(normalizedStartTime);
  }
  if (updates.dayFilter !== undefined) {
    fields.push('day_filter = ?');
    values.push(updates.dayFilter);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }

  values.push(id);

  await executeSql(
    `UPDATE routines SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  return getRoutineById(id);
}

export async function deleteRoutine(id: string): Promise<boolean> {
  // Delete routine items first
  await executeSql('DELETE FROM routine_items WHERE routine_id = ?', [id]);
  const result = await executeSql('DELETE FROM routines WHERE id = ?', [id]);
  return result.rowsAffected > 0;
}

export async function toggleRoutineActive(id: string): Promise<boolean> {
  const routine = await getRoutineById(id);
  if (!routine) {
    return false;
  }

  await executeSql(
    'UPDATE routines SET is_active = ?, updated_at = ? WHERE id = ?',
    [routine.isActive ? 0 : 1, nowISO(), id]
  );
  return true;
}

// ============================================
// Routine Item Operations
// ============================================

interface CreateRoutineItemInput {
  routineId: string;
  activityId: string;
  scheduledTime?: string | null;
  expectedDurationMinutes?: number | null;
  dayOfWeek?: number | null;
}

export interface RoutineSchedule {
  routineId: string;
  routineName: string;
  routineType: RoutineType;
  scheduledTime: string;
  dayFilter: Routine['dayFilter'];
}

export async function addRoutineItem(input: CreateRoutineItemInput): Promise<RoutineItem> {
  const id = uuidv4();

  // Get max display order
  const maxOrder = await executeQuerySingle<{ max_order: number }>(
    'SELECT MAX(display_order) as max_order FROM routine_items WHERE routine_id = ?',
    [input.routineId]
  );
  const displayOrder = (maxOrder?.max_order ?? -1) + 1;

  await executeSql(
    `INSERT INTO routine_items (id, routine_id, activity_id, scheduled_time, expected_duration_minutes, day_of_week, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.routineId,
      input.activityId,
      input.scheduledTime ?? null,
      input.expectedDurationMinutes ?? null,
      input.dayOfWeek ?? null,
      displayOrder,
    ]
  );

  const row = await executeQuerySingle<RoutineItemRow>(
    'SELECT * FROM routine_items WHERE id = ?',
    [id]
  );
  if (!row) {
    throw new Error('Failed to create routine item');
  }
  return rowToRoutineItem(row);
}

export async function updateRoutineItem(
  id: string,
  updates: Partial<CreateRoutineItemInput>
): Promise<RoutineItem | null> {
  const existing = await executeQuerySingle<RoutineItemRow>(
    'SELECT * FROM routine_items WHERE id = ?',
    [id]
  );
  if (!existing) {
    return null;
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.activityId !== undefined) {
    fields.push('activity_id = ?');
    values.push(updates.activityId);
  }
  if (updates.scheduledTime !== undefined) {
    fields.push('scheduled_time = ?');
    values.push(updates.scheduledTime);
  }
  if (updates.expectedDurationMinutes !== undefined) {
    fields.push('expected_duration_minutes = ?');
    values.push(updates.expectedDurationMinutes);
  }
  if (updates.dayOfWeek !== undefined) {
    fields.push('day_of_week = ?');
    values.push(updates.dayOfWeek);
  }

  if (fields.length === 0) {
    return rowToRoutineItem(existing);
  }

  values.push(id);

  await executeSql(
    `UPDATE routine_items SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  const row = await executeQuerySingle<RoutineItemRow>(
    'SELECT * FROM routine_items WHERE id = ?',
    [id]
  );
  return row ? rowToRoutineItem(row) : null;
}

export async function deleteRoutineItem(id: string): Promise<boolean> {
  const result = await executeSql('DELETE FROM routine_items WHERE id = ?', [id]);
  return result.rowsAffected > 0;
}

export async function reorderRoutineItems(
  routineId: string,
  itemIds: string[]
): Promise<void> {
  for (let i = 0; i < itemIds.length; i++) {
    await executeSql(
      'UPDATE routine_items SET display_order = ? WHERE id = ? AND routine_id = ?',
      [i, itemIds[i], routineId]
    );
  }
}

export async function getRoutineSchedules(): Promise<RoutineSchedule[]> {
  const rows = await executeQuery<{
    routine_id: string;
    routine_name: string;
    routine_type: RoutineType;
    scheduledTime: string | null;
    dayFilter: Routine['dayFilter'] | null;
  }>(
    `SELECT 
       r.id as routine_id,
       r.name as routine_name,
       r.routine_type,
       r.start_time as scheduledTime,
       r.day_filter as dayFilter
     FROM routines r
     WHERE r.is_active = 1
       AND r.start_time IS NOT NULL
       AND EXISTS (SELECT 1 FROM routine_items ri WHERE ri.routine_id = r.id)`
  );

  return rows.map(row => ({
    routineId: row.routine_id,
    routineName: row.routine_name,
    routineType: row.routine_type,
    scheduledTime: row.scheduledTime ?? '',
    dayFilter: row.dayFilter ?? 'all',
  }));
}
