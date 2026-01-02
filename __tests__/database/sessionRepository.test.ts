// Session Repository Tests - Module Export Verification

describe('sessionRepository', () => {
  it('should export required functions', () => {
    const sessionRepository = require('../../src/database/repositories/sessionRepository');
    
    expect(typeof sessionRepository.getSessionById).toBe('function');
    expect(typeof sessionRepository.createSession).toBe('function');
    expect(typeof sessionRepository.updateSession).toBe('function');
    expect(typeof sessionRepository.deleteSession).toBe('function');
    expect(typeof sessionRepository.getSessionsForDay).toBe('function');
    expect(typeof sessionRepository.getSessionsInRange).toBe('function');
    expect(typeof sessionRepository.getRecentSessions).toBe('function');
  });
});
