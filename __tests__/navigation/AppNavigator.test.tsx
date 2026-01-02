// AppNavigator Tests

import React from 'react';

describe('AppNavigator', () => {
  it('should export default function', () => {
    const AppNavigator = require('../../src/navigation/AppNavigator').default;
    expect(typeof AppNavigator).toBe('function');
  });
});
