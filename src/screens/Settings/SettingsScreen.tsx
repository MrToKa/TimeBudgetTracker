import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/colors';
import { Card } from '../../components/common';
import { AppSettings, DEFAULT_SETTINGS } from '../../types';
import { getSetting, setSetting, getAllSettings } from '../../database/repositories/settingsRepository';

interface SettingItem {
  key: keyof AppSettings;
  title: string;
  subtitle: string;
  icon: string;
  type: 'switch' | 'number' | 'time';
}

const SETTINGS_CONFIG: { section: string; items: SettingItem[] }[] = [
  {
    section: 'Idle Detection',
    items: [
      {
        key: 'defaultIdlePromptEnabled',
        title: 'Idle Detection',
        subtitle: 'Prompt to stop timers when device is idle',
        icon: 'sleep',
        type: 'switch',
      },
      {
        key: 'idleThresholdMinutes',
        title: 'Idle Threshold',
        subtitle: 'Minutes before showing idle prompt',
        icon: 'timer-sand',
        type: 'number',
      },
    ],
  },
  {
    section: 'Notifications',
    items: [
      {
        key: 'notificationsEnabled',
        title: 'Enable Notifications',
        subtitle: 'Allow app to send notifications',
        icon: 'bell',
        type: 'switch',
      },
      {
        key: 'reminderRoutineStart',
        title: 'Routine Reminders',
        subtitle: 'Remind when scheduled routines start',
        icon: 'calendar-clock',
        type: 'switch',
      },
      {
        key: 'reminderReviewMode',
        title: 'Daily Review Reminder',
        subtitle: 'Remind to review your day',
        icon: 'history',
        type: 'switch',
      },
      {
        key: 'reminderLongSession',
        title: 'Long Session Warning',
        subtitle: 'Alert when a session exceeds threshold',
        icon: 'alert-circle',
        type: 'switch',
      },
      {
        key: 'longSessionThresholdMinutes',
        title: 'Long Session Threshold',
        subtitle: 'Minutes before long session alert',
        icon: 'timer',
        type: 'number',
      },
    ],
  },
  {
    section: 'Focus Mode',
    items: [
      {
        key: 'focusModeEnabled',
        title: 'Focus Mode',
        subtitle: 'Single-task mode with distraction blocking',
        icon: 'target',
        type: 'switch',
      },
    ],
  },
];

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const allSettings = await getAllSettings();
      const loaded: Record<string, boolean | number | string | null> = {};
      
      for (const [key, value] of Object.entries(allSettings)) {
        if (key in DEFAULT_SETTINGS) {
          const defaultValue = DEFAULT_SETTINGS[key as keyof AppSettings];
          if (typeof defaultValue === 'boolean') {
            loaded[key] = value === 'true' || value === '1';
          } else if (typeof defaultValue === 'number') {
            loaded[key] = parseInt(value, 10) || defaultValue;
          } else {
            loaded[key] = value;
          }
        }
      }
      
      setSettings({ ...DEFAULT_SETTINGS, ...(loaded as Partial<AppSettings>) });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    try {
      await setSetting(key, String(value));
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Error saving setting:', error);
      Alert.alert('Error', 'Failed to save setting');
    }
  };

  const handleNumberSetting = (key: keyof AppSettings, currentValue: number) => {
    // For Android, we'll use a simple Alert with preset options
    const options = key === 'idleThresholdMinutes' 
      ? [5, 10, 15, 30, 60]
      : [30, 60, 90, 120, 180];
    
    Alert.alert(
      'Select Value',
      'Choose the number of minutes:',
      [
        ...options.map(mins => ({
          text: `${mins} minutes`,
          onPress: () => updateSetting(key, mins),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const renderSettingItem = (item: SettingItem) => {
    const value = settings[item.key];

    if (item.type === 'switch') {
      return (
        <View key={item.key} style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Icon name={item.icon} size={22} color={Colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          </View>
          <Switch
            value={value as boolean}
            onValueChange={(newValue) => updateSetting(item.key, newValue)}
            trackColor={{ false: Colors.gray300, true: Colors.primaryLight }}
            thumbColor={value ? Colors.primary : Colors.gray400}
          />
        </View>
      );
    }

    if (item.type === 'number') {
      return (
        <TouchableOpacity
          key={item.key}
          style={styles.settingRow}
          onPress={() => handleNumberSetting(item.key, value as number)}
        >
          <View style={styles.settingIcon}>
            <Icon name={item.icon} size={22} color={Colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{value} min</Text>
            <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
          </View>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
                await setSetting(key, String(value));
              }
              setSettings(DEFAULT_SETTINGS);
              Alert.alert('Success', 'Settings have been reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Settings</Text>

      {SETTINGS_CONFIG.map((section) => (
        <Card key={section.section} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.section}</Text>
          {section.items.map(renderSettingItem)}
        </Card>
      ))}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <TouchableOpacity style={styles.settingRow} onPress={handleResetSettings}>
          <View style={[styles.settingIcon, { backgroundColor: Colors.error + '15' }]}>
            <Icon name="refresh" size={22} color={Colors.error} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: Colors.error }]}>Reset to Defaults</Text>
            <Text style={styles.settingSubtitle}>Restore all settings to their original values</Text>
          </View>
          <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Some features may require app restart</Text>
      </View>
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
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.gray50,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  footer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
