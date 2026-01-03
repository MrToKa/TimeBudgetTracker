import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTimerStore } from '../../store/timerStore';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import TimerCard from '../../components/timer/TimerCard';

export default function TimerScreen() {
  const { runningTimers, loadRunningTimers, stopTimer, stopAllTimers } = useTimerStore();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [stopAllLoading, setStopAllLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      await loadRunningTimers();
      setLoading(false);
    };
    load();
  }, [loadRunningTimers]);

  const handleStopAll = async () => {
    setStopAllLoading(true);
    await stopAllTimers();
    setStopAllLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Parallel Timers</Text>
        <Text style={styles.subtitle}>Unlimited overlapping timers allowed.</Text>
        <View style={styles.actions}>
          <Button
            title="Refresh"
            variant="outline"
            onPress={loadRunningTimers}
            icon={<Icon name="refresh" size={18} color={theme.primary} style={styles.actionIcon} />}
          />
          <Button
            title="Stop all"
            variant="danger"
            style={{ marginLeft: 8 }}
            onPress={handleStopAll}
            loading={stopAllLoading}
            icon={<Icon name="stop" size={18} color={theme.white} style={styles.actionIcon} />}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : runningTimers.length === 0 ? (
        <Text style={styles.emptyText}>No active timers. Start one from Activities or Home.</Text>
      ) : (
        runningTimers.map(timer => (
          <TimerCard
            key={timer.id}
            timer={timer}
            onStop={() => stopTimer(timer.id)}
          />
        ))
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
  actions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.textSecondary,
  },
  actionIcon: {
    marginRight: 8,
  },
});
