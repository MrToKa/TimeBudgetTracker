import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Colors from '../../constants/colors';
import { Card } from '../../components/common';
import { SessionWithDetails, RootStackParamList } from '../../types';
import { getSessionsForDay, deleteSession, updateSession, getTotalMinutesByCategory } from '../../database/repositories/sessionRepository';
import { getDayStart, getDayEnd } from '../../utils/dateUtils';

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

interface CategoryStats {
  categoryId: string;
  categoryName: string;
  totalMinutes: number;
  color: string;
}
import { formatDuration, formatTime } from '../../utils/dateUtils';
import { addDays, subDays, format, isToday, isYesterday } from 'date-fns';

type ReviewRouteProp = RouteProp<RootStackParamList, 'Review'>;

export default function ReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute<ReviewRouteProp>();
  
  const [currentDate, setCurrentDate] = useState(() => {
    if (route.params?.date) {
      return new Date(route.params.date);
    }
    return new Date();
  });
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessionsForDay(currentDate);
      setSessions(data);
      
      // Load category breakdown for pie chart
      const start = getDayStart(currentDate);
      const end = getDayEnd(currentDate);
      const categoryData = await getTotalMinutesByCategory(start.toISOString(), end.toISOString());
      const categoriesWithColors = categoryData.map((cat, index) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        totalMinutes: cat.totalMinutes,
        color: CATEGORY_COLORS[cat.categoryName] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      }));
      setCategoryStats(categoriesWithColors);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentDate]);

  useEffect(() => {
    setLoading(true);
    loadSessions();
  }, [loadSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSessions();
  }, [loadSessions]);

  const goToPreviousDay = () => {
    setCurrentDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    const tomorrow = addDays(new Date(), 1);
    if (addDays(currentDate, 1) <= tomorrow) {
      setCurrentDate(prev => addDays(prev, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDateLabel = () => {
    if (isToday(currentDate)) return 'Today';
    if (isYesterday(currentDate)) return 'Yesterday';
    return format(currentDate, 'EEEE, MMM d');
  };

  const getTotalMinutes = () => {
    return sessions.reduce((sum, s) => sum + (s.actualDurationMinutes ?? 0), 0);
  };

  const handleDeleteSession = (session: SessionWithDetails) => {
    Alert.alert(
      'Delete Session',
      `Delete "${session.activityNameSnapshot}" session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(session.id);
              loadSessions();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete session');
            }
          },
        },
      ]
    );
  };

  const handleTogglePlanned = async (session: SessionWithDetails) => {
    try {
      await updateSession(session.id, { isPlanned: !session.isPlanned });
      loadSessions();
    } catch (error) {
      Alert.alert('Error', 'Failed to update session');
    }
  };

  const renderSessionItem = ({ item }: { item: SessionWithDetails }) => {
    const startTime = new Date(item.startTime);
    const endTime = item.endTime ? new Date(item.endTime) : null;

    return (
      <Card style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <View style={[styles.categoryDot, { backgroundColor: item.categoryColor || Colors.gray400 }]} />
          <View style={styles.sessionInfo}>
            <Text style={styles.activityName} numberOfLines={1}>
              {item.activityNameSnapshot}
            </Text>
            <Text style={styles.categoryName}>{item.categoryNameSnapshot}</Text>
          </View>
          <View style={styles.sessionActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleTogglePlanned(item)}
            >
              <Icon
                name={item.isPlanned ? 'check-circle' : 'circle-outline'}
                size={20}
                color={item.isPlanned ? Colors.success : Colors.gray400}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDeleteSession(item)}
            >
              <Icon name="delete-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.timeRange}>
            <Icon name="clock-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.timeText}>
              {format(startTime, 'HH:mm')} – {endTime ? format(endTime, 'HH:mm') : 'ongoing'}
            </Text>
          </View>
          <View style={styles.duration}>
            <Text style={styles.durationText}>
              {item.actualDurationMinutes ? formatDuration(item.actualDurationMinutes) : '--'}
            </Text>
          </View>
        </View>

        <View style={styles.sessionTags}>
          <View style={[styles.tag, item.isPlanned ? styles.tagPlanned : styles.tagUnplanned]}>
            <Text style={[styles.tagText, item.isPlanned ? styles.tagTextPlanned : styles.tagTextUnplanned]}>
              {item.isPlanned ? 'Planned' : 'Unplanned'}
            </Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.source}</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="calendar-blank" size={64} color={Colors.gray300} />
      <Text style={styles.emptyTitle}>No Sessions</Text>
      <Text style={styles.emptySubtitle}>
        No time tracked for this day.{'\n'}
        Start a timer or add a manual entry.
      </Text>
    </View>
  );

  const renderDayStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{sessions.length}</Text>
        <Text style={styles.statLabel}>Sessions</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{formatDuration(getTotalMinutes())}</Text>
        <Text style={styles.statLabel}>Total Time</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>
          {sessions.filter(s => s.isPlanned).length}
        </Text>
        <Text style={styles.statLabel}>Planned</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={goToPreviousDay} style={styles.navButton}>
          <Icon name="chevron-left" size={28} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.dateLabel}>
          <Text style={styles.dateLabelText}>{getDateLabel()}</Text>
          <Text style={styles.dateSubtext}>{format(currentDate, 'MMMM d, yyyy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={goToNextDay} 
          style={styles.navButton}
          disabled={isToday(currentDate)}
        >
          <Icon 
            name="chevron-right" 
            size={28} 
            color={isToday(currentDate) ? Colors.gray300 : Colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Day Stats */}
      {!loading && sessions.length > 0 && renderDayStats()}

      {/* Category Pie Chart */}
      {!loading && categoryStats.length > 0 && (
        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Category Breakdown</Text>
          <PieChart
            data={categoryStats.map((cat) => ({
              name: cat.categoryName,
              population: cat.totalMinutes,
              color: cat.color,
              legendFontColor: Colors.textPrimary,
              legendFontSize: 12,
            }))}
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
      )}

      {/* Sessions List */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderSessionItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navButton: {
    padding: 8,
  },
  dateLabel: {
    alignItems: 'center',
  },
  dateLabelText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dateSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sessionCard: {
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  categoryName: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 6,
    marginLeft: 4,
  },
  sessionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeRange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  duration: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  sessionTags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.gray100,
  },
  tagPlanned: {
    backgroundColor: Colors.success + '15',
  },
  tagUnplanned: {
    backgroundColor: Colors.unplanned + '15',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tagTextPlanned: {
    color: Colors.success,
  },
  tagTextUnplanned: {
    color: Colors.unplanned,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  chartCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
});
