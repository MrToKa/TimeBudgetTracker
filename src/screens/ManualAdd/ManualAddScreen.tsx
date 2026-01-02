import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, Alert, ScrollView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import { useTimerStore } from '../../store/timerStore';
import { useActivityStore } from '../../store/activityStore';
import { RootStackParamList, Category } from '../../types';
import Colors from '../../constants/colors';
import Button from '../../components/common/Button';
import CategoryPicker from '../../components/activity/CategoryPicker';

export default function ManualAddScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { startManualTimer, loadRunningTimers } = useTimerStore();
  const { categories, loadCategories } = useActivityStore();

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
