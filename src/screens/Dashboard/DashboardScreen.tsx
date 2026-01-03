import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDuration, getDayStart, getDayEnd, getWeekStart, getWeekEnd, getMonthStart, getMonthEnd } from '../../utils/dateUtils';
import {
  getSessionsForDay,
  getSessionsForWeek,
  getSessionsForMonth,
  getTotalMinutesByCategory,
  getTotalMinutesByActivity,
  getPlannedVsUnplannedMinutes,
} from '../../database/repositories/sessionRepository';
import { getGoalsWithActivities } from '../../database/repositories/goalRepository';
import { SessionWithDetails, GoalWithActivity, GoalScope } from '../../types';
import { Card } from '../../components/common';

type TimeRange = 'day' | 'week' | 'month';

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  totalMinutes: number;
  color: string;
}

interface ActivityStats {
  activityId: string;
  activityName: string;
  totalMinutes: number;
  sessionsCount: number;
}

interface GoalProgress {
  goal: GoalWithActivity;
  currentMinutes: number;
  percentage: number;
  status: 'on-track' | 'exceeded' | 'below';
}

const screenWidth = Dimensions.get('window').width;

// Category colors for chart
const CATEGORY_COLORS: Record<string, string> = {
  'Daily Basics': '#6B7280',
  'Education & Growth': '#3B82F6',
  'Health & Fitness': '#10B981',
  'Entertainment': '#8B5CF6',
  'Hobbies & Creation': '#F59E0B',
  'Time Wasting': '#EF4444',
};

const DEFAULT_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

export default function DashboardScreen() {
  const { theme } = useTheme();
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats[]>([]);
  const [plannedMinutes, setPlannedMinutes] = useState(0);
  const [unplannedMinutes, setUnplannedMinutes] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [overlappingSessions, setOverlappingSessions] = useState<number>(0);
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        return { start: getDayStart(now), end: getDayEnd(now) };
      case 'week':
        return { start: getWeekStart(now), end: getWeekEnd(now) };
      case 'month':
        return { start: getMonthStart(now), end: getMonthEnd(now) };
    }
  }, [timeRange]);

  const detectOverlaps = (sessions: SessionWithDetails[]): number => {
    let overlaps = 0;
    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const s1 = sessions[i];
        const s2 = sessions[j];
        if (!s1.endTime || !s2.endTime) continue;
        
        const s1Start = new Date(s1.startTime).getTime();
        const s1End = new Date(s1.endTime).getTime();
        const s2Start = new Date(s2.startTime).getTime();
        const s2End = new Date(s2.endTime).getTime();
        
        if (s1Start < s2End && s2Start < s1End) {
          overlaps++;
        }
      }
    }
    return overlaps;
  };

  const loadData = useCallback(async () => {
    try {
      const { start, end } = getDateRange();
      
      // Get sessions
      let sessions: SessionWithDetails[];
      switch (timeRange) {
        case 'day':
          sessions = await getSessionsForDay(start);
          break;
        case 'week':
          sessions = await getSessionsForWeek(start);
          break;
        case 'month':
          sessions = await getSessionsForMonth(start);
          break;
      }
      
      setSessionsCount(sessions.length);
      setOverlappingSessions(detectOverlaps(sessions));
      
      // Get category breakdown
      const categoryData = await getTotalMinutesByCategory(start.toISOString(), end.toISOString());
      const categoriesWithColors = categoryData.map((cat, index) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        totalMinutes: cat.totalMinutes,
        color: CATEGORY_COLORS[cat.categoryName] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      }));
      setCategoryStats(categoriesWithColors);
      
      // Get activity breakdown
      const activityData = await getTotalMinutesByActivity(start.toISOString(), end.toISOString());
      setActivityStats(activityData);
      
      // Calculate total
      const total = categoryData.reduce((sum, cat) => sum + cat.totalMinutes, 0);
      setTotalMinutes(total);
      
      // Get planned vs unplanned
      const pvuData = await getPlannedVsUnplannedMinutes(start.toISOString(), end.toISOString());
      setPlannedMinutes(pvuData.plannedMinutes);
      setUnplannedMinutes(pvuData.unplannedMinutes);
      
      // Get goals and calculate progress
      const scopeMap: Record<TimeRange, GoalScope> = { day: 'day', week: 'week', month: 'month' };
      const allGoals = await getGoalsWithActivities(true);
      const relevantGoals = allGoals.filter(g => g.scope === scopeMap[timeRange]);
      
      const progressData: GoalProgress[] = relevantGoals.map(goal => {
        const activityStat = activityData.find(a => a.activityId === goal.activityId);
        const currentMinutes = activityStat?.totalMinutes ?? 0;
        const percentage = goal.targetMinutes > 0 ? (currentMinutes / goal.targetMinutes) * 100 : 0;
        
        let status: 'on-track' | 'exceeded' | 'below';
        if (goal.goalType === 'min') {
          status = percentage >= 100 ? 'on-track' : 'below';
        } else {
          status = percentage > 100 ? 'exceeded' : 'on-track';
        }
        
        return { goal, currentMinutes, percentage, status };
      });
      setGoalProgress(progressData);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange, getDateRange]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeSelector}>
      {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            timeRange === range && styles.timeRangeButtonActive,
          ]}
          onPress={() => setTimeRange(range)}
        >
          <Text
            style={[
              styles.timeRangeButtonText,
              timeRange === range && styles.timeRangeButtonTextActive,
            ]}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSummaryCard = () => (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Icon name="clock-outline" size={24} color={theme.primary} />
        <Text style={styles.summaryTitle}>Total Time Tracked</Text>
      </View>
      <Text style={styles.summaryValue}>{formatDuration(totalMinutes)}</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Icon name="format-list-numbered" size={18} color={theme.textSecondary} />
          <Text style={styles.summaryItemText}>{sessionsCount} sessions</Text>
        </View>
        <View style={styles.summaryItem}>
          <Icon name="check-circle" size={18} color={theme.planned} />
          <Text style={styles.summaryItemText}>{formatDuration(plannedMinutes)} planned</Text>
        </View>
      </View>
    </Card>
  );

  const renderOverlapBanner = () => {
    if (overlappingSessions === 0) return null;
    return (
      <View style={styles.overlapBanner}>
        <Icon name="alert-circle" size={20} color={theme.warning} />
        <Text style={styles.overlapText}>
          {overlappingSessions} overlapping session{overlappingSessions > 1 ? 's' : ''} detected
        </Text>
      </View>
    );
  };

  const renderCategoryChart = () => {
    if (categoryStats.length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Category Breakdown</Text>
          <View style={styles.emptyChart}>
            <Icon name="chart-pie" size={48} color={theme.gray300} />
            <Text style={styles.emptyChartText}>No data for this period</Text>
          </View>
        </Card>
      );
    }

    const chartData = categoryStats.map((cat) => ({
      name: cat.categoryName,
      population: cat.totalMinutes,
      color: cat.color,
      legendFontColor: theme.textPrimary,
      legendFontSize: 12,
    }));

    return (
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Category Breakdown</Text>
        <PieChart
          data={chartData}
          width={screenWidth - 64}
          height={180}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute
        />
      </Card>
    );
  };

  const renderPlannedVsUnplanned = () => {
    const total = plannedMinutes + unplannedMinutes;
    const plannedPercentage = total > 0 ? (plannedMinutes / total) * 100 : 0;
    const unplannedPercentage = total > 0 ? (unplannedMinutes / total) * 100 : 0;

    return (
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Planned vs Unplanned</Text>
        <View style={styles.barContainer}>
          <View style={[styles.barSegment, { flex: plannedPercentage, backgroundColor: theme.planned }]} />
          <View style={[styles.barSegment, { flex: unplannedPercentage || 0.01, backgroundColor: theme.unplanned }]} />
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.planned }]} />
            <Text style={styles.legendText}>Planned: {formatDuration(plannedMinutes)} ({plannedPercentage.toFixed(0)}%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.unplanned }]} />
            <Text style={styles.legendText}>Unplanned: {formatDuration(unplannedMinutes)} ({unplannedPercentage.toFixed(0)}%)</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderGoalProgress = () => {
    if (goalProgress.length === 0) return null;

    return (
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Goal Progress</Text>
        {goalProgress.map((gp) => (
          <View key={gp.goal.id} style={styles.goalItem}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalActivityName}>{gp.goal.activityName}</Text>
              <Text style={[styles.goalStatus, 
                gp.status === 'on-track' && styles.goalStatusOnTrack,
                gp.status === 'exceeded' && styles.goalStatusExceeded,
                gp.status === 'below' && styles.goalStatusBelow,
              ]}>
                {gp.status === 'on-track' ? '✓ On Track' : gp.status === 'exceeded' ? '⚠ Exceeded' : '○ Below'}
              </Text>
            </View>
            <View style={styles.goalProgressBar}>
              <View 
                style={[
                  styles.goalProgressFill, 
                  { width: `${Math.min(gp.percentage, 100)}%` },
                  gp.status === 'on-track' && { backgroundColor: theme.goalMet },
                  gp.status === 'exceeded' && { backgroundColor: theme.goalExceeded },
                  gp.status === 'below' && { backgroundColor: theme.goalBelow },
                ]} 
              />
            </View>
            <Text style={styles.goalDetails}>
              {formatDuration(gp.currentMinutes)} / {formatDuration(gp.goal.targetMinutes)} 
              ({gp.goal.goalType === 'min' ? 'min' : 'max'})
            </Text>
          </View>
        ))}
      </Card>
    );
  };

  const renderTopActivities = () => {
    const top5 = activityStats.slice(0, 5);
    if (top5.length === 0) return null;

    return (
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Top Activities</Text>
        {top5.map((activity, index) => (
          <View key={activity.activityId ?? `activity-${index}`} style={styles.activityRow}>
            <Text style={styles.activityRank}>#{index + 1}</Text>
            <View style={styles.activityInfo}>
              <Text style={styles.activityName} numberOfLines={1}>{activity.activityName}</Text>
              <Text style={styles.activitySessions}>{activity.sessionsCount} sessions</Text>
            </View>
            <Text style={styles.activityDuration}>{formatDuration(activity.totalMinutes)}</Text>
          </View>
        ))}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
      }
    >
      <Text style={styles.screenTitle}>Dashboard</Text>
      {renderTimeRangeSelector()}
      {renderOverlapBanner()}
      {renderSummaryCard()}
      {renderCategoryChart()}
      {renderPlannedVsUnplanned()}
      {renderGoalProgress()}
      {renderTopActivities()}
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.textSecondary,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 16,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: theme.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  timeRangeButtonTextActive: {
    color: theme.primary,
    fontWeight: '600',
  },
  overlapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.warningLight + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  overlapText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.warning,
    fontWeight: '500',
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    color: theme.textSecondary,
    marginLeft: 8,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItemText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.textSecondary,
  },
  chartCard: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 16,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyChartText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.textSecondary,
  },
  barContainer: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.gray200,
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  goalItem: {
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalActivityName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  goalStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  goalStatusOnTrack: {
    color: theme.goalMet,
  },
  goalStatusExceeded: {
    color: theme.goalExceeded,
  },
  goalStatusBelow: {
    color: theme.goalBelow,
  },
  goalProgressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.gray200,
    marginBottom: 6,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalDetails: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  activityRank: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    width: 32,
  },
  activityInfo: {
    flex: 1,
    marginRight: 12,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.textPrimary,
  },
  activitySessions: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  activityDuration: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.primary,
  },
});
