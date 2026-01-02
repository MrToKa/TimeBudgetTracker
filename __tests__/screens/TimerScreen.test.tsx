// Timer Screen Tests

import React from 'react';

describe('TimerScreen', () => {
  it('should export default function', () => {
    const TimerScreen = require('../../src/screens/Timer/TimerScreen').default;
    expect(typeof TimerScreen).toBe('function');
  });
});
