// Card Component

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export default function Card({
  children,
  style,
  variant = 'default',
  padding = 'medium',
}: CardProps) {
  const { theme } = useTheme();

  const getCardStyle = (): ViewStyle => {
    const base: ViewStyle = {
      backgroundColor: theme.surface,
      borderRadius: 12,
    };

    // Padding
    switch (padding) {
      case 'none':
        break;
      case 'small':
        base.padding = 8;
        break;
      case 'large':
        base.padding = 20;
        break;
      default:
        base.padding = 16;
    }

    // Variant
    switch (variant) {
      case 'elevated':
        base.shadowColor = theme.black;
        base.shadowOffset = { width: 0, height: 2 };
        base.shadowOpacity = 0.1;
        base.shadowRadius = 8;
        base.elevation = 4;
        break;
      case 'outlined':
        base.borderWidth = 1;
        base.borderColor = theme.border;
        break;
      default:
        base.shadowColor = theme.black;
        base.shadowOffset = { width: 0, height: 1 };
        base.shadowOpacity = 0.05;
        base.shadowRadius = 4;
        base.elevation = 2;
    }

    return base;
  };

  return <View style={[getCardStyle(), style]}>{children}</View>;
}
