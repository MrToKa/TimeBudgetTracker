// Common Button Component

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const { theme } = useTheme();

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
    };

    // Size styles
    switch (size) {
      case 'small':
        base.paddingVertical = 8;
        base.paddingHorizontal = 16;
        break;
      case 'large':
        base.paddingVertical = 16;
        base.paddingHorizontal = 32;
        break;
      default:
        base.paddingVertical = 12;
        base.paddingHorizontal = 24;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        base.backgroundColor = theme.secondary;
        break;
      case 'outline':
        base.backgroundColor = 'transparent';
        base.borderWidth = 2;
        base.borderColor = theme.primary;
        break;
      case 'danger':
        base.backgroundColor = theme.error;
        break;
      case 'success':
        base.backgroundColor = theme.success;
        break;
      default:
        base.backgroundColor = theme.primary;
    }

    // Disabled state
    if (disabled || loading) {
      base.opacity = 0.6;
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
    };

    // Size styles
    switch (size) {
      case 'small':
        base.fontSize = 14;
        break;
      case 'large':
        base.fontSize = 18;
        break;
      default:
        base.fontSize = 16;
    }

    // Variant styles
    switch (variant) {
      case 'outline':
        base.color = theme.primary;
        break;
      default:
        base.color = theme.white;
    }

    return base;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? theme.primary : theme.white} 
          style={{ marginRight: title ? 8 : 0 }}
        />
      ) : icon ? (
        <>{icon}</>
      ) : null}
      {title ? <Text style={[getTextStyle(), textStyle]}>{title}</Text> : null}
    </TouchableOpacity>
  );
}
