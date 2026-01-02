// Goal Repository - Database Operations for Goals

import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeQuerySingle, executeSql } from '../database';
import { Goal, GoalWithActivity, CreateGoalInput, GoalType, GoalScope } from '../../types';
import { nowISO } from '../../utils/dateUtils';

// Database row type (snake_case)
interface GoalRow {
  id: string;
  activity_id: string;
  goal_type: GoalType;
  scope: GoalScope;
  target_minutes: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface GoalWithActivityRow extends GoalRow {
  activity_name: string;
  category_name: string;
}

// Convert database row to Goal type
function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    activityId: row.activity_id,
    goalType: row.goal_type,
    scope: row.scope,
    targetMinutes: row.target_minutes,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToGoalWithActivity(row: GoalWithActivityRow): GoalWithActivity {
  return {
    ...rowToGoal(row),
    activityName: row.activity_name,
    categoryName: row.category_name,
  };
}

// ============================================
// CRUD Operations
// ============================================

export async function getAllGoals(activeOnly = true): Promise<Goal[]> {
  const activeClause = activeOnly ? 'WHERE is_active = 1' : '';
  const rows = await executeQuery<GoalRow>(
    `SELECT * FROM goals ${activeClause} ORDER BY scope, goal_type`
  );
  return rows.map(rowToGoal);
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const row = await executeQuerySingle<GoalRow>(
    'SELECT * FROM goals WHERE id = ?',
    [id]
  );
  return row ? rowToGoal(row) : null;
}

export async function getGoalsWithActivities(activeOnly = true): Promise<GoalWithActivity[]> {
  const activeClause = activeOnly ? 'WHERE g.is_active = 1' : '';
  const rows = await executeQuery<GoalWithActivityRow>(
    `SELECT g.*, a.name as activity_name, c.name as category_name
     FROM goals g
     JOIN activities a ON g.activity_id = a.id
     JOIN categories c ON a.category_id = c.id
     ${activeClause}
     ORDER BY g.scope, g.goal_type, a.name`
  );
  return rows.map(rowToGoalWithActivity);
}

export async function getGoalsForActivity(
  activityId: string,
  activeOnly = true
): Promise<Goal[]> {
  const activeClause = activeOnly ? 'AND is_active = 1' : '';
  const rows = await executeQuery<GoalRow>(
    `SELECT * FROM goals WHERE activity_id = ? ${activeClause} ORDER BY scope, goal_type`,
    [activityId]
  );
  return rows.map(rowToGoal);
}

export async function getGoalsByScope(
  scope: GoalScope,
  activeOnly = true
): Promise<GoalWithActivity[]> {
  const activeClause = activeOnly ? 'AND g.is_active = 1' : '';
  const rows = await executeQuery<GoalWithActivityRow>(
    `SELECT g.*, a.name as activity_name, c.name as category_name
     FROM goals g
     JOIN activities a ON g.activity_id = a.id
     JOIN categories c ON a.category_id = c.id
     WHERE g.scope = ? ${activeClause}
     ORDER BY g.goal_type, a.name`,
    [scope]
  );
  return rows.map(rowToGoalWithActivity);
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const id = uuidv4();
  const now = nowISO();
  
  // Check if a similar goal already exists
  const existing = await executeQuerySingle<GoalRow>(
    `SELECT * FROM goals 
     WHERE activity_id = ? AND goal_type = ? AND scope = ? AND is_active = 1`,
    [input.activityId, input.goalType, input.scope]
  );
  
  if (existing) {
    throw new Error(`An active ${input.goalType} goal for this activity with ${input.scope} scope already exists`);
  }
  
  await executeSql(
    `INSERT INTO goals (id, activity_id, goal_type, scope, target_minutes, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      input.activityId,
      input.goalType,
      input.scope,
      input.targetMinutes,
      now,
      now,
    ]
  );
  
  const goal = await getGoalById(id);
  if (!goal) {
    throw new Error('Failed to create goal');
  }
  return goal;
}

export async function updateGoal(
  id: string,
  updates: Partial<Omit<CreateGoalInput, 'activityId'>> & { isActive?: boolean }
): Promise<Goal | null> {
  const existing = await getGoalById(id);
  if (!existing) {
    return null;
  }
  
  const now = nowISO();
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [now];
  
  if (updates.goalType !== undefined) {
    fields.push('goal_type = ?');
    values.push(updates.goalType);
  }
  if (updates.scope !== undefined) {
    fields.push('scope = ?');
    values.push(updates.scope);
  }
  if (updates.targetMinutes !== undefined) {
    fields.push('target_minutes = ?');
    values.push(updates.targetMinutes);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  
  values.push(id);
  
  await executeSql(
    `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  return getGoalById(id);
}

export async function deleteGoal(id: string): Promise<boolean> {
  const result = await executeSql('DELETE FROM goals WHERE id = ?', [id]);
  return result.rowsAffected > 0;
}

export async function deactivateGoal(id: string): Promise<boolean> {
  const result = await executeSql(
    'UPDATE goals SET is_active = 0, updated_at = ? WHERE id = ?',
    [nowISO(), id]
  );
  return result.rowsAffected > 0;
}

export async function activateGoal(id: string): Promise<boolean> {
  const result = await executeSql(
    'UPDATE goals SET is_active = 1, updated_at = ? WHERE id = ?',
    [nowISO(), id]
  );
  return result.rowsAffected > 0;
}

export async function toggleGoalActive(id: string): Promise<boolean> {
  const goal = await getGoalById(id);
  if (!goal) {
    return false;
  }
  if (goal.isActive) {
    return deactivateGoal(id);
  } else {
    return activateGoal(id);
  }
}

// ============================================
// Goal Checking Helpers
// ============================================

export async function getDailyGoals(): Promise<GoalWithActivity[]> {
  return getGoalsByScope('day');
}

export async function getWeeklyGoals(): Promise<GoalWithActivity[]> {
  return getGoalsByScope('week');
}

export async function getMonthlyGoals(): Promise<GoalWithActivity[]> {
  return getGoalsByScope('month');
}
