import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, Switch, Alert, ScrollView } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';

import { RootStackParamList, ActivityWithCategory, Category } from '../../types';
import { useActivityStore } from '../../store/activityStore';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import CategoryPicker from '../../components/activity/CategoryPicker';

export default function ActivityDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ActivityDetail'>>();
  const { getActivityById, activities, loadActivities, updateActivity, deleteActivity, categories, loadCategories } = useActivityStore();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [activity, setActivity] = useState<ActivityWithCategory | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Editable fields
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [defaultExpected, setDefaultExpected] = useState('');
  const [isPlannedDefault, setIsPlannedDefault] = useState(true);
  const [idlePromptEnabled, setIdlePromptEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      await Promise.all([loadActivities(), loadCategories()]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const act = getActivityById(route.params.activityId);
    setActivity(act);
    if (act) {
      setName(act.name);
      setDefaultExpected(act.defaultExpectedMinutes?.toString() ?? '');
      setIsPlannedDefault(act.isPlannedDefault);
      setIdlePromptEnabled(act.idlePromptEnabled);
      const cat = categories.find(c => c.id === act.categoryId);
      setSelectedCategory(cat || null);
    }
  }, [activities, categories, route.params.activityId]);

  const handleSave = async () => {
    if (!activity) return;
    if (!name.trim()) {
      Alert.alert('Missing info', 'Activity name is required.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Missing info', 'Category is required.');
      return;
    }
    
    setSaving(true);
    try {
      await updateActivity(activity.id, {
        name: name.trim(),
        categoryId: selectedCategory.id,
        defaultExpectedMinutes: defaultExpected ? parseInt(defaultExpected, 10) : null,
        isPlannedDefault,
        idlePromptEnabled,
      });
      Alert.alert('Success', 'Activity updated successfully.');
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Save failed', (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!activity) return;
    Alert.alert(
      'Delete activity',
      'This will permanently remove the activity. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteActivity(activity.id);
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainTabs', { screen: 'Activities' });
              }
            } catch (error) {
              Alert.alert('Delete failed', (error as Error).message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Edit Activity</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Activity name"
        placeholderTextColor={theme.inputPlaceholder}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Category (Type)</Text>
      <CategoryPicker
        categories={categories}
        selectedCategoryId={selectedCategory?.id ?? null}
        onSelect={setSelectedCategory}
        horizontal
      />

      <Text style={styles.label}>Default expected time (minutes)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={defaultExpected}
        onChangeText={setDefaultExpected}
        placeholder="e.g. 45"
        placeholderTextColor={theme.inputPlaceholder}
      />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Planned by default</Text>
        <Switch value={isPlannedDefault} onValueChange={setIsPlannedDefault} />
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Idle prompt enabled</Text>
        <Switch value={idlePromptEnabled} onValueChange={setIdlePromptEnabled} />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving || deleting}
        />
        <Button
          title={deleting ? 'Deleting...' : 'Delete'}
          onPress={handleDelete}
          variant="danger"
          disabled={deleting || saving}
          style={styles.deleteButton}
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  contentContainer: {
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
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: theme.textPrimary,
  },
  input: {
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: theme.surface,
    borderRadius: 8,
    paddingRight: 12,
    paddingLeft: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: theme.textPrimary,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  deleteButton: {
    marginTop: 8,
  },
});
