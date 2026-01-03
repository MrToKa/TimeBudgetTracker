import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../../components/common/Button';
import { RootStackParamList, RoutineType } from '../../types';
import { createRoutine } from '../../database/repositories/routineRepository';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ROUTINE_TYPES: { type: RoutineType; label: string; icon: string; description: string }[] = [
  {
    type: 'daily',
    label: 'Daily',
    icon: 'calendar-today',
    description: 'Repeats every day',
  },
  {
    type: 'weekly',
    label: 'Weekly',
    icon: 'calendar-week',
    description: 'Repeats every week',
  },
];

export default function CreateRoutineScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState('');
  const [routineType, setRoutineType] = useState<RoutineType>('daily');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Info', 'Please enter a routine name.');
      return;
    }

    setSaving(true);
    try {
      await createRoutine({
        name: name.trim(),
        routineType,
      });
      
      Alert.alert(
        'Routine Created',
        'Your routine has been created. You can now add activities to it.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating routine:', error);
      Alert.alert('Error', 'Failed to create routine. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Routine</Text>
      <Text style={styles.subtitle}>
        Set up a routine to schedule your activities automatically.
      </Text>

      <Text style={styles.label}>Routine Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Morning Routine, Workday, Weekend"
        value={name}
        onChangeText={setName}
        autoFocus
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
            <View
              style={[
                styles.typeIcon,
                routineType === item.type && styles.typeIconSelected,
              ]}
            >
              <Icon
                name={item.icon}
                size={28}
                color={routineType === item.type ? theme.white : theme.secondary}
              />
            </View>
            <Text
              style={[
                styles.typeLabel,
                routineType === item.type && styles.typeLabelSelected,
              ]}
            >
              {item.label}
            </Text>
            <Text style={styles.typeDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Icon name="lightbulb-outline" size={20} color={theme.info} />
        <Text style={styles.infoText}>
          After creating the routine, you'll be able to add activities with scheduled times.
        </Text>
      </View>

      <Button
        title={saving ? 'Creating...' : 'Create Routine'}
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
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.border,
    padding: 16,
    alignItems: 'center',
  },
  typeCardSelected: {
    borderColor: theme.secondary,
    backgroundColor: theme.secondary + '08',
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.secondary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIconSelected: {
    backgroundColor: theme.secondary,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  typeLabelSelected: {
    color: theme.secondary,
  },
  typeDescription: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.info + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 24,
  },
});
