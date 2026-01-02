import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useActivityStore } from '../../store/activityStore';
import { useTimerStore } from '../../store/timerStore';
import { RootStackParamList } from '../../types';
import Colors from '../../constants/colors';
import Button from '../../components/common/Button';
import TimerCard from '../../components/timer/TimerCard';
import ActivityCard from '../../components/activity/ActivityCard';

export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { favorites, loadFavorites, loadActivities, loadCategories } = useActivityStore();
  const { runningTimers, loadRunningTimers, stopTimer, startTimer } = useTimerStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await Promise.all([loadFavorites(), loadActivities(), loadCategories(), loadRunningTimers()]);
      setLoading(false);
    };
    load();
  }, [loadFavorites, loadActivities, loadCategories, loadRunningTimers]);

  const handleStartFavorite = async (activityId: string) => {
    const activity = favorites.find(f => f.id === activityId);
    if (!activity) return;
    try {
      await startTimer(activity, activity.isPlannedDefault, activity.defaultExpectedMinutes);
      await loadRunningTimers();
    } finally {
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Time Budget Tracker</Text>
        <Text style={styles.subtitle}>Offline-first · Parallel timers · Planned vs Unplanned</Text>
        <View style={styles.actionsRow}>
          <Button title="Manual add" onPress={() => navigation.navigate('ManualAdd', {})} />
          <Button
            title="Stop all"
            variant="outline"
            onPress={loadRunningTimers}
            style={{ marginLeft: 8 }}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Running timers</Text>
              <TouchableOpacity onPress={loadRunningTimers}>
                <Icon name="refresh" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            {runningTimers.length === 0 ? (
              <Text style={styles.emptyText}>No active timers. Start one from favorites.</Text>
            ) : (
              runningTimers.map(timer => (
                <TimerCard
                  key={timer.id}
                  timer={timer}
                  onStop={() => stopTimer(timer.id)}
                />
              ))
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Favorites</Text>
            </View>
            {favorites.length === 0 ? (
              <Text style={styles.emptyText}>No favorites yet. Mark activities to pin them here.</Text>
            ) : (
              favorites.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onPress={() => navigation.navigate('ActivityDetail', { activityId: activity.id })}
                  onStartTimer={() => handleStartFavorite(activity.id)}
                  showStartButton
                  compact
                />
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  section: {
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.textSecondary,
  },
  favoriteButton: {
    marginTop: 8,
  },
  startIcon: {
    marginLeft: 6,
  },
});
