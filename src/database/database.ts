// SQLite Database Service

import SQLite, { SQLiteDatabase, ResultSet } from 'react-native-sqlite-storage';
import { v4 as uuidv4 } from 'uuid';
import {
  DATABASE_NAME,
  DATABASE_VERSION,
  ALL_CREATE_STATEMENTS,
  DROP_ALL_TABLES,
} from './schema';
import { DEFAULT_CATEGORIES, getDefaultActivitiesWithCategories } from '../constants/categories';
import { nowISO } from '../utils/dateUtils';

// Enable promise-based API
SQLite.enablePromise(true);

// ============================================
// Database Instance Management
// ============================================

let dbInstance: SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  // Return existing instance if already initialized
  if (dbInstance) {
    return dbInstance;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization and store the promise to prevent race conditions
  initializationPromise = (async () => {
    try {
      const db = await SQLite.openDatabase({
        name: DATABASE_NAME,
        location: 'default',
      });

      await initializeDatabase(db);
      dbInstance = db;
      return db;
    } catch (error) {
      // Reset on failure so retry is possible
      initializationPromise = null;
      console.error('Failed to open database:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

// ============================================
// Database Initialization
// ============================================

async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  try {
    // Create all tables
    for (const statement of ALL_CREATE_STATEMENTS) {
      await db.executeSql(statement);
    }

    await ensureRoutineSchemaUpToDate(db);
    await ensureSessionSchemaUpToDate(db);

    // Check if we need to seed default data
    const [categoriesResult] = await db.executeSql(
      'SELECT COUNT(*) as count FROM categories'
    );
    const categoryCount = categoriesResult.rows.item(0).count;

    if (categoryCount === 0) {
      await seedDefaultData(db);
    }

    // Store database version
    await db.executeSql(
      `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      ['db_version', DATABASE_VERSION.toString(), nowISO()]
    );

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

async function seedDefaultData(db: SQLiteDatabase): Promise<void> {
  const now = nowISO();

  // Seed categories (use INSERT OR IGNORE to prevent duplicate key errors)
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const category = DEFAULT_CATEGORIES[i];
    await db.executeSql(
      `INSERT OR IGNORE INTO categories (id, name, color, icon, is_default, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [category.id, category.name, category.color, category.icon, 1, i, now, now]
    );
  }

  // Seed activities (use INSERT OR IGNORE to prevent duplicate key errors)
  const activities = getDefaultActivitiesWithCategories();
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    const id = uuidv4();
    await db.executeSql(
      `INSERT OR IGNORE INTO activities (id, name, category_id, is_planned_default, is_favorite, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, activity.name, activity.categoryId, 1, 0, i, now, now]
    );
  }

  console.log('Default data seeded successfully');
}

async function ensureRoutineSchemaUpToDate(db: SQLiteDatabase): Promise<void> {
  try {
    const [info] = await db.executeSql(`PRAGMA table_info(routines);`);
    const columns = [];
    for (let i = 0; i < info.rows.length; i++) {
      columns.push(info.rows.item(i).name as string);
    }

    if (!columns.includes('start_time')) {
      await db.executeSql(`ALTER TABLE routines ADD COLUMN start_time TEXT;`);
    }

    if (!columns.includes('day_filter')) {
      await db.executeSql(
        `ALTER TABLE routines ADD COLUMN day_filter TEXT DEFAULT 'all';`
      );
    }
  } catch (error) {
    console.warn('Failed to ensure routine schema is up to date:', error);
  }
}

async function ensureSessionSchemaUpToDate(db: SQLiteDatabase): Promise<void> {
  try {
    const [info] = await db.executeSql(`PRAGMA table_info(time_sessions);`);
    const columns = [];
    for (let i = 0; i < info.rows.length; i++) {
      columns.push(info.rows.item(i).name as string);
    }

    if (!columns.includes('routine_id')) {
      await db.executeSql(`ALTER TABLE time_sessions ADD COLUMN routine_id TEXT;`);
    }
  } catch (error) {
    console.warn('Failed to ensure session schema is up to date:', error);
  }
}

// ============================================
// Query Helpers
// ============================================

export async function executeSql(
  sql: string,
  params: any[] = []
): Promise<ResultSet> {
  const db = await getDatabase();
  const [result] = await db.executeSql(sql, params);
  return result;
}

export async function executeQuery<T>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const result = await executeSql(sql, params);
  const items: T[] = [];
  
  for (let i = 0; i < result.rows.length; i++) {
    items.push(result.rows.item(i) as T);
  }
  
  return items;
}

export async function executeQuerySingle<T>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const result = await executeSql(sql, params);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows.item(0) as T;
}

export async function executeInsert(
  sql: string,
  params: any[] = []
): Promise<number> {
  const result = await executeSql(sql, params);
  return result.insertId;
}

export async function executeUpdate(
  sql: string,
  params: any[] = []
): Promise<number> {
  const result = await executeSql(sql, params);
  return result.rowsAffected;
}

export async function executeDelete(
  sql: string,
  params: any[] = []
): Promise<number> {
  const result = await executeSql(sql, params);
  return result.rowsAffected;
}

// ============================================
// Transaction Support
// ============================================

export async function executeTransaction<T>(
  callback: (db: SQLiteDatabase) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  
  return new Promise((resolve, reject) => {
    db.transaction(
      async (tx) => {
        try {
          // Note: We pass db instead of tx for simplicity
          // In a more complex scenario, you might want to use tx directly
          const result = await callback(db);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}

// ============================================
// Database Reset (for development/testing)
// ============================================

export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  
  // Drop all tables
  for (const statement of DROP_ALL_TABLES) {
    await db.executeSql(statement);
  }
  
  // Reinitialize
  await initializeDatabase(db);
}

// ============================================
// Database Export (for backup)
// ============================================

export async function exportAllData(): Promise<{
  categories: any[];
  activities: any[];
  sessions: any[];
  goals: any[];
  routines: any[];
  routineItems: any[];
  settings: any[];
}> {
  const categories = await executeQuery('SELECT * FROM categories ORDER BY display_order');
  const activities = await executeQuery('SELECT * FROM activities ORDER BY display_order');
  const sessions = await executeQuery('SELECT * FROM time_sessions ORDER BY start_time DESC');
  const goals = await executeQuery('SELECT * FROM goals');
  const routines = await executeQuery('SELECT * FROM routines');
  const routineItems = await executeQuery('SELECT * FROM routine_items ORDER BY display_order');
  const settings = await executeQuery('SELECT * FROM settings');
  
  return {
    categories,
    activities,
    sessions,
    goals,
    routines,
    routineItems,
    settings,
  };
}

// ============================================
// Database Import (for restore)
// ============================================

export async function importAllData(data: {
  categories: any[];
  activities: any[];
  sessions: any[];
  goals: any[];
  routines: any[];
  routineItems: any[];
  settings: any[];
}): Promise<void> {
  const db = await getDatabase();
  
  // Clear existing data
  for (const statement of DROP_ALL_TABLES) {
    await db.executeSql(statement);
  }
  
  // Recreate tables
  for (const statement of ALL_CREATE_STATEMENTS) {
    await db.executeSql(statement);
  }
  
  // Import categories
  for (const cat of data.categories) {
    await db.executeSql(
      `INSERT INTO categories (id, name, color, icon, is_default, display_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.color, cat.icon, cat.is_default, cat.display_order, cat.created_at, cat.updated_at]
    );
  }
  
  // Import activities
  for (const act of data.activities) {
    await db.executeSql(
      `INSERT INTO activities (id, name, category_id, default_expected_minutes, is_planned_default, is_favorite, display_order, idle_prompt_enabled, is_archived, usage_count, last_used_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [act.id, act.name, act.category_id, act.default_expected_minutes, act.is_planned_default, act.is_favorite, act.display_order, act.idle_prompt_enabled, act.is_archived, act.usage_count, act.last_used_at, act.created_at, act.updated_at]
    );
  }
  
  // Import sessions
  for (const session of data.sessions) {
    await db.executeSql(
      `INSERT INTO time_sessions (id, activity_id, activity_name_snapshot, category_id, category_name_snapshot, start_time, end_time, actual_duration_minutes, expected_duration_minutes, is_planned, source, is_running, idle_prompt_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.id, session.activity_id, session.activity_name_snapshot, session.category_id, session.category_name_snapshot, session.start_time, session.end_time, session.actual_duration_minutes, session.expected_duration_minutes, session.is_planned, session.source, session.is_running, session.idle_prompt_enabled, session.created_at, session.updated_at]
    );
  }
  
  // Import goals
  for (const goal of data.goals) {
    await db.executeSql(
      `INSERT INTO goals (id, activity_id, goal_type, scope, target_minutes, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [goal.id, goal.activity_id, goal.goal_type, goal.scope, goal.target_minutes, goal.is_active, goal.created_at, goal.updated_at]
    );
  }
  
  // Import routines
  for (const routine of data.routines) {
    await db.executeSql(
      `INSERT INTO routines (id, name, routine_type, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [routine.id, routine.name, routine.routine_type, routine.is_active, routine.created_at, routine.updated_at]
    );
  }
  
  // Import routine items
  for (const item of data.routineItems) {
    await db.executeSql(
      `INSERT INTO routine_items (id, routine_id, activity_id, scheduled_time, expected_duration_minutes, day_of_week, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.routine_id, item.activity_id, item.scheduled_time, item.expected_duration_minutes, item.day_of_week, item.display_order]
    );
  }
  
  // Import settings
  for (const setting of data.settings) {
    await db.executeSql(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)`,
      [setting.key, setting.value, setting.updated_at]
    );
  }
  
  console.log('Data imported successfully');
}
