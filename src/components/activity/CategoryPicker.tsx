// Category Picker Component

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Category } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface CategoryPickerProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (category: Category) => void;
  horizontal?: boolean;
}

export default function CategoryPicker({
  categories,
  selectedCategoryId,
  onSelect,
  horizontal = false,
}: CategoryPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (horizontal) {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.horizontalItem,
              { borderColor: category.color },
              selectedCategoryId === category.id && { backgroundColor: category.color },
            ]}
            onPress={() => onSelect(category)}
          >
            <Icon 
              name={category.icon || 'category'} 
              size={20} 
              color={selectedCategoryId === category.id ? theme.white : category.color} 
            />
            <Text 
              style={[
                styles.horizontalItemText,
                { color: selectedCategoryId === category.id ? theme.white : theme.textPrimary },
              ]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {categories.map(category => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.item,
            selectedCategoryId === category.id && styles.itemSelected,
          ]}
          onPress={() => onSelect(category)}
        >
          <View style={[styles.colorDot, { backgroundColor: category.color }]} />
          <Icon 
            name={category.icon || 'category'} 
            size={24} 
            color={category.color}
            style={styles.icon}
          />
          <Text style={styles.itemText}>{category.name}</Text>
          {selectedCategoryId === category.id && (
            <Icon name="check" size={24} color={theme.primary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  itemSelected: {
    backgroundColor: theme.surface,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  icon: {
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 16,
    color: theme.textPrimary,
  },
  horizontalContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  horizontalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
  },
  horizontalItemText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});
