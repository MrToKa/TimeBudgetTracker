// Timer Card Component - Shows a running timer

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RunningTimer } from '../../types';
import Colors from '../../constants/colors';
import { formatTimerDisplay, formatDuration } from '../../utils/dateUtils';
import Card from '../common/Card';

interface TimerCardProps {
  timer: RunningTimer;
  onStop: () => void;
  onPress?: () => void;
}

export default function TimerCard({ timer, onStop, onPress }: TimerCardProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    // Calculate initial elapsed time
    const initialElapsed = Math.floor((Date.now() - timer.startTime.getTime()) / 1000);
    setElapsedSeconds(initialElapsed);

    // Update every second
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timer.startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.startTime]);

  const isOverBudget = timer.expectedDurationMinutes 
    ? (elapsedSeconds / 60) > timer.expectedDurationMinutes 
    : false;

  return (
    <Card style={[styles.container, isOverBudget && styles.containerOverBudget]} variant="elevated">
      <TouchableOpacity 
        style={styles.content} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Category Color Bar */}
        <View 
          style={[
            styles.colorBar, 
            { backgroundColor: isOverBudget ? Colors.error : (timer.categoryColor || Colors.gray400) }
          ]} 
        />
        
        <View style={styles.info}>
          {/* Activity Name */}
          <Text style={styles.activityName} numberOfLines={1}>
            {timer.activityName}
          </Text>
          
          {/* Category Name */}
          <Text style={styles.categoryName} numberOfLines={1}>
            {timer.categoryName}
          </Text>
          
          {/* Planned/Unplanned Badge */}
          <View style={[
            styles.badge,
            { backgroundColor: timer.isPlanned ? Colors.planned : Colors.unplanned }
          ]}>
            <Text style={styles.badgeText}>
              {timer.isPlanned ? 'Planned' : 'Unplanned'}
            </Text>
          </View>
        </View>

        {/* Timer Display */}
        <View style={styles.timerSection}>
          <Text style={[
            styles.timerText,
            isOverBudget && styles.timerOverBudget
          ]}>
            {formatTimerDisplay(elapsedSeconds)}
          </Text>
          
          {timer.expectedDurationMinutes && (
            <Text style={[styles.budgetText, isOverBudget && styles.budgetOverBudget]}>
              / {formatDuration(timer.expectedDurationMinutes)}
            </Text>
          )}
          
          {/* Running/Overdue Indicator */}
          <View style={styles.runningIndicator}>
            <View style={[styles.runningDot, isOverBudget && styles.runningDotOverBudget]} />
            <Text style={[styles.runningText, isOverBudget && styles.runningTextOverBudget]}>
              {isOverBudget ? 'Overdue!' : 'Running'}
            </Text>
          </View>
        </View>

        {/* Stop Button */}
        <TouchableOpacity 
          style={styles.stopButton}
          onPress={onStop}
        >
          <Icon name="close-circle" size={28} color={Colors.white} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 0,
    overflow: 'hidden',
  },
  containerOverBudget: {
    backgroundColor: '#FEE2E2', // Light red background
    borderColor: Colors.error,
    borderWidth: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  colorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  info: {
    flex: 1,
    marginLeft: 8,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.white,
  },
  timerSection: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.timerRunning,
    fontVariant: ['tabular-nums'],
  },
  timerOverBudget: {
    color: Colors.error,
  },
  budgetText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  budgetOverBudget: {
    color: Colors.error,
    fontWeight: '600',
  },
  runningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  runningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.timerRunning,
    marginRight: 4,
  },
  runningDotOverBudget: {
    backgroundColor: Colors.error,
  },
  runningText: {
    fontSize: 12,
    color: Colors.timerRunning,
    fontWeight: '500',
  },
  runningTextOverBudget: {
    color: Colors.error,
    fontWeight: '700',
  },
  stopButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
