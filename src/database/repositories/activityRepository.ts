// Activity Repository - Database Operations for Activities

import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeQuerySingle, executeSql } from '../database';
import { Activity, ActivityWithCategory, CreateActivityInput, UpdateActivityInput } from '../../types';
import { nowISO } from '../../utils/dateUtils';

// Database row type (snake_case)
interface ActivityRow {
  id: string;
  name: string;
  category_id: string;
  default_expected_minutes: number | null;
  is_planned_default: number;
  is_favorite: number;
  display_order: number;
  idle_prompt_enabled: number;
  is_archived: number;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ActivityWithCategoryRow extends ActivityRow {
  category_name: string;
  category_color: string;
  category_icon: string;
}

// Convert database row to Activity type
function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    defaultExpectedMinutes: row.default_expected_minutes,
    isPlannedDefault: row.is_planned_default === 1,
    isFavorite: row.is_favorite === 1,
    displayOrder: row.display_order,
    idlePromptEnabled: row.idle_prompt_enabled === 1,
    isArchived: row.is_archived === 1,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToActivityWithCategory(row: ActivityWithCategoryRow): ActivityWithCategory {
  return {
    ...rowToActivity(row),
    categoryName: row.category_name,
    categoryColor: row.category_color,
    categoryIcon: row.category_icon,
  };
}

// ============================================
// CRUD Operations
// ============================================

export async function getAllActivities(includeArchived = false): Promise<Activity[]> {
  const archivedClause = includeArchived ? '' : 'WHERE is_archived = 0';
  const rows = await executeQuery<ActivityRow>(
    `SELECT * FROM activities ${archivedClause} ORDER BY display_order ASC`
  );
  return rows.map(rowToActivity);
}

export async function getActivityById(id: string): Promise<Activity | null> {
  const row = await executeQuerySingle<ActivityRow>(
    'SELECT * FROM activities WHERE id = ?',
    [id]
  );
  return row ? rowToActivity(row) : null;
}

export async function getActivityByIdWithCategory(id: string): Promise<ActivityWithCategory | null> {
  const row = await executeQuerySingle<ActivityWithCategoryRow>(
    `SELECT a.*, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM activities a
     JOIN categories c ON a.category_id = c.id
     WHERE a.id = ?`,
    [id]
  );
  return row ? rowToActivityWithCategory(row) : null;
}

export async function getActivitiesByCategory(
  categoryId: string,
  includeArchived = false
): Promise<Activity[]> {
  const archivedClause = includeArchived ? '' : 'AND is_archived = 0';
  const rows = await executeQuery<ActivityRow>(
    `SELECT * FROM activities WHERE category_id = ? ${archivedClause} ORDER BY display_order ASC`,
    [categoryId]
  );
  return rows.map(rowToActivity);
}

export async function getActivitiesWithCategories(includeArchived = false): Promise<ActivityWithCategory[]> {
  const archivedClause = includeArchived ? '' : 'WHERE a.is_archived = 0';
  const rows = await executeQuery<ActivityWithCategoryRow>(
    `SELECT a.*, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM activities a
     JOIN categories c ON a.category_id = c.id
     ${archivedClause}
     ORDER BY a.display_order ASC`
  );
  return rows.map(rowToActivityWithCategory);
}

export async function getFavoriteActivities(): Promise<ActivityWithCategory[]> {
  const rows = await executeQuery<ActivityWithCategoryRow>(
    `SELECT a.*, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM activities a
     JOIN categories c ON a.category_id = c.id
     WHERE a.is_favorite = 1 AND a.is_archived = 0
     ORDER BY a.display_order ASC`
  );
  return rows.map(rowToActivityWithCategory);
}

export async function createActivity(input: CreateActivityInput): Promise<Activity> {
  const id = uuidv4();
  const now = nowISO();
  
  // Get max display order for the category
  const maxOrderResult = await executeQuerySingle<{ max_order: number }>(
    'SELECT MAX(display_order) as max_order FROM activities WHERE category_id = ?',
    [input.categoryId]
  );
  const displayOrder = (maxOrderResult?.max_order ?? -1) + 1;
  
  await executeSql(
    `INSERT INTO activities (id, name, category_id, default_expected_minutes, is_planned_default, is_favorite, display_order, idle_prompt_enabled, is_archived, usage_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    [
      id,
      input.name,
      input.categoryId,
      input.defaultExpectedMinutes ?? null,
      input.isPlannedDefault !== false ? 1 : 0,
      input.isFavorite === true ? 1 : 0,
      displayOrder,
      input.idlePromptEnabled !== false ? 1 : 0,
      now,
      now,
    ]
  );
  
  const activity = await getActivityById(id);
  if (!activity) {
    throw new Error('Failed to create activity');
  }
  return activity;
}

export async function updateActivity(
  id: string,
  updates: UpdateActivityInput
): Promise<Activity | null> {
  const existing = await getActivityById(id);
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
  if (updates.categoryId !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.categoryId);
  }
  if (updates.defaultExpectedMinutes !== undefined) {
    fields.push('default_expected_minutes = ?');
    values.push(updates.defaultExpectedMinutes);
  }
  if (updates.isPlannedDefault !== undefined) {
    fields.push('is_planned_default = ?');
    values.push(updates.isPlannedDefault ? 1 : 0);
  }
  if (updates.isFavorite !== undefined) {
    fields.push('is_favorite = ?');
    values.push(updates.isFavorite ? 1 : 0);
  }
  if (updates.displayOrder !== undefined) {
    fields.push('display_order = ?');
    values.push(updates.displayOrder);
  }
  if (updates.idlePromptEnabled !== undefined) {
    fields.push('idle_prompt_enabled = ?');
    values.push(updates.idlePromptEnabled ? 1 : 0);
  }
  if (updates.isArchived !== undefined) {
    fields.push('is_archived = ?');
    values.push(updates.isArchived ? 1 : 0);
  }
  
  values.push(id);
  
  await executeSql(
    `UPDATE activities SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  return getActivityById(id);
}

export async function archiveActivity(id: string): Promise<boolean> {
  const result = await executeSql(
    'UPDATE activities SET is_archived = 1, updated_at = ? WHERE id = ?',
    [nowISO(), id]
  );
  return result.rowsAffected > 0;
}

export async function unarchiveActivity(id: string): Promise<boolean> {
  const result = await executeSql(
    'UPDATE activities SET is_archived = 0, updated_at = ? WHERE id = ?',
    [nowISO(), id]
  );
  return result.rowsAffected > 0;
}

export async function deleteActivity(id: string): Promise<boolean> {
  const result = await executeSql('DELETE FROM activities WHERE id = ?', [id]);
  return result.rowsAffected > 0;
}

// ============================================
// Usage Tracking
// ============================================

export async function incrementActivityUsage(id: string): Promise<void> {
  await executeSql(
    `UPDATE activities 
     SET usage_count = usage_count + 1, last_used_at = ?, updated_at = ? 
     WHERE id = ?`,
    [nowISO(), nowISO(), id]
  );
}

// ============================================
// Smart Ordering
// ============================================

export async function getSmartOrderedActivities(
  currentHour?: number
): Promise<ActivityWithCategory[]> {
  // Base query with smart ordering factors
  const rows = await executeQuery<ActivityWithCategoryRow>(
    `SELECT a.*, c.name as category_name, c.color as category_color, c.icon as category_icon,
     (CASE WHEN a.is_favorite = 1 THEN 1000 ELSE 0 END) +
     (CASE WHEN a.last_used_at IS NOT NULL 
       THEN (100 - MIN(100, julianday('now') - julianday(a.last_used_at))) 
       ELSE 0 END) +
     (a.usage_count * 2) as score
     FROM activities a
     JOIN categories c ON a.category_id = c.id
     WHERE a.is_archived = 0
     ORDER BY score DESC, a.display_order ASC`
  );
  
  return rows.map(rowToActivityWithCategory);
}

// ============================================
// Search
// ============================================

export async function searchActivities(
  query: string,
  includeArchived = false
): Promise<ActivityWithCategory[]> {
  const archivedClause = includeArchived ? '' : 'AND a.is_archived = 0';
  const searchPattern = `%${query}%`;
  
  const rows = await executeQuery<ActivityWithCategoryRow>(
    `SELECT a.*, c.name as category_name, c.color as category_color, c.icon as category_icon
     FROM activities a
     JOIN categories c ON a.category_id = c.id
     WHERE (a.name LIKE ? OR c.name LIKE ?) ${archivedClause}
     ORDER BY a.is_favorite DESC, a.usage_count DESC`,
    [searchPattern, searchPattern]
  );
  
  return rows.map(rowToActivityWithCategory);
}

// ============================================
// Favorites Management
// ============================================

export async function toggleFavorite(id: string): Promise<boolean> {
  const activity = await getActivityById(id);
  if (!activity) {
    return false;
  }
  
  const newValue = activity.isFavorite ? 0 : 1;
  await executeSql(
    'UPDATE activities SET is_favorite = ?, updated_at = ? WHERE id = ?',
    [newValue, nowISO(), id]
  );
  
  return newValue === 1;
}
