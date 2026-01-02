// Goal Repository Tests - Module Export Verification

describe('goalRepository', () => {
  it('should export required functions', () => {
    const goalRepository = require('../../src/database/repositories/goalRepository');
    
    expect(typeof goalRepository.getAllGoals).toBe('function');
    expect(typeof goalRepository.getGoalById).toBe('function');
    expect(typeof goalRepository.createGoal).toBe('function');
    expect(typeof goalRepository.updateGoal).toBe('function');
    expect(typeof goalRepository.deleteGoal).toBe('function');
    expect(typeof goalRepository.toggleGoalActive).toBe('function');
  });
});
