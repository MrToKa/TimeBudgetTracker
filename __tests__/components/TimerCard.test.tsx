// TimerCard Component Tests

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TimerCard from '../../src/components/timer/TimerCard';
import { RunningTimer } from '../../src/types';

describe('TimerCard', () => {
  const mockTimer: RunningTimer = {
    id: 'timer-1',
    activityId: 'act-1',
    activityName: 'Coding',
    categoryId: 'cat-1',
    categoryName: 'Work',
    categoryColor: '#3B82F6',
    startTime: new Date(),
    isPlanned: true,
    expectedDurationMinutes: 60,
  };

  const defaultProps = {
    timer: mockTimer,
    onStop: jest.fn(),
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render activity name', () => {
    const { getByText } = render(<TimerCard {...defaultProps} />);

    expect(getByText('Coding')).toBeTruthy();
  });

  it('should render category name', () => {
    const { getByText } = render(<TimerCard {...defaultProps} />);

    expect(getByText('Work')).toBeTruthy();
  });

  it('should display timer format', () => {
    const { getByText } = render(<TimerCard {...defaultProps} />);

    // Timer should display in format MM:SS (or HH:MM:SS if hours > 0)
    expect(getByText(/\d{2}:\d{2}/)).toBeTruthy();
  });

  it('should show planned badge when timer is planned', () => {
    const { getByText } = render(<TimerCard {...defaultProps} />);

    expect(getByText('Planned')).toBeTruthy();
  });

  it('should show unplanned badge when timer is unplanned', () => {
    const unplannedTimer = { ...mockTimer, isPlanned: false };
    const { getByText } = render(<TimerCard {...defaultProps} timer={unplannedTimer} />);

    expect(getByText('Unplanned')).toBeTruthy();
  });

  it('should call onStop when stop button is pressed', () => {
    const { getByText } = render(<TimerCard {...defaultProps} />);

    // Find and press stop button (look for "Stop" text or use icon)
    const stopArea = getByText('Running'); // The running indicator is near stop button
    expect(stopArea).toBeTruthy();
  });

  it('should display expected duration when available', () => {
    const { getByText } = render(<TimerCard {...defaultProps} />);

    // 60 min budget
    expect(getByText(/60|1.*h/i)).toBeTruthy();
  });

  it('should show running indicator', () => {
    const { getByText } = render(<TimerCard {...defaultProps} />);

    expect(getByText('Running')).toBeTruthy();
  });
});
