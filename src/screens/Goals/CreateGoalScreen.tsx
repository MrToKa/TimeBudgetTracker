import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Card } from '../../components/common';
import { ActivityWithCategory, GoalType, GoalScope } from '../../types';
import { getActivitiesWithCategories } from '../../database/repositories/activityRepository';
import { createGoal } from '../../database/repositories/goalRepository';

type RootStackParamList = {
  Goals: undefined;
  CreateGoal: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getGoalTypes = (theme: ReturnType<typeof useTheme>['theme']): { value: GoalType; label: string; icon: string; color: string; description: string }[] => [
  { value: 'min', label: 'Minimum', icon: 'arrow-up-bold-circle', color: theme.success, description: 'Spend at least this much time' },
  { value: 'max', label: 'Maximum', icon: 'arrow-down-bold-circle', color: theme.error, description: 'Spend at most this much time' },
];

const GOAL_SCOPES: { value: GoalScope; label: string; icon: string }[] = [
  { value: 'day', label: 'Daily', icon: 'calendar-today' },
  { value: 'week', label: 'Weekly', icon: 'calendar-week' },
  { value: 'month', label: 'Monthly', icon: 'calendar-month' },
];

export default function CreateGoalScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const GOAL_TYPES = useMemo(() => getGoalTypes(theme), [theme]);
  const [activities, setActivities] = useState<ActivityWithCategory[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithCategory | null>(null);
  const [goalType, setGoalType] = useState<GoalType>('min');
  const [scope, setScope] = useState<GoalScope>('day');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await getActivitiesWithCategories(false);
      setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const getTotalMinutes = (): number => {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    return h * 60 + m;
  };

  const handleSave = async () => {
    if (!selectedActivity) {
      Alert.alert('Required', 'Please select an activity');
      return;
    }

    const totalMinutes = getTotalMinutes();
    if (totalMinutes <= 0) {
      Alert.alert('Required', 'Please enter a target time greater than 0');
      return;
    }

    setSaving(true);
    try {
      await createGoal({
        activityId: selectedActivity.id,
        goalType,
        scope,
        targetMinutes: totalMinutes,
      });
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs', { screen: 'Home' });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  const renderActivityPicker = () => {
    if (!showActivityPicker) return null;

    return (
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Activity</Text>
            <TouchableOpacity onPress={() => setShowActivityPicker(false)}>
              <Icon name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerList}>
            {activities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={[
                  styles.pickerItem,
                  selectedActivity?.id === activity.id && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setSelectedActivity(activity);
                  setShowActivityPicker(false);
                }}
              >
                <View style={[styles.activityColor, { backgroundColor: activity.categoryColor }]} />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>{activity.name}</Text>
                  <Text style={styles.activityCategory}>{activity.categoryName}</Text>
                </View>
                {selectedActivity?.id === activity.id && (
                  <Icon name="check" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Create Goal</Text>

        {/* Activity Selection */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <TouchableOpacity
            style={styles.activitySelector}
            onPress={() => setShowActivityPicker(true)}
          >
            {selectedActivity ? (
              <View style={styles.selectedActivity}>
                <View style={[styles.activityColor, { backgroundColor: selectedActivity.categoryColor }]} />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName}>{selectedActivity.name}</Text>
                  <Text style={styles.activityCategory}>{selectedActivity.categoryName}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.placeholder}>Select an activity...</Text>
            )}
            <Icon name="chevron-down" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* Goal Type */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Goal Type</Text>
          <View style={styles.optionGroup}>
            {GOAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.optionButton,
                  goalType === type.value && styles.optionButtonSelected,
                  goalType === type.value && { borderColor: type.color },
                ]}
                onPress={() => setGoalType(type.value)}
              >
                <Icon
                  name={type.icon}
                  size={24}
                  color={goalType === type.value ? type.color : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    goalType === type.value && { color: type.color },
                  ]}
                >
                  {type.label}
                </Text>
                <Text style={styles.optionDescription}>{type.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Scope */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.scopeGroup}>
            {GOAL_SCOPES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.scopeButton,
                  scope === s.value && styles.scopeButtonSelected,
                ]}
                onPress={() => setScope(s.value)}
              >
                <Icon
                  name={s.icon}
                  size={20}
                  color={scope === s.value ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.scopeLabel,
                    scope === s.value && styles.scopeLabelSelected,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Target Time */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Target Time</Text>
          <View style={styles.timeInputs}>
            <View style={styles.timeField}>
              <TextInput
                style={styles.timeInput}
                value={hours}
                onChangeText={setHours}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                maxLength={3}
              />
              <Text style={styles.timeLabel}>hours</Text>
            </View>
            <View style={styles.timeField}>
              <TextInput
                style={styles.timeInput}
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textTertiary}
                maxLength={2}
              />
              <Text style={styles.timeLabel}>minutes</Text>
            </View>
          </View>
          {getTotalMinutes() > 0 && (
            <Text style={styles.totalTime}>
              Total: {Math.floor(getTotalMinutes() / 60)}h {getTotalMinutes() % 60}m per {scope}
            </Text>
          )}
        </Card>

        <Button
          title={saving ? 'Saving...' : 'Create Goal'}
          onPress={handleSave}
          disabled={saving || !selectedActivity || getTotalMinutes() <= 0}
          style={styles.saveButton}
        />
      </ScrollView>

      {renderActivityPicker()}
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 12,
  },
  activitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.surface,
  },
  selectedActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityColor: {
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
    fontWeight: '500',
    color: theme.textPrimary,
  },
  activityCategory: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  placeholder: {
    fontSize: 15,
    color: theme.textTertiary,
  },
  optionGroup: {
    gap: 12,
  },
  optionButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.surface,
  },
  optionButtonSelected: {
    backgroundColor: theme.gray50,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginTop: 8,
  },
  optionDescription: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 4,
  },
  scopeGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  scopeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.surface,
    gap: 8,
  },
  scopeButtonSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + '10',
  },
  scopeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  scopeLabelSelected: {
    color: theme.primary,
    fontWeight: '600',
  },
  timeInputs: {
    flexDirection: 'row',
    gap: 16,
  },
  timeField: {
    flex: 1,
    alignItems: 'center',
  },
  timeInput: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: theme.textPrimary,
    backgroundColor: theme.inputBackground,
  },
  timeLabel: {
    marginTop: 8,
    fontSize: 14,
    color: theme.textSecondary,
  },
  totalTime: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: theme.primary,
  },
  saveButton: {
    marginTop: 8,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  pickerList: {
    padding: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  pickerItemSelected: {
    backgroundColor: theme.primary + '10',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
});
