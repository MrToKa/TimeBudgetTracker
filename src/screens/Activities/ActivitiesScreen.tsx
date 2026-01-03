import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import { useActivityStore } from '../../store/activityStore';
import { useTimerStore } from '../../store/timerStore';
import { RootStackParamList } from '../../types';
import Colors from '../../constants/colors';
import Button from '../../components/common/Button';
import ActivityCard from '../../components/activity/ActivityCard';
import CategoryPicker from '../../components/activity/CategoryPicker';

export default function ActivitiesScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { activities, categories, loadActivities, loadCategories, toggleFavorite } = useActivityStore();
  const { startTimer, loadRunningTimers } = useTimerStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const load = async () => {
      await Promise.all([loadActivities(), loadCategories()]);
      setLoading(false);
    };
    load();
  }, [loadActivities, loadCategories]);

  const handleStart = async (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;
    try {
      await startTimer(activity, activity.isPlannedDefault, activity.defaultExpectedMinutes);
      await loadRunningTimers();
    } catch (error) {
      Alert.alert('Cannot Start Timer', (error as Error).message);
    }
  };

  const filtered = selectedCategory
    ? activities.filter(a => a.categoryId === selectedCategory && !a.isArchived)
    : activities.filter(a => !a.isArchived);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadActivities(), loadCategories()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Activities</Text>
        <Text style={styles.subtitle}>Favorites · Recency · Frequency aware ordering.</Text>
        <View style={styles.actions}>
          <Button
            title="New activity"
            onPress={() => navigation.navigate('EditActivity', {})}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : (
        <>
          <CategoryPicker
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelect={cat => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
            horizontal
          />
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No activities yet. Create one to get started.</Text>
          ) : (
            filtered.map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onPress={() => navigation.navigate('ActivityDetail', { activityId: activity.id })}
                onStartTimer={() => handleStart(activity.id)}
                onToggleFavorite={() => toggleFavorite(activity.id)}
                showStartButton
              />
            ))
          )}
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
