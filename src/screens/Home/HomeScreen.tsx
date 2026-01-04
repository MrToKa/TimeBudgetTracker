import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useActivityStore } from '../../store/activityStore';
import { useTimerStore } from '../../store/timerStore';
import { useRoutineExecutionStore } from '../../store/routineExecutionStore';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import TimerCard from '../../components/timer/TimerCard';
import ActivityCard from '../../components/activity/ActivityCard';
import { Card } from '../../components/common';

export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { favorites, loadFavorites, loadActivities, loadCategories } = useActivityStore();
  const { runningTimers, loadRunningTimers, stopTimer, startTimer } = useTimerStore();
  const { 
    runningRoutine, 
    pauseRoutine, 
    resumeRoutine, 
    nextActivity, 
    stopRoutine,
    getCurrentActivityDuration,
    getTotalRoutineDuration,
    hydrateRunningRoutine,
    lastAutoStartedRoutineId,
    markAutoStartedRoutine,
  } = useRoutineExecutionStore();
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    const load = async () => {
      await Promise.all([loadFavorites(), loadActivities(), loadCategories(), loadRunningTimers()]);
      await hydrateRunningRoutine();
      setLoading(false);
    };
    load();
  }, [loadFavorites, loadActivities, loadCategories, loadRunningTimers, hydrateRunningRoutine]);

  // When an auto-started routine fires in background, hydrate once app returns
  useEffect(() => {
    if (lastAutoStartedRoutineId) {
      hydrateRunningRoutine();
      markAutoStartedRoutine(null);
    }
  }, [lastAutoStartedRoutineId, hydrateRunningRoutine, markAutoStartedRoutine]);

  // Check for autostarted routines whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      hydrateRunningRoutine();
    }, [hydrateRunningRoutine])
  );

  // Update timer every second when routine is running
  useEffect(() => {
    if (runningRoutine && !runningRoutine.isPaused) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [runningRoutine]);

  const handleStartFavorite = async (activityId: string) => {
    const activity = favorites.find(f => f.id === activityId);
    if (!activity) return;
    try {
      await startTimer(activity, activity.isPlannedDefault, activity.defaultExpectedMinutes);
      await loadRunningTimers();
    } catch (error) {
      Alert.alert('Cannot Start Timer', (error as Error).message);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextActivity = async () => {
    try {
      await nextActivity();
    } catch (error) {
      console.error('Error moving to next activity:', error);
      Alert.alert('Error', 'Failed to move to next activity');
    }
  };

  const handleStopRoutine = () => {
    Alert.alert(
      'Stop Routine',
      'Are you sure you want to stop this routine? Progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopRoutine();
            } catch (error) {
              console.error('Error stopping routine:', error);
              Alert.alert('Error', 'Failed to stop routine');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Time Budget Tracker</Text>
        <Text style={styles.subtitle}>Offline-first · Parallel timers · Planned vs Unplanned</Text>
        <View style={styles.actionsRow}>
          <Button
            title="Start Timer"
            onPress={() => navigation.navigate('ManualAdd', {})}
            icon={<Icon name="plus" size={18} color={theme.white} style={styles.buttonIcon} />}
          />
          <Button
            title="Stop all"
            variant="outline"
            onPress={loadRunningTimers}
            style={{ marginLeft: 8 }}
            icon={<Icon name="stop" size={18} color={theme.primary} style={styles.buttonIcon} />}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : (
        <>
          {runningRoutine && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Running Routine</Text>
              </View>
              <Card style={styles.routineCard}>
                <View style={styles.routineHeader}>
                  <View style={styles.routineInfo}>
                    <Text style={styles.routineName}>{runningRoutine.routineName}</Text>
                    <Text style={styles.routineProgress}>
                      Activity {runningRoutine.currentActivityIndex + 1} of {runningRoutine.activities.length}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={handleStopRoutine} style={styles.stopRoutineButton}>
                    <Icon name="close" size={24} color={theme.error} />
                  </TouchableOpacity>
                </View>

                <View style={styles.currentActivity}>
                  <View style={[styles.categoryBadge, { backgroundColor: runningRoutine.activities[runningRoutine.currentActivityIndex].categoryColor + '20' }]}>
                    <View
                      style={[
                        styles.categoryDot,
                        { backgroundColor: runningRoutine.activities[runningRoutine.currentActivityIndex].categoryColor },
                      ]}
                    />
                    <Text style={styles.categoryText}>
                      {runningRoutine.activities[runningRoutine.currentActivityIndex].categoryName}
                    </Text>
                  </View>
                  <Text style={styles.activityName}>
                    {runningRoutine.activities[runningRoutine.currentActivityIndex].activityName}
                  </Text>
                  
                  <View style={styles.timers}>
                    <View style={styles.timerItem}>
                      <Text style={styles.timerLabel}>Activity Time</Text>
                      <Text style={styles.timerValue}>
                        {formatDuration(Math.floor(getCurrentActivityDuration()))}
                      </Text>
                      {runningRoutine.activities[runningRoutine.currentActivityIndex].expectedMinutes && (
                        <Text style={styles.expectedTime}>
                          / {runningRoutine.activities[runningRoutine.currentActivityIndex].expectedMinutes} min
                        </Text>
                      )}
                    </View>
                    <View style={styles.timerItem}>
                      <Text style={styles.timerLabel}>Total Routine</Text>
                      <Text style={styles.timerValue}>
                        {formatDuration(Math.floor(getTotalRoutineDuration()))}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routineControls}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={runningRoutine.isPaused ? resumeRoutine : pauseRoutine}
                    >
                      <Icon
                        name={runningRoutine.isPaused ? 'play' : 'pause'}
                        size={24}
                        color={theme.primary}
                      />
                      <Text style={styles.controlButtonText}>
                        {runningRoutine.isPaused ? 'Resume' : 'Pause'}
                      </Text>
                    </TouchableOpacity>
                    
                  <TouchableOpacity
                    style={[styles.controlButton, styles.nextButton]}
                    onPress={
                      runningRoutine.currentActivityIndex === runningRoutine.activities.length - 1
                        ? handleStopRoutine
                        : handleNextActivity
                    }
                  >
                    <Icon
                      name={
                        runningRoutine.currentActivityIndex === runningRoutine.activities.length - 1
                          ? 'stop'
                          : 'skip-next'
                      }
                      size={24}
                      color={theme.white}
                    />
                    <Text style={[styles.controlButtonText, styles.nextButtonText]}>
                      {runningRoutine.currentActivityIndex === runningRoutine.activities.length - 1
                        ? 'Finish Routine'
                        : 'Next Activity'}
                    </Text>
                  </TouchableOpacity>
                  </View>

                  {runningRoutine.currentActivityIndex < runningRoutine.activities.length - 1 && (
                    <View style={styles.upNext}>
                      <Text style={styles.upNextLabel}>Up next:</Text>
                      <Text style={styles.upNextActivity}>
                        {runningRoutine.activities[runningRoutine.currentActivityIndex + 1].activityName}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Running timers</Text>
              <TouchableOpacity onPress={loadRunningTimers}>
                <Icon name="refresh" size={22} color={theme.primary} />
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
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
    color: theme.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
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
    color: theme.textPrimary,
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.textSecondary,
  },
  favoriteButton: {
    marginTop: 8,
  },
  startIcon: {
    marginLeft: 6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  routineCard: {
    marginHorizontal: 16,
    padding: 16,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  routineProgress: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  stopRoutineButton: {
    padding: 4,
  },
  currentActivity: {
    marginTop: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 16,
  },
  timers: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  timerItem: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 12,
  },
  timerLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.primary,
  },
  expectedTime: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  routineControls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.cardBackground,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.primary,
    padding: 12,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  nextButton: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  nextButtonText: {
    color: theme.white,
  },
  upNext: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 12,
  },
  upNextLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  upNextActivity: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
});
