// Theme Context - Manages light/dark mode

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from '../database/repositories/settingsRepository';

export type ThemeMode = 'light' | 'dark' | 'system';

// Light theme colors - pleasant to the eyes
export const LightTheme = {
  // Primary colors
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',

  // Secondary colors
  secondary: '#8B5CF6',
  secondaryDark: '#7C3AED',
  secondaryLight: '#A78BFA',

  // Status colors
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  error: '#EF4444',
  errorLight: '#F87171',
  info: '#06B6D4',
  infoLight: '#22D3EE',

  // Core colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray scale
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  
  // Background & Surface
  background: '#F8FAFC',
  surface: '#F1F5F9',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardBackground: '#FFFFFF',

  // Text colors
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textDisabled: '#CBD5E1',

  // Border colors
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',

  // Input colors
  inputBackground: '#FFFFFF',
  inputBorder: '#CBD5E1',
  inputPlaceholder: '#94A3B8',

  // Interactive states
  ripple: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Category colors
  categoryDailyBasics: '#6B7280',
  categoryEducation: '#3B82F6',
  categoryHealth: '#10B981',
  categoryEntertainment: '#8B5CF6',
  categoryHobbies: '#F59E0B',
  categoryTimeWasting: '#EF4444',

  // Timer states
  timerRunning: '#10B981',
  timerPaused: '#F59E0B',
  timerStopped: '#6B7280',

  // Planned vs Unplanned
  planned: '#3B82F6',
  unplanned: '#F97316',

  // Goal status
  goalMet: '#10B981',
  goalExceeded: '#EF4444',
  goalBelow: '#F59E0B',

  // Icon colors
  iconPrimary: '#1E293B',
  iconSecondary: '#64748B',
  iconDisabled: '#CBD5E1',

  // Tab bar
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabBarActive: '#3B82F6',
  tabBarInactive: '#94A3B8',

  // Status bar
  statusBarStyle: 'dark-content' as 'dark-content' | 'light-content',
};

// Dark theme colors - easy on the eyes with OLED-friendly dark grays
export const DarkTheme = {
  // Primary colors - slightly muted for dark mode
  primary: '#60A5FA',
  primaryDark: '#3B82F6',
  primaryLight: '#93C5FD',

  // Secondary colors
  secondary: '#A78BFA',
  secondaryDark: '#8B5CF6',
  secondaryLight: '#C4B5FD',

  // Status colors - slightly brighter for dark mode
  success: '#34D399',
  successLight: '#6EE7B7',
  warning: '#FBBF24',
  warningLight: '#FCD34D',
  error: '#F87171',
  errorLight: '#FCA5A5',
  info: '#22D3EE',
  infoLight: '#67E8F9',

  // Core colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray scale - inverted for dark mode
  gray50: '#1E293B',
  gray100: '#334155',
  gray200: '#475569',
  gray300: '#64748B',
  gray400: '#94A3B8',
  gray500: '#CBD5E1',
  
  // Background & Surface - OLED-friendly with subtle elevation
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  card: '#1E293B',
  cardBackground: '#1E293B',

  // Text colors - warm whites to reduce eye strain
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textOnPrimary: '#FFFFFF',
  textDisabled: '#475569',

  // Border colors
  border: '#334155',
  borderLight: '#1E293B',
  divider: '#334155',

  // Input colors
  inputBackground: '#1E293B',
  inputBorder: '#475569',
  inputPlaceholder: '#CBD5E1',

  // Interactive states
  ripple: 'rgba(255, 255, 255, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Category colors - same as light for consistency
  categoryDailyBasics: '#9CA3AF',
  categoryEducation: '#60A5FA',
  categoryHealth: '#34D399',
  categoryEntertainment: '#A78BFA',
  categoryHobbies: '#FBBF24',
  categoryTimeWasting: '#F87171',

  // Timer states
  timerRunning: '#34D399',
  timerPaused: '#FBBF24',
  timerStopped: '#9CA3AF',

  // Planned vs Unplanned
  planned: '#60A5FA',
  unplanned: '#FB923C',

  // Goal status
  goalMet: '#34D399',
  goalExceeded: '#F87171',
  goalBelow: '#FBBF24',

  // Icon colors
  iconPrimary: '#F1F5F9',
  iconSecondary: '#94A3B8',
  iconDisabled: '#475569',

  // Tab bar
  tabBarBackground: '#1E293B',
  tabBarBorder: '#334155',
  tabBarActive: '#60A5FA',
  tabBarInactive: '#64748B',

  // Status bar
  statusBarStyle: 'light-content' as 'dark-content' | 'light-content',
};

export type Theme = typeof LightTheme;

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await getSetting('themeMode');
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeModeState(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.warn('Error loading theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await setSetting('themeMode', mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Determine actual theme based on mode
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  const theme = isDark ? DarkTheme : LightTheme;

  // Don't render until theme is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, isDark, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Backward compatibility - returns current theme colors
export function useColors(): Theme {
  const { theme } = useTheme();
  return theme;
}
