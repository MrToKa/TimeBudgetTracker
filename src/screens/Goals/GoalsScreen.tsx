import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button } from '../../components/common';
import { GoalWithActivity, GoalScope, GoalType } from '../../types';
import {
  getGoalsWithActivities,
  deleteGoal,
  toggleGoalActive,
} from '../../database/repositories/goalRepository';
import { formatDuration } from '../../utils/dateUtils';

type RootStackParamList = {
  Goals: undefined;
  CreateGoal: undefined;
  EditGoal: { goalId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SCOPE_LABELS: Record<GoalScope, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
};

const SCOPE_ICONS: Record<GoalScope, string> = {
  day: 'calendar-today',
  week: 'calendar-week',
  month: 'calendar-month',
};

export default function GoalsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [goals, setGoals] = useState<GoalWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const loadGoals = useCallback(async () => {
    try {
      const data = await getGoalsWithActivities(!showInactive);
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showInactive]);

  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [loadGoals])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGoals();
  }, [loadGoals]);

  const handleToggleActive = async (goal: GoalWithActivity) => {
    try {
      await toggleGoalActive(goal.id);
      loadGoals();
    } catch (error) {
      console.error('Error toggling goal:', error);
      Alert.alert('Error', 'Failed to update goal status');
    }
  };

  const handleDeleteGoal = (goal: GoalWithActivity) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete the ${goal.goalType === 'min' ? 'minimum' : 'maximum'} goal for "${goal.activityName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goal.id);
              loadGoals();
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const renderGoalItem = ({ item }: { item: GoalWithActivity }) => {
    const isMinGoal = item.goalType === 'min';
    
    return (
      <Card style={[styles.goalCard, !item.isActive && styles.goalCardInactive]}>
        <View style={styles.goalHeader}>
          <View style={styles.goalInfo}>
            <Text style={styles.activityName} numberOfLines={1}>{item.activityName}</Text>
            <Text style={styles.categoryName}>{item.categoryName}</Text>
          </View>
          <View style={styles.goalActions}>
            <TouchableOpacity
              onPress={() => handleToggleActive(item)}
              style={styles.actionButton}
            >
              <Icon
                name={item.isActive ? 'pause-circle' : 'play-circle'}
                size={24}
                color={item.isActive ? theme.warning : theme.success}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('EditGoal', { goalId: item.id })}
              style={styles.actionButton}
            >
              <Icon name="pencil" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteGoal(item)}
              style={styles.actionButton}
            >
              <Icon name="delete" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.goalDetails}>
          <View style={styles.goalType}>
            <Icon
              name={isMinGoal ? 'arrow-up-bold-circle' : 'arrow-down-bold-circle'}
              size={20}
              color={isMinGoal ? theme.success : theme.error}
            />
            <Text style={[styles.goalTypeText, isMinGoal ? styles.goalTypeMin : styles.goalTypeMax]}>
              {isMinGoal ? 'Minimum' : 'Maximum'}
            </Text>
          </View>
          
          <View style={styles.goalScope}>
            <Icon name={SCOPE_ICONS[item.scope]} size={18} color={theme.textSecondary} />
            <Text style={styles.goalScopeText}>{SCOPE_LABELS[item.scope]}</Text>
          </View>
          
          <View style={styles.goalTarget}>
            <Icon name="target" size={18} color={theme.primary} />
            <Text style={styles.goalTargetText}>{formatDuration(item.targetMinutes)}</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="flag-checkered" size={64} color={theme.gray300} />
      <Text style={styles.emptyTitle}>No Goals Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create goals to track minimum or maximum time{'\n'}you want to spend on activities
      </Text>
      <Button
        title="Create Your First Goal"
        onPress={() => navigation.navigate('CreateGoal')}
        style={styles.emptyButton}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Goals</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowInactive(!showInactive)}
        >
          <Icon
            name={showInactive ? 'eye' : 'eye-off'}
            size={20}
            color={theme.textSecondary}
          />
          <Text style={styles.filterText}>
            {showInactive ? 'Showing all' : 'Active only'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(item) => item.id}
        renderItem={renderGoalItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGoal')}
      >
        <Icon name="plus" size={28} color={theme.white} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.textSecondary,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  goalCard: {
    marginBottom: 12,
  },
  goalCardInactive: {
    opacity: 0.6,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  categoryName: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 6,
    marginLeft: 4,
  },
  goalDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  goalType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalTypeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  goalTypeMin: {
    color: theme.success,
  },
  goalTypeMax: {
    color: theme.error,
  },
  goalScope: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalScopeText: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.textSecondary,
  },
  goalTarget: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalTargetText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
