/**
 * Time Budget Tracker App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import {
  setupNotificationChannels,
  requestNotificationPermissions,
  startInactivityMonitor,
  stopInactivityMonitor,
} from './src/services/notificationService';
import { useTimerStore } from './src/store/timerStore';
import { getSetting } from './src/database/repositories/settingsRepository';

function AppContent() {
  const { theme } = useTheme();
  const { loadRunningTimers, runningTimers } = useTimerStore();
  const [noTimerReminderEnabled, setNoTimerReminderEnabled] = useState(true);
  const [noTimerReminderMinutes, setNoTimerReminderMinutes] = useState(5);

  useEffect(() => {
    // Initialize app
    const initialize = async () => {
      // Setup notification channels
      await setupNotificationChannels();
      
      // Request notification permissions
      await requestNotificationPermissions();
      
      // Load running timers
      await loadRunningTimers();
      
      // Load no timer reminder settings
      try {
        const enabledSetting = await getSetting('noTimerReminderEnabled');
        const minutesSetting = await getSetting('noTimerReminderMinutes');
        
        if (enabledSetting !== null) {
          setNoTimerReminderEnabled(enabledSetting === 'true' || enabledSetting === '1');
        }
        if (minutesSetting !== null) {
          setNoTimerReminderMinutes(parseInt(minutesSetting, 10) || 5);
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    };
    
    initialize();
  }, [loadRunningTimers]);

  // Start/stop inactivity monitor based on timers and settings
  useEffect(() => {
    if (runningTimers.length === 0 && noTimerReminderEnabled) {
      startInactivityMonitor(false, noTimerReminderMinutes);
    } else {
      stopInactivityMonitor();
    }
  }, [runningTimers.length, noTimerReminderEnabled, noTimerReminderMinutes]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.primary} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
