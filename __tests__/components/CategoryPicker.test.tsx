// CategoryPicker Component Tests

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CategoryPicker from '../../src/components/activity/CategoryPicker';
import { Category } from '../../src/types';

describe('CategoryPicker', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Work',
      color: '#3B82F6',
      icon: 'work',
      isDefault: true,
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-2',
      name: 'Health',
      color: '#10B981',
      icon: 'favorite',
      isDefault: true,
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-3',
      name: 'Personal',
      color: '#8B5CF6',
      icon: 'person',
      isDefault: true,
      displayOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    categories: mockCategories,
    selectedCategoryId: null as string | null,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all category options', () => {
    const { getByText } = render(<CategoryPicker {...defaultProps} />);

    expect(getByText('Work')).toBeTruthy();
    expect(getByText('Health')).toBeTruthy();
    expect(getByText('Personal')).toBeTruthy();
  });

  it('should call onSelect when a category is pressed', () => {
    const { getByText } = render(<CategoryPicker {...defaultProps} />);

    fireEvent.press(getByText('Work'));

    expect(defaultProps.onSelect).toHaveBeenCalledWith(mockCategories[0]);
  });

  it('should highlight selected category', () => {
    const props = {
      ...defaultProps,
      selectedCategoryId: 'cat-2',
    };

    const { getByText } = render(<CategoryPicker {...props} />);

    // Selected category should be visible
    expect(getByText('Health')).toBeTruthy();
  });

  it('should render empty when no categories provided', () => {
    const props = {
      ...defaultProps,
      categories: [],
    };

    const { queryByText } = render(<CategoryPicker {...props} />);

    expect(queryByText('Work')).toBeNull();
    expect(queryByText('Health')).toBeNull();
  });

  it('should support horizontal layout', () => {
    const props = {
      ...defaultProps,
      horizontal: true,
    };

    const { getByText } = render(<CategoryPicker {...props} />);

    // All categories should still be visible
    expect(getByText('Work')).toBeTruthy();
    expect(getByText('Health')).toBeTruthy();
    expect(getByText('Personal')).toBeTruthy();
  });

  it('should allow selecting different categories', () => {
    const { getByText, rerender } = render(<CategoryPicker {...defaultProps} />);

    // Select first category
    fireEvent.press(getByText('Work'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(mockCategories[0]);

    // Select second category
    fireEvent.press(getByText('Health'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(mockCategories[1]);
  });
});
