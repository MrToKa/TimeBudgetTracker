import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

import { useTimerStore } from '../../store/timerStore';
import Colors from '../../constants/colors';
import Button from '../../components/common/Button';
import TimerCard from '../../components/timer/TimerCard';

export default function TimerScreen() {
  const { runningTimers, loadRunningTimers, stopTimer, stopAllTimers } = useTimerStore();
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
          <Button title="Refresh" variant="outline" onPress={loadRunningTimers} />
          <Button
            title="Stop all"
            variant="danger"
            style={{ marginLeft: 8 }}
            onPress={handleStopAll}
            loading={stopAllLoading}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
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
  actions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.textSecondary,
  },
});
