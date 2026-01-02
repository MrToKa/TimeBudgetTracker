import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';

import { RootStackParamList, ActivityWithCategory } from '../../types';
import { useActivityStore } from '../../store/activityStore';
import Colors from '../../constants/colors';

export default function ActivityDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ActivityDetail'>>();
  const { getActivityById, activities, loadActivities } = useActivityStore();
  const [activity, setActivity] = useState<ActivityWithCategory | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await loadActivities();
      setLoading(false);
    };
    load();
  }, [loadActivities]);

  useEffect(() => {
    setActivity(getActivityById(route.params.activityId));
  }, [activities, getActivityById, route.params.activityId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Activity not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{activity.name}</Text>
      <Text style={styles.subtitle}>{activity.categoryName}</Text>
      <Text style={styles.body}>Default expected: {activity.defaultExpectedMinutes ?? '—'} minutes</Text>
      <Text style={styles.body}>Planned by default: {activity.isPlannedDefault ? 'Yes' : 'No'}</Text>
      <Text style={styles.body}>Idle prompt: {activity.idlePromptEnabled ? 'On' : 'Off'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
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
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 6,
  },
});
