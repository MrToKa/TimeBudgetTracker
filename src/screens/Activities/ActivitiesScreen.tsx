import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import { useActivityStore } from '../../store/activityStore';
import { useTimerStore } from '../../store/timerStore';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import ActivityCard from '../../components/activity/ActivityCard';
import CategoryPicker from '../../components/activity/CategoryPicker';

export default function ActivitiesScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const { activities, categories, loadActivities, loadCategories, toggleFavorite } = useActivityStore();
  const { startTimer, loadRunningTimers } = useTimerStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    const load = async () => {
      await Promise.all([loadActivities(), loadCategories()]);
      setLoading(false);
    };
    load();
  }, []);

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

  // Define category sort order
  const categoryOrder: Record<string, number> = {
    'Daily Basics': 1,
    'Education': 2,
    'Health': 3,
    'Entertainment': 4,
    'Hobbies': 5,
    'Time Wasting': 6,
  };

  const filtered = useMemo(() => {
    const filteredActivities = selectedCategory
      ? activities.filter(a => a.categoryId === selectedCategory && !a.isArchived)
      : activities.filter(a => !a.isArchived);

    // Sort by category type first, then alphabetically by name
    return filteredActivities.sort((a, b) => {
      const orderA = categoryOrder[a.categoryName] ?? 999;
      const orderB = categoryOrder[b.categoryName] ?? 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Within same category, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [activities, selectedCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadActivities(), loadCategories()]);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
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
        <ActivityIndicator size="large" color={theme.primary} />
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
});
