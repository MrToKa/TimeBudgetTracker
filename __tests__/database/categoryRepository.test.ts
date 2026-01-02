// Category Repository Tests - Module Export Verification

describe('categoryRepository', () => {
  it('should export required functions', () => {
    const categoryRepository = require('../../src/database/repositories/categoryRepository');
    
    expect(typeof categoryRepository.getAllCategories).toBe('function');
    expect(typeof categoryRepository.getCategoryById).toBe('function');
    expect(typeof categoryRepository.createCategory).toBe('function');
    expect(typeof categoryRepository.updateCategory).toBe('function');
    expect(typeof categoryRepository.deleteCategory).toBe('function');
  });
});
