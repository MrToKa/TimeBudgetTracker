import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Card } from '../../components/common';
import { Goal, GoalType, GoalScope } from '../../types';
import { getGoalById, updateGoal } from '../../database/repositories/goalRepository';
import { getActivityByIdWithCategory } from '../../database/repositories/activityRepository';

type RootStackParamList = {
  Goals: undefined;
  EditGoal: { goalId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditGoalRouteProp = RouteProp<RootStackParamList, 'EditGoal'>;

const getGoalTypes = (theme: ReturnType<typeof useTheme>['theme']): { value: GoalType; label: string; icon: string; color: string; description: string }[] => [
  { value: 'min', label: 'Minimum', icon: 'arrow-up-bold-circle', color: theme.success, description: 'Spend at least this much time' },
  { value: 'max', label: 'Maximum', icon: 'arrow-down-bold-circle', color: theme.error, description: 'Spend at most this much time' },
];

const GOAL_SCOPES: { value: GoalScope; label: string; icon: string }[] = [
  { value: 'day', label: 'Daily', icon: 'calendar-today' },
  { value: 'week', label: 'Weekly', icon: 'calendar-week' },
  { value: 'month', label: 'Monthly', icon: 'calendar-month' },
];

export default function EditGoalScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditGoalRouteProp>();
  const { goalId } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const GOAL_TYPES = useMemo(() => getGoalTypes(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [activityName, setActivityName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('min');
  const [scope, setScope] = useState<GoalScope>('day');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoal();
  }, [goalId]);

  const loadGoal = async () => {
    try {
      const goal = await getGoalById(goalId);
      if (!goal) {
        Alert.alert('Error', 'Goal not found');
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('MainTabs', { screen: 'Home' });
        }
        return;
      }

      setGoalType(goal.goalType);
      setScope(goal.scope);
      setHours(Math.floor(goal.targetMinutes / 60).toString());
      setMinutes((goal.targetMinutes % 60).toString());

      // Load activity info
      const activity = await getActivityByIdWithCategory(goal.activityId);
      if (activity) {
        setActivityName(activity.name);
        setCategoryName(activity.categoryName);
      }
    } catch (error) {
      console.error('Error loading goal:', error);
      Alert.alert('Error', 'Failed to load goal');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs', { screen: 'Home' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getTotalMinutes = (): number => {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    return h * 60 + m;
  };

  const handleSave = async () => {
    const totalMinutes = getTotalMinutes();
    if (totalMinutes <= 0) {
      Alert.alert('Required', 'Please enter a target time greater than 0');
      return;
    }

    setSaving(true);
    try {
      await updateGoal(goalId, {
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
      Alert.alert('Error', error.message || 'Failed to update goal');
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <Text style={styles.screenTitle}>Edit Goal</Text>

        {/* Activity Info (read-only) */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.activityDisplay}>
            <Icon name="flag-checkered" size={20} color={theme.primary} />
            <View style={styles.activityInfo}>
              <Text style={styles.activityName}>{activityName}</Text>
              <Text style={styles.activityCategory}>{categoryName}</Text>
            </View>
          </View>
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
                placeholderTextColor={theme.inputPlaceholder}
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
                placeholderTextColor={theme.inputPlaceholder}
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
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving || getTotalMinutes() <= 0}
          style={styles.saveButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  activityDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.gray50,
    borderRadius: 8,
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  activityCategory: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
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
});
