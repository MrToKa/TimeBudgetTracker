// Time Budget Tracker - Type Definitions

// ============================================
// Category Types
// ============================================
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
  icon?: string;
  displayOrder?: number;
}

// ============================================
// Activity Types
// ============================================
export interface Activity {
  id: string;
  name: string;
  categoryId: string;
  defaultExpectedMinutes: number | null;
  isPlannedDefault: boolean;
  isFavorite: boolean;
  displayOrder: number;
  idlePromptEnabled: boolean;
  isArchived: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityInput {
  name: string;
  categoryId: string;
  defaultExpectedMinutes?: number | null;
  isPlannedDefault?: boolean;
  isFavorite?: boolean;
  idlePromptEnabled?: boolean;
}

export interface UpdateActivityInput {
  name?: string;
  categoryId?: string;
  defaultExpectedMinutes?: number | null;
  isPlannedDefault?: boolean;
  isFavorite?: boolean;
  displayOrder?: number;
  idlePromptEnabled?: boolean;
  isArchived?: boolean;
}

// Activity with category info for display
export interface ActivityWithCategory extends Activity {
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
}

// ============================================
// Time Session Types
// ============================================
export type SessionSource = 'timer' | 'manual' | 'routine' | 'assistant';

export interface TimeSession {
  id: string;
  activityId: string | null;
  activityNameSnapshot: string;
  categoryId: string | null;
  categoryNameSnapshot: string;
  routineId?: string | null;
  startTime: string;
  endTime: string | null;
  actualDurationMinutes: number | null;
  expectedDurationMinutes: number | null;
  isPlanned: boolean;
  source: SessionSource;
  isRunning: boolean;
  idlePromptEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  activityId?: string | null;
  activityNameSnapshot: string;
  categoryId?: string | null;
  categoryNameSnapshot: string;
  routineId?: string | null;
  startTime: string;
  endTime?: string | null;
  actualDurationMinutes?: number | null;
  expectedDurationMinutes?: number | null;
  isPlanned?: boolean;
  source: SessionSource;
  isRunning?: boolean;
  idlePromptEnabled?: boolean;
}

export interface UpdateSessionInput {
  activityId?: string | null;
  activityNameSnapshot?: string;
  categoryId?: string | null;
  categoryNameSnapshot?: string;
  routineId?: string | null;
  startTime?: string;
  endTime?: string | null;
  actualDurationMinutes?: number | null;
  expectedDurationMinutes?: number | null;
  isPlanned?: boolean;
  isRunning?: boolean;
}

// Session with full category info for display
export interface SessionWithDetails extends TimeSession {
  categoryColor?: string;
  categoryIcon?: string;
}

// ============================================
// Goal Types
// ============================================
export type GoalType = 'min' | 'max';
export type GoalScope = 'day' | 'week' | 'month';

export interface Goal {
  id: string;
  activityId: string;
  goalType: GoalType;
  scope: GoalScope;
  targetMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  activityId: string;
  goalType: GoalType;
  scope: GoalScope;
  targetMinutes: number;
}

export interface GoalWithActivity extends Goal {
  activityName: string;
  categoryName: string;
}

export type GoalComplianceStatus = 'met' | 'exceeded' | 'below';

export interface GoalCompliance {
  goal: Goal;
  actualMinutes: number;
  status: GoalComplianceStatus;
  difference: number; // positive = over, negative = under
}

// ============================================
// Routine Types
// ============================================
export type RoutineType = 'daily' | 'weekly';

export interface Routine {
  id: string;
  name: string;
  routineType: RoutineType;
  startTime: string | null;
  dayFilter: 'all' | 'weekdays' | 'weekend';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineItem {
  id: string;
  routineId: string;
  activityId: string;
  scheduledTime: string | null;
  expectedDurationMinutes: number | null;
  dayOfWeek: number | null; // 0-6 for weekly routines
  displayOrder: number;
}

export interface RoutineWithItems extends Routine {
  items: (RoutineItem & { activity: Activity })[];
}

// ============================================
// Timer Types
// ============================================
export interface RunningTimer {
  id: string;
  sessionId: string;
  activityId: string | null;
  activityName: string;
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  routineId?: string | null;
  startTime: Date;
  expectedDurationMinutes: number | null;
  isPlanned: boolean;
  idlePromptEnabled: boolean;
}

// ============================================
// Dashboard Types
// ============================================
export interface DailyStats {
  date: string;
  totalMinutes: number;
  plannedMinutes: number;
  unplannedMinutes: number;
  categoryBreakdown: CategoryTimeBreakdown[];
  activityBreakdown: ActivityTimeBreakdown[];
  hasOverlaps: boolean;
  goalCompliance: GoalCompliance[];
}

export interface CategoryTimeBreakdown {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalMinutes: number;
  plannedMinutes: number;
  unplannedMinutes: number;
  percentage: number;
}

export interface ActivityTimeBreakdown {
  activityId: string | null;
  activityName: string;
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  totalMinutes: number;
  plannedMinutes: number;
  unplannedMinutes: number;
  expectedMinutes: number | null;
  sessionsCount: number;
}

export interface WeeklyStats {
  startDate: string;
  endDate: string;
  dailyTotals: { date: string; totalMinutes: number; plannedMinutes: number }[];
  totalMinutes: number;
  plannedMinutes: number;
  unplannedMinutes: number;
  categoryBreakdown: CategoryTimeBreakdown[];
  goalCompliance: GoalCompliance[];
}

export interface MonthlyStats {
  month: number;
  year: number;
  weeklyTotals: { weekStart: string; totalMinutes: number }[];
  totalMinutes: number;
  plannedMinutes: number;
  unplannedMinutes: number;
  topActivities: ActivityTimeBreakdown[];
  goalCompliance: GoalCompliance[];
}

// ============================================
// Review Mode Types
// ============================================
export interface UntrackedGap {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
}

export interface ReviewIssue {
  type: 'budget_miss' | 'untracked_gap' | 'heavy_overlap';
  sessionId?: string;
  gapId?: string;
  description: string;
  suggestedAction?: string;
}

// ============================================
// Settings Types
// ============================================
export interface AppSettings {
  defaultIdlePromptEnabled: boolean;
  idleThresholdMinutes: number;
  quietHoursStart: string | null; // HH:mm format
  quietHoursEnd: string | null;
  focusModeEnabled: boolean;
  notificationsEnabled: boolean;
  reminderRoutineStart: boolean;
  reminderReviewMode: boolean;
  reminderLongSession: boolean;
  longSessionThresholdMinutes: number;
  noTimerReminderEnabled: boolean;
  noTimerReminderMinutes: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultIdlePromptEnabled: true,
  idleThresholdMinutes: 15,
  quietHoursStart: null,
  quietHoursEnd: null,
  focusModeEnabled: false,
  notificationsEnabled: true,
  reminderRoutineStart: true,
  reminderReviewMode: true,
  reminderLongSession: true,
  longSessionThresholdMinutes: 120,
  noTimerReminderEnabled: true,
  noTimerReminderMinutes: 5,
};

// ============================================
// Backup Types
// ============================================
export interface BackupMetadata {
  version: number;
  createdAt: string;
  appVersion: string;
  deviceInfo?: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  categories: Category[];
  activities: Activity[];
  sessions: TimeSession[];
  goals: Goal[];
  routines: Routine[];
  routineItems: RoutineItem[];
  settings: Record<string, string>;
}

// ============================================
// Navigation Types
// ============================================
export type RootStackParamList = {
  MainTabs: undefined;
  ActivityDetail: { activityId: string };
  EditActivity: { activityId?: string; categoryId?: string };
  ManualAdd: { categoryId?: string };
  SessionDetail: { sessionId: string };
  Goals: undefined;
  GoalDetail: { goalId: string };
  CreateGoal: { activityId?: string };
  EditGoal: { goalId: string };
  Routines: undefined;
  RoutineDetail: { routineId: string };
  CreateRoutine: undefined;
  AddRoutineActivity: { routineId: string; itemId?: string };
  Review: { date?: string };
  Backup: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Review: undefined;
  Activities: undefined;
  Dashboard: undefined;
  More: undefined;
};
