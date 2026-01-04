import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import { Card } from '../../components/common';
import { RootStackParamList, ActivityWithCategory } from '../../types';
import { addRoutineItem } from '../../database/repositories/routineRepository';
import { getActivitiesWithCategories } from '../../database/repositories/activityRepository';
import { scheduleRoutineStartReminders } from '../../services/notificationService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddRoutineActivityRouteProp = RouteProp<RootStackParamList, 'AddRoutineActivity'>;

export default function AddRoutineActivityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddRoutineActivityRouteProp>();
  const { routineId } = route.params;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<ActivityWithCategory[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithCategory | null>(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [expectedMinutes, setExpectedMinutes] = useState('');

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const data = await getActivitiesWithCategories(false);
        setActivities(data.filter((a: ActivityWithCategory) => !a.isArchived));
      } catch (error) {
        console.error('Error loading activities:', error);
        Alert.alert('Error', 'Failed to load activities');
      } finally {
        setLoading(false);
      }
    };
    loadActivities();
  }, []);

  const handleSave = async () => {
    if (!selectedActivity) {
      Alert.alert('Missing Info', 'Please select an activity.');
      return;
    }

    // Validate time format if provided (HH:MM)
    if (scheduledTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(scheduledTime)) {
      Alert.alert('Invalid Time', 'Please enter time in HH:MM format (e.g., 09:30)');
      return;
    }

    const minutes = parseInt(expectedMinutes, 10);
    if (!expectedMinutes || isNaN(minutes) || minutes <= 0) {
      Alert.alert('Invalid Duration', 'Please enter a valid duration in minutes (required)');
      return;
    }

    setSaving(true);
    try {
      await addRoutineItem({
        routineId,
        activityId: selectedActivity.id,
        scheduledTime: scheduledTime || null,
        expectedDurationMinutes: minutes,
      });
      await scheduleRoutineStartReminders();

      Alert.alert('Success', 'Activity added to routine');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding activity:', error);
      Alert.alert('Error', 'Failed to add activity to routine');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add Activity to Routine</Text>
      <Text style={styles.subtitle}>
        Select an activity and optionally set a scheduled time.
      </Text>

      <Text style={styles.label}>Select Activity</Text>
      {selectedActivity ? (
        <Card style={styles.selectedCard}>
          <View style={styles.selectedHeader}>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedName}>{selectedActivity.name}</Text>
              <Text style={styles.selectedCategory}>{selectedActivity.categoryName}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedActivity(null)}
              style={styles.clearButton}
            >
              <Icon name="close" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        </Card>
      ) : (
        <View style={styles.activityList}>
          {activities.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Icon name="clipboard-text-outline" size={48} color={theme.gray300} />
              <Text style={styles.emptyText}>No activities available</Text>
            </Card>
          ) : (
            activities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                onPress={() => setSelectedActivity(activity)}
              >
                <Card style={styles.activityCard}>
                  <View style={[styles.categoryDot, { backgroundColor: activity.categoryColor }]} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>{activity.name}</Text>
                    <Text style={styles.activityCategory}>{activity.categoryName}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={theme.textSecondary} />
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {selectedActivity && (
        <>
          <Text style={styles.label}>Scheduled Time (Optional)</Text>
          <View style={styles.inputRow}>
            <Icon name="clock-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={styles.timeInput}
              placeholder="HH:MM (e.g., 09:30)"
              placeholderTextColor={theme.inputPlaceholder}
              value={scheduledTime}
              onChangeText={setScheduledTime}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <Text style={styles.helperText}>
            Leave empty if this activity doesn't have a specific time
          </Text>

          <Text style={styles.label}>Expected Duration</Text>
          <Text style={styles.helperText}>Required for automatic progression</Text>
          <View style={styles.inputRow}>
            <Icon name="timer-outline" size={20} color={theme.textSecondary} />
            <TextInput
              style={styles.timeInput}
              placeholder="Minutes (e.g., 45)"
              placeholderTextColor={theme.inputPlaceholder}
              value={expectedMinutes}
              onChangeText={setExpectedMinutes}
              keyboardType="numeric"
            />
          </View>

          <Button
            title={saving ? 'Adding...' : 'Add to Routine'}
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          />
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
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  selectedCard: {
    marginBottom: 8,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  selectedCategory: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  clearButton: {
    padding: 4,
  },
  activityList: {
    maxHeight: 300,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  activityCategory: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  timeInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.textPrimary,
  },
  helperText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  saveButton: {
    marginTop: 24,
  },
});
