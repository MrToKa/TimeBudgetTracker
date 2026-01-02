// Default Categories Constants Tests

import {
  DEFAULT_CATEGORIES,
  CATEGORY_IDS,
  getDefaultCategoryById,
  getDefaultCategoryByName,
  getDefaultActivitiesWithCategories,
} from '../../src/constants/categories';

describe('Categories Constants', () => {
  describe('DEFAULT_CATEGORIES', () => {
    it('has 6 default categories', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(6);
    });

    it('includes expected category names', () => {
      const names = DEFAULT_CATEGORIES.map((c) => c.name);
      expect(names).toContain('Daily Basics');
      expect(names).toContain('Education');
      expect(names).toContain('Health');
      expect(names).toContain('Entertainment');
      expect(names).toContain('Hobbies');
      expect(names).toContain('Time Wasting');
    });
  });

  describe('CATEGORY_IDS', () => {
    it('has correct IDs', () => {
      expect(CATEGORY_IDS.DAILY_BASICS).toBe('cat-daily-basics');
      expect(CATEGORY_IDS.EDUCATION).toBe('cat-education');
    });
  });

  describe('getDefaultCategoryById', () => {
    it('returns category for valid ID', () => {
      const cat = getDefaultCategoryById(CATEGORY_IDS.HEALTH);
      expect(cat).toBeDefined();
      expect(cat?.name).toBe('Health');
    });

    it('returns undefined for invalid ID', () => {
      expect(getDefaultCategoryById('invalid-id')).toBeUndefined();
    });
  });

  describe('getDefaultCategoryByName', () => {
    it('returns category for valid name (case insensitive)', () => {
      const cat = getDefaultCategoryByName('education');
      expect(cat).toBeDefined();
      expect(cat?.id).toBe(CATEGORY_IDS.EDUCATION);
    });

    it('returns undefined for invalid name', () => {
      expect(getDefaultCategoryByName('Unknown Category')).toBeUndefined();
    });
  });

  describe('getDefaultActivitiesWithCategories', () => {
    it('returns array of activities with category info', () => {
      const activities = getDefaultActivitiesWithCategories();
      expect(activities.length).toBeGreaterThan(0);
      expect(activities[0]).toHaveProperty('name');
      expect(activities[0]).toHaveProperty('categoryId');
      expect(activities[0]).toHaveProperty('categoryName');
    });

    it('includes expected default activities', () => {
      const activities = getDefaultActivitiesWithCategories();
      const names = activities.map((a) => a.name);
      expect(names).toContain('Sleeping');
      expect(names).toContain('YouTube');
      expect(names).toContain('Language learning');
    });
  });
});
