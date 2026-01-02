// Activity Card Component

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ActivityWithCategory } from '../../types';
import Colors from '../../constants/colors';
import { formatDuration } from '../../utils/dateUtils';

interface ActivityCardProps {
  activity: ActivityWithCategory;
  onPress: () => void;
  onStartTimer?: () => void;
  onToggleFavorite?: () => void;
  showStartButton?: boolean;
  compact?: boolean;
}

export default function ActivityCard({
  activity,
  onPress,
  onStartTimer,
  onToggleFavorite,
  showStartButton = true,
  compact = false,
}: ActivityCardProps) {
  return (
    <TouchableOpacity 
      style={[styles.container, compact && styles.containerCompact]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Category Color Indicator */}
      <View 
        style={[
          styles.colorIndicator, 
          { backgroundColor: activity.categoryColor }
        ]} 
      />
      
      {/* Activity Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
            {activity.name}
          </Text>
          
          {activity.isFavorite && (
            <Icon name="heart" size={16} color={Colors.error} style={styles.favoriteIcon} />
          )}
        </View>
        
        {!compact && (
          <>
            <Text style={styles.category} numberOfLines={1}>
              {activity.categoryName}
            </Text>
            
            {activity.defaultExpectedMinutes && (
              <Text style={styles.duration}>
                Default: {formatDuration(activity.defaultExpectedMinutes)}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {onToggleFavorite && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onToggleFavorite}
          >
            <Icon 
              name={activity.isFavorite ? 'heart' : 'heart-outline'} 
              size={24} 
              color={activity.isFavorite ? Colors.error : Colors.gray400} 
            />
          </TouchableOpacity>
        )}
        
        {showStartButton && onStartTimer && (
          <TouchableOpacity 
            style={[styles.startButton, { backgroundColor: activity.categoryColor }]}
            onPress={onStartTimer}
          >
            <Icon name="play" size={24} color={Colors.white} />
          </TouchableOpacity>
        )}
        
        <Icon name="chevron-right" size={24} color={Colors.gray300} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  containerCompact: {
    paddingVertical: 12,
  },
  colorIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  info: {
    flex: 1,
    marginLeft: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  nameCompact: {
    fontSize: 15,
  },
  favoriteIcon: {
    marginLeft: 4,
  },
  category: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  duration: {
    fontSize: 13,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  startButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
});
