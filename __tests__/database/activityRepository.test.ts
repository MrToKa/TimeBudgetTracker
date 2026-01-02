// Activity Repository Tests - Module Export Verification

describe('activityRepository', () => {
  it('should export required functions', () => {
    const activityRepository = require('../../src/database/repositories/activityRepository');
    
    expect(typeof activityRepository.getAllActivities).toBe('function');
    expect(typeof activityRepository.getActivityById).toBe('function');
    expect(typeof activityRepository.createActivity).toBe('function');
    expect(typeof activityRepository.updateActivity).toBe('function');
    expect(typeof activityRepository.deleteActivity).toBe('function');
    expect(typeof activityRepository.getActivitiesByCategory).toBe('function');
  });
});
