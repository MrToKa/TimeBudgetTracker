// Card Component Tests

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import Card from '../../src/components/common/Card';

describe('Card Component', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('renders with different variants', () => {
    const { rerender, getByText } = render(
      <Card variant="default">
        <Text>Default</Text>
      </Card>
    );
    expect(getByText('Default')).toBeTruthy();

    rerender(
      <Card variant="elevated">
        <Text>Elevated</Text>
      </Card>
    );
    expect(getByText('Elevated')).toBeTruthy();

    rerender(
      <Card variant="outlined">
        <Text>Outlined</Text>
      </Card>
    );
    expect(getByText('Outlined')).toBeTruthy();
  });

  it('renders with different padding options', () => {
    const { rerender, getByText } = render(
      <Card padding="none">
        <Text>No Padding</Text>
      </Card>
    );
    expect(getByText('No Padding')).toBeTruthy();

    rerender(
      <Card padding="small">
        <Text>Small Padding</Text>
      </Card>
    );
    expect(getByText('Small Padding')).toBeTruthy();

    rerender(
      <Card padding="large">
        <Text>Large Padding</Text>
      </Card>
    );
    expect(getByText('Large Padding')).toBeTruthy();
  });
});
