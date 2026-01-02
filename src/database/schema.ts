// SQLite Database Schema Definitions

export const DATABASE_NAME = 'timebudget.db';
export const DATABASE_VERSION = 1;

// ============================================
// Table Creation SQL
// ============================================

export const CREATE_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    icon TEXT DEFAULT 'category',
    is_default INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;

export const CREATE_ACTIVITIES_TABLE = `
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category_id TEXT NOT NULL,
    default_expected_minutes INTEGER,
    is_planned_default INTEGER DEFAULT 1,
    is_favorite INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    idle_prompt_enabled INTEGER DEFAULT 1,
    is_archived INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_used_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );
`;

export const CREATE_TIME_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS time_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    activity_id TEXT,
    activity_name_snapshot TEXT NOT NULL,
    category_id TEXT,
    category_name_snapshot TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    actual_duration_minutes INTEGER,
    expected_duration_minutes INTEGER,
    is_planned INTEGER DEFAULT 1,
    source TEXT CHECK(source IN ('timer', 'manual', 'routine', 'assistant')) DEFAULT 'timer',
    is_running INTEGER DEFAULT 0,
    idle_prompt_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );
`;

export const CREATE_GOALS_TABLE = `
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY NOT NULL,
    activity_id TEXT NOT NULL,
    goal_type TEXT CHECK(goal_type IN ('min', 'max')) NOT NULL,
    scope TEXT CHECK(scope IN ('day', 'week', 'month')) NOT NULL,
    target_minutes INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
  );
`;

export const CREATE_ROUTINES_TABLE = `
  CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    routine_type TEXT CHECK(routine_type IN ('daily', 'weekly')) NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;

export const CREATE_ROUTINE_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS routine_items (
    id TEXT PRIMARY KEY NOT NULL,
    routine_id TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    scheduled_time TEXT,
    expected_duration_minutes INTEGER,
    day_of_week INTEGER,
    display_order INTEGER DEFAULT 0,
    FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
  );
`;

export const CREATE_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;

// ============================================
// Index Creation SQL
// ============================================

export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category_id);',
  'CREATE INDEX IF NOT EXISTS idx_activities_favorite ON activities(is_favorite);',
  'CREATE INDEX IF NOT EXISTS idx_activities_archived ON activities(is_archived);',
  'CREATE INDEX IF NOT EXISTS idx_sessions_activity ON time_sessions(activity_id);',
  'CREATE INDEX IF NOT EXISTS idx_sessions_category ON time_sessions(category_id);',
  'CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON time_sessions(start_time);',
  'CREATE INDEX IF NOT EXISTS idx_sessions_running ON time_sessions(is_running);',
  'CREATE INDEX IF NOT EXISTS idx_goals_activity ON goals(activity_id);',
  'CREATE INDEX IF NOT EXISTS idx_goals_scope ON goals(scope);',
  'CREATE INDEX IF NOT EXISTS idx_routine_items_routine ON routine_items(routine_id);',
];

// ============================================
// All Tables Array (for initialization order)
// ============================================

export const ALL_CREATE_STATEMENTS = [
  CREATE_CATEGORIES_TABLE,
  CREATE_ACTIVITIES_TABLE,
  CREATE_TIME_SESSIONS_TABLE,
  CREATE_GOALS_TABLE,
  CREATE_ROUTINES_TABLE,
  CREATE_ROUTINE_ITEMS_TABLE,
  CREATE_SETTINGS_TABLE,
  ...CREATE_INDEXES,
];

// ============================================
// Drop Tables (for reset/testing)
// ============================================

export const DROP_ALL_TABLES = [
  'DROP TABLE IF EXISTS routine_items;',
  'DROP TABLE IF EXISTS routines;',
  'DROP TABLE IF EXISTS goals;',
  'DROP TABLE IF EXISTS time_sessions;',
  'DROP TABLE IF EXISTS activities;',
  'DROP TABLE IF EXISTS categories;',
  'DROP TABLE IF EXISTS settings;',
];
