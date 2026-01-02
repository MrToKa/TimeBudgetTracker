// Dashboard Screen Tests

import React from 'react';

describe('DashboardScreen', () => {
  it('should export default function', () => {
    const DashboardScreen = require('../../src/screens/Dashboard/DashboardScreen').default;
    expect(typeof DashboardScreen).toBe('function');
  });
});
