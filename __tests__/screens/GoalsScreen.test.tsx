// Goals Screen Tests

import React from 'react';

describe('GoalsScreen', () => {
  it('should export default function', () => {
    const GoalsScreen = require('../../src/screens/Goals/GoalsScreen').default;
    expect(typeof GoalsScreen).toBe('function');
  });
});
