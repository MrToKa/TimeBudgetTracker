import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { RootStackParamList, Category } from '../../types';
import { useActivityStore } from '../../store/activityStore';
import Colors from '../../constants/colors';
import Button from '../../components/common/Button';
import CategoryPicker from '../../components/activity/CategoryPicker';

export default function EditActivityScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EditActivity'>>();
  const { activities, loadActivities, createActivity, updateActivity, categories, loadCategories } = useActivityStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [defaultExpected, setDefaultExpected] = useState('');
  const [isPlannedDefault, setIsPlannedDefault] = useState(true);
  const [idlePromptEnabled, setIdlePromptEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      await Promise.all([loadActivities(), loadCategories()]);
      if (route.params?.activityId) {
        const existing = activities.find(a => a.id === route.params.activityId);
        if (existing) {
          setName(existing.name);
          setCategory(categories.find(c => c.id === existing.categoryId) || null);
          setDefaultExpected(existing.defaultExpectedMinutes?.toString() ?? '');
          setIsPlannedDefault(existing.isPlannedDefault);
          setIdlePromptEnabled(existing.idlePromptEnabled);
        }
      } else if (route.params?.categoryId) {
        const cat = categories.find(c => c.id === route.params.categoryId);
        if (cat) setCategory(cat);
      }
    };
    load();
  }, [activities, categories, loadActivities, loadCategories, route.params]);

  const handleSave = async () => {
    if (!name || !category) {
      Alert.alert('Missing info', 'Name and category are required.');
      return;
    }
    setSaving(true);
    try {
      if (route.params?.activityId) {
        await updateActivity(route.params.activityId, {
          name,
          categoryId: category.id,
          defaultExpectedMinutes: defaultExpected ? parseInt(defaultExpected, 10) : null,
          isPlannedDefault,
          idlePromptEnabled,
        });
      } else {
        await createActivity({
          name,
          categoryId: category.id,
          defaultExpectedMinutes: defaultExpected ? parseInt(defaultExpected, 10) : null,
          isPlannedDefault,
          idlePromptEnabled,
        });
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs', { screen: 'Activities' });
      }
    } catch (error) {
      Alert.alert('Save failed', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{route.params?.activityId ? 'Edit Activity' : 'New Activity'}</Text>

      <Text style={styles.label}>Category</Text>
      <CategoryPicker
        categories={categories}
        selectedCategoryId={category?.id ?? null}
        onSelect={setCategory}
        horizontal
      />

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Computer skills"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Default expected minutes (optional)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={defaultExpected}
        onChangeText={setDefaultExpected}
        placeholder="e.g. 45"
      />

      <View style={styles.row}>
        <Text style={styles.label}>Planned by default?</Text>
        <Switch value={isPlannedDefault} onValueChange={setIsPlannedDefault} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Idle prompt enabled?</Text>
        <Switch value={idlePromptEnabled} onValueChange={setIdlePromptEnabled} />
      </View>

      <Button title={saving ? 'Saving...' : 'Save'} onPress={handleSave} disabled={saving} />
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
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
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
    marginVertical: 10,
  },
});
