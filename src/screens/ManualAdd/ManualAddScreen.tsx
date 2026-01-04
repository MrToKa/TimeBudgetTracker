import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, Alert, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import { useTimerStore } from '../../store/timerStore';
import { useActivityStore } from '../../store/activityStore';
import { RootStackParamList, Category } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import CategoryPicker from '../../components/activity/CategoryPicker';

export default function ManualAddScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { startManualTimer, loadRunningTimers } = useTimerStore();
  const { categories, loadCategories } = useActivityStore();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [activityName, setActivityName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [budgetMinutes, setBudgetMinutes] = useState('30');
  const [isPlanned, setIsPlanned] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleStartTimer = async () => {
    if (!activityName || !selectedCategory) {
      Alert.alert('Missing info', 'Please enter a name and pick a category.');
      return;
    }
    const budget = parseInt(budgetMinutes || '0', 10);
    if (budget <= 0) {
      Alert.alert('Invalid budget', 'Budget time must be greater than 0 minutes.');
      return;
    }

    setStarting(true);
    try {
      await startManualTimer(
        activityName,
        selectedCategory.id,
        selectedCategory.name,
        selectedCategory.color,
        budget,
        isPlanned
      );
      await loadRunningTimers();
      // Navigate back to home to see the running timer
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs', { screen: 'Home' });
      }
    } catch (error) {
      Alert.alert('Start failed', (error as Error).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Start Timer</Text>
      <Text style={styles.subtitle}>Start a timer with a budget. You'll get notifications before time's up.</Text>

      <Text style={styles.label}>Category</Text>
      <CategoryPicker
        categories={categories}
        selectedCategoryId={selectedCategory?.id ?? null}
        onSelect={setSelectedCategory}
        horizontal
      />

      <Text style={styles.label}>Activity name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Language learning"
        placeholderTextColor={theme.inputPlaceholder}
        value={activityName}
        onChangeText={setActivityName}
      />

      <Text style={styles.label}>Budget (minutes)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={budgetMinutes}
        onChangeText={setBudgetMinutes}
        placeholder="e.g. 30"
        placeholderTextColor={theme.inputPlaceholder}
      />
      <Text style={styles.helperText}>
        You'll be notified 5 minutes before time's up and when the timer is overdue.
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>Planned?</Text>
        <Switch value={isPlanned} onValueChange={setIsPlanned} />
      </View>

      <Button title={starting ? 'Starting...' : 'Start Timer'} onPress={handleStartTimer} disabled={starting} />
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: theme.textPrimary,
  },
  input: {
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  helperText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
