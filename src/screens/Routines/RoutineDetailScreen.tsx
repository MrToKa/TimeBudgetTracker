import React, { useState, useCallback, useMemo } from 'react';
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
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import { Card } from '../../components/common';
import { RootStackParamList, RoutineType } from '../../types';
import {
  getRoutineWithItems,
  updateRoutine,
  deleteRoutineItem,
} from '../../database/repositories/routineRepository';
import { useRoutineExecutionStore } from '../../store/routineExecutionStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutineDetailRouteProp = RouteProp<RootStackParamList, 'RoutineDetail'>;

const ROUTINE_TYPES: { type: RoutineType; label: string; icon: string }[] = [
  { type: 'daily', label: 'Daily', icon: 'calendar-today' },
  { type: 'weekly', label: 'Weekly', icon: 'calendar-week' },
];

export default function RoutineDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutineDetailRouteProp>();
  const { routineId } = route.params;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { startRoutine } = useRoutineExecutionStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [name, setName] = useState('');
  const [routineType, setRoutineType] = useState<RoutineType>('daily');
  const [items, setItems] = useState<any[]>([]);

  const loadRoutine = useCallback(async () => {
    try {
      const routine = await getRoutineWithItems(routineId);
      if (routine) {
        setName(routine.name);
        setRoutineType(routine.routineType);
        setItems(routine.items);
      } else {
        Alert.alert('Error', 'Routine not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading routine:', error);
      Alert.alert('Error', 'Failed to load routine');
    } finally {
      setLoading(false);
    }
  }, [routineId, navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRoutine();
    }, [loadRoutine])
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Please enter a routine name.');
      return;
    }

    setSaving(true);
    try {
      await updateRoutine(routineId, {
        name: name.trim(),
        routineType,
      });
      Alert.alert('Success', 'Routine updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating routine:', error);
      Alert.alert('Error', 'Failed to update routine');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = (itemId: string, activityName: string) => {
    Alert.alert(
      'Remove Activity',
      `Remove "${activityName}" from this routine?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoutineItem(itemId);
              loadRoutine();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to remove activity');
            }
          },
        },
      ]
    );
  };

  const handleStartRoutine = async () => {
    if (items.length === 0) {
      Alert.alert('No Activities', 'Add activities to this routine before starting.');
      return;
    }

    setStarting(true);
    try {
      await startRoutine(routineId);
      // Navigate to Home tab where routine will be displayed
      navigation.navigate('MainTabs');
    } catch (error) {
      console.error('Error starting routine:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to start routine'
      );
    } finally {
      setStarting(false);
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
      <Text style={styles.title}>Edit Routine</Text>

      <Text style={styles.label}>Routine Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Morning Routine, Workday"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Routine Type</Text>
      <View style={styles.typeContainer}>
        {ROUTINE_TYPES.map((item) => (
          <TouchableOpacity
            key={item.type}
            style={[
              styles.typeCard,
              routineType === item.type && styles.typeCardSelected,
            ]}
            onPress={() => setRoutineType(item.type)}
          >
            <Icon
              name={item.icon}
              size={24}
              color={routineType === item.type ? theme.secondary : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeLabel,
                routineType === item.type && styles.typeLabelSelected,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Activities ({items.length})</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddRoutineActivity', { routineId })}
        >
          <Icon name="plus" size={20} color={theme.white} />
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="clipboard-text-outline" size={48} color={theme.gray300} />
          <Text style={styles.emptyText}>No activities in this routine yet</Text>
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.activity.name}</Text>
                {item.scheduledTime && (
                  <View style={styles.timeRow}>
                    <Icon name="clock-outline" size={14} color={theme.textSecondary} />
                    <Text style={styles.itemTime}>{item.scheduledTime}</Text>
                  </View>
                )}
                {item.expectedDurationMinutes && (
                  <Text style={styles.itemDuration}>
                    {item.expectedDurationMinutes} min
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteItem(item.id, item.activity.name)}
                style={styles.deleteButton}
              >
                <Icon name="close" size={20} color={theme.error} />
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}

      <Button
        title={starting ? 'Starting...' : 'Start Routine'}
        onPress={handleStartRoutine}
        disabled={starting || items.length === 0}
        style={styles.startButton}
      />

      <Button
        title={saving ? 'Saving...' : 'Save Changes'}
        onPress={handleSave}
        disabled={saving}
        style={styles.saveButton}
      />
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
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 8,
    marginTop: 16,
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
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.border,
    padding: 12,
  },
  typeCardSelected: {
    borderColor: theme.secondary,
    backgroundColor: theme.secondary + '08',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  typeLabelSelected: {
    color: theme.secondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  addButton: {
    backgroundColor: theme.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  itemCard: {
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  itemTime: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  itemDuration: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  startButton: {
    marginTop: 24,
    backgroundColor: theme.primary,
  },
  saveButton: {
    marginTop: 12,
  },
});
