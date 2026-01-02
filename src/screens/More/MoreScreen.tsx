import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Colors from '../../constants/colors';
import { Card } from '../../components/common';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  screen?: keyof RootStackParamList;
  color: string;
  enabled: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'goals',
    title: 'Goals',
    subtitle: 'Set min/max time targets for activities',
    icon: 'flag-checkered',
    screen: 'Goals',
    color: Colors.success,
    enabled: true,
  },
  {
    id: 'routines',
    title: 'Routines & Templates',
    subtitle: 'Create daily/weekly schedules',
    icon: 'calendar-clock',
    screen: 'Routines',
    color: Colors.secondary,
    enabled: true,
  },
  {
    id: 'review',
    title: 'Review Mode',
    subtitle: 'Edit and annotate past sessions',
    icon: 'history',
    screen: 'Review',
    color: Colors.info,
    enabled: true,
  },
  {
    id: 'backup',
    title: 'Backup & Restore',
    subtitle: 'Export or import your data',
    icon: 'cloud-sync',
    screen: 'Backup',
    color: Colors.primary,
    enabled: true,
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'App preferences and notifications',
    icon: 'cog',
    screen: 'Settings',
    color: Colors.gray500,
    enabled: true,
  },
];

export default function MoreScreen() {
  const navigation = useNavigation<NavigationProp>();

  const handlePress = (item: MenuItem) => {
    if (item.enabled && item.screen) {
      navigation.navigate(item.screen as any);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>More</Text>
      
      {MENU_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.id}
          onPress={() => handlePress(item)}
          disabled={!item.enabled}
          activeOpacity={item.enabled ? 0.7 : 1}
        >
          <Card style={[styles.menuItem, !item.enabled && styles.menuItemDisabled]}>
            <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
              <Icon name={item.icon} size={24} color={item.enabled ? item.color : Colors.gray400} />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, !item.enabled && styles.menuTitleDisabled]}>
                {item.title}
              </Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            {item.enabled ? (
              <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
            ) : (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            )}
          </Card>
        </TouchableOpacity>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Time Budget Tracker v1.0.0</Text>
        <Text style={styles.footerSubtext}>Track your time, improve your life</Text>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
  },
  menuItemDisabled: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuTitleDisabled: {
    color: Colors.textSecondary,
  },
  menuSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  comingSoonBadge: {
    backgroundColor: Colors.gray200,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
  },
});
