// App Color Palette

export const Colors = {
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

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray scale
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Background colors
  background: '#F9FAFB',
  backgroundDark: '#1F2937',
  surface: '#FFFFFF',
  surfaceDark: '#374151',

  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#F9FAFB',

  // Border colors
  border: '#E5E7EB',
  borderDark: '#374151',

  // Category colors (for reference)
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
};

// Dark mode colors (for future implementation)
export const DarkColors = {
  ...Colors,
  background: '#111827',
  surface: '#1F2937',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  border: '#374151',
};

export default Colors;
