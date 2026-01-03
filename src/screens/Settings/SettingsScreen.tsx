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
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
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
  const { theme, themeMode, setThemeMode } = useTheme();
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

  const handleThemeChange = () => {
    const options: { text: string; mode: ThemeMode }[] = [
      { text: 'Light', mode: 'light' },
      { text: 'Dark', mode: 'dark' },
      { text: 'System Default', mode: 'system' },
    ];
    
    Alert.alert(
      'Choose Theme',
      'Select your preferred appearance:',
      [
        ...options.map(opt => ({
          text: opt.text + (themeMode === opt.mode ? ' ✓' : ''),
          onPress: () => setThemeMode(opt.mode),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const getThemeModeLabel = () => {
    switch (themeMode) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
    }
  };

  const renderSettingItem = (item: SettingItem) => {
    const value = settings[item.key];

    if (item.type === 'switch') {
      return (
        <View key={item.key} style={[styles.settingRow, { borderBottomColor: theme.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: theme.primary + '15' }]}>
            <Icon name={item.icon} size={22} color={theme.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
          </View>
          <Switch
            value={value as boolean}
            onValueChange={(newValue) => updateSetting(item.key, newValue)}
            trackColor={{ false: theme.border, true: theme.primaryLight }}
            thumbColor={value ? theme.primary : theme.textTertiary}
          />
        </View>
      );
    }

    if (item.type === 'number') {
      return (
        <TouchableOpacity
          key={item.key}
          style={[styles.settingRow, { borderBottomColor: theme.border }]}
          onPress={() => handleNumberSetting(item.key, value as number)}
        >
          <View style={[styles.settingIcon, { backgroundColor: theme.primary + '15' }]}>
            <Icon name={item.icon} size={22} color={theme.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: theme.textSecondary }]}>{value} min</Text>
            <Icon name="chevron-right" size={20} color={theme.textSecondary} />
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
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Settings</Text>

      {/* Appearance Section */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, backgroundColor: theme.surfaceElevated }]}>Appearance</Text>
        <TouchableOpacity style={[styles.settingRow, { borderBottomColor: theme.border }]} onPress={handleThemeChange}>
          <View style={[styles.settingIcon, { backgroundColor: theme.secondary + '15' }]}>
            <Icon name="theme-light-dark" size={22} color={theme.secondary} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: theme.textPrimary }]}>Theme</Text>
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Choose light, dark, or system theme</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: theme.textSecondary }]}>{getThemeModeLabel()}</Text>
            <Icon name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
        </TouchableOpacity>
      </Card>

      {SETTINGS_CONFIG.map((section) => (
        <Card key={section.section} style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, backgroundColor: theme.surfaceElevated }]}>{section.section}</Text>
          {section.items.map(renderSettingItem)}
        </Card>
      ))}

      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, backgroundColor: theme.surfaceElevated }]}>Data</Text>
        <TouchableOpacity style={[styles.settingRow, { borderBottomColor: theme.border }]} onPress={handleResetSettings}>
          <View style={[styles.settingIcon, { backgroundColor: theme.error + '15' }]}>
            <Icon name="refresh" size={22} color={theme.error} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: theme.error }]}>Reset to Defaults</Text>
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>Restore all settings to their original values</Text>
          </View>
          <Icon name="chevron-right" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </Card>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textTertiary }]}>Some features may require app restart</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 15,
    marginRight: 4,
  },
  footer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
