/**
 * Time Budget Tracker App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';
import Colors from './src/constants/colors';
import {
  setupNotificationChannels,
  requestNotificationPermissions,
  startInactivityMonitor,
} from './src/services/notificationService';
import { useTimerStore } from './src/store/timerStore';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const { loadRunningTimers, runningTimers } = useTimerStore();

  useEffect(() => {
    // Initialize app
    const initialize = async () => {
      // Setup notification channels
      await setupNotificationChannels();
      
      // Request notification permissions
      await requestNotificationPermissions();
      
      // Load running timers
      await loadRunningTimers();
    };
    
    initialize();
  }, [loadRunningTimers]);

  // Start inactivity monitor when no timers are running
  useEffect(() => {
    if (runningTimers.length === 0) {
      startInactivityMonitor(false);
    }
  }, [runningTimers.length]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={Colors.primary} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
