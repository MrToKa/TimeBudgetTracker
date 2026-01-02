import React, { useState, useEffect } from 'react';
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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Colors from '../../constants/colors';
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

const GOAL_TYPES: { value: GoalType; label: string; icon: string; color: string; description: string }[] = [
  { value: 'min', label: 'Minimum', icon: 'arrow-up-bold-circle', color: Colors.success, description: 'Spend at least this much time' },
  { value: 'max', label: 'Maximum', icon: 'arrow-down-bold-circle', color: Colors.error, description: 'Spend at most this much time' },
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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Edit Goal</Text>

        {/* Activity Info (read-only) */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.activityDisplay}>
            <Icon name="flag-checkered" size={20} color={Colors.primary} />
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
                  color={goalType === type.value ? type.color : Colors.textSecondary}
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
                  color={scope === s.value ? Colors.primary : Colors.textSecondary}
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
                placeholderTextColor={Colors.textTertiary}
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
                placeholderTextColor={Colors.textTertiary}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  activityDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 8,
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  activityCategory: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  optionGroup: {
    gap: 12,
  },
  optionButton: {
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  optionButtonSelected: {
    backgroundColor: Colors.gray50,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
    gap: 8,
  },
  scopeButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  scopeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  scopeLabelSelected: {
    color: Colors.primary,
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
    borderColor: Colors.border,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  timeLabel: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  totalTime: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: Colors.primary,
  },
  saveButton: {
    marginTop: 8,
  },
});
