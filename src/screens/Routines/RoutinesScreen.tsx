import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, Button } from '../../components/common';
import { Routine, RoutineType, RootStackParamList } from '../../types';
import { getAllRoutines, deleteRoutine, toggleRoutineActive } from '../../database/repositories/routineRepository';
import { scheduleRoutineStartReminders } from '../../services/notificationService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ROUTINE_TYPE_ICONS: Record<RoutineType, string> = {
  daily: 'calendar-today',
  weekly: 'calendar-week',
};

const ROUTINE_TYPE_LABELS: Record<RoutineType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
};

export default function RoutinesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets.bottom), [theme, insets.bottom]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoutines = useCallback(async () => {
    try {
      const data = await getAllRoutines(false);
      setRoutines(data);
    } catch (error) {
      console.error('Error loading routines:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRoutines();
  }, [loadRoutines]);

  const handleToggleActive = async (routine: Routine) => {
    try {
      await toggleRoutineActive(routine.id);
      await scheduleRoutineStartReminders();
      loadRoutines();
    } catch (error) {
      console.error('Error toggling routine:', error);
      Alert.alert('Error', 'Failed to update routine status');
    }
  };

  const handleDeleteRoutine = (routine: Routine) => {
    Alert.alert(
      'Delete Routine',
      `Are you sure you want to delete "${routine.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoutine(routine.id);
              await scheduleRoutineStartReminders();
              loadRoutines();
            } catch (error) {
              console.error('Error deleting routine:', error);
              Alert.alert('Error', 'Failed to delete routine');
            }
          },
        },
      ]
    );
  };

  const renderRoutineItem = ({ item }: { item: Routine }) => {
    return (
      <Card style={[styles.routineCard, !item.isActive && styles.inactiveCard]}>
        <View style={styles.routineRow}>
          <View style={[styles.routineIcon, { backgroundColor: theme.secondary + '15' }]}>
            <Icon
              name={ROUTINE_TYPE_ICONS[item.routineType]}
              size={24}
              color={item.isActive ? theme.secondary : theme.gray400}
            />
          </View>
          <View style={styles.routineInfo}>
            <Text style={styles.routineName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.routineType}>{ROUTINE_TYPE_LABELS[item.routineType]} routine</Text>
          </View>
          <View style={styles.routineActions}>
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
              onPress={() => navigation.navigate('RoutineDetail', { routineId: item.id })}
              style={styles.actionButton}
            >
              <Icon name="pencil" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteRoutine(item)}
              style={styles.actionButton}
            >
              <Icon name="delete" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="calendar-clock" size={64} color={theme.gray300} />
      <Text style={styles.emptyTitle}>No Routines Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create routines to schedule your daily{'\n'}or weekly activities automatically
      </Text>
      <Button
        title="Create Your First Routine"
        onPress={() => navigation.navigate('CreateRoutine')}
        style={styles.emptyButton}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Routines</Text>
      </View>

      <View style={styles.infoCard}>
        <Icon name="information" size={20} color={theme.info} />
        <Text style={styles.infoText}>
          Routines let you define templates for your day or week. 
          Activities in a routine can be started with one tap.
        </Text>
      </View>

      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={renderRoutineItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateRoutine')}
      >
        <Icon name="plus" size={28} color={theme.white} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme'], bottomInset: number = 0) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.info + '10',
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 19,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  routineCard: {
    marginBottom: 12,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  routineCardInactive: {
    opacity: 0.6,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routineIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  routineType: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  routineActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 6,
    marginLeft: 4,
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
    bottom: Math.max(bottomInset, 20) + 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
