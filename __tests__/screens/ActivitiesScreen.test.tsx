// Activities Screen Tests

import React from 'react';

describe('ActivitiesScreen', () => {
  it('should export default function', () => {
    const ActivitiesScreen = require('../../src/screens/Activities/ActivitiesScreen').default;
    expect(typeof ActivitiesScreen).toBe('function');
  });
});
