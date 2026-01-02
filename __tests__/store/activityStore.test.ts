// Activity Store Unit Tests

import { useActivityStore } from '../../src/store/activityStore';
import * as activityRepository from '../../src/database/repositories/activityRepository';
import * as categoryRepository from '../../src/database/repositories/categoryRepository';

// Mock repositories
jest.mock('../../src/database/repositories/activityRepository');
jest.mock('../../src/database/repositories/categoryRepository');

const mockActivityRepo = activityRepository as jest.Mocked<typeof activityRepository>;
const mockCategoryRepo = categoryRepository as jest.Mocked<typeof categoryRepository>;

describe('Activity Store', () => {
  beforeEach(() => {
    useActivityStore.setState({
      activities: [],
      favorites: [],
      categories: [],
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with empty arrays', () => {
      const state = useActivityStore.getState();
      expect(state.activities).toEqual([]);
      expect(state.favorites).toEqual([]);
      expect(state.categories).toEqual([]);
    });
  });

  describe('loadCategories', () => {
    it('loads categories from database', async () => {
      mockCategoryRepo.getAllCategories.mockResolvedValue([
        {
          id: 'cat-1',
          name: 'Test Category',
          color: '#000',
          icon: 'test',
          isDefault: true,
          displayOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await useActivityStore.getState().loadCategories();

      const { categories, isLoading } = useActivityStore.getState();
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toBe('Test Category');
      expect(isLoading).toBe(false);
    });
  });

  describe('loadActivities', () => {
    it('loads activities with categories', async () => {
      mockActivityRepo.getActivitiesWithCategories.mockResolvedValue([
        {
          id: 'act-1',
          name: 'Test Activity',
          categoryId: 'cat-1',
          categoryName: 'Category',
          categoryColor: '#000',
          categoryIcon: 'icon',
          defaultExpectedMinutes: 30,
          isPlannedDefault: true,
          isFavorite: false,
          displayOrder: 0,
          idlePromptEnabled: true,
          isArchived: false,
          usageCount: 5,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await useActivityStore.getState().loadActivities();

      const { activities } = useActivityStore.getState();
      expect(activities).toHaveLength(1);
      expect(activities[0].name).toBe('Test Activity');
    });
  });

  describe('loadFavorites', () => {
    it('loads favorite activities', async () => {
      mockActivityRepo.getFavoriteActivities.mockResolvedValue([
        {
          id: 'act-1',
          name: 'Favorite Activity',
          categoryId: 'cat-1',
          categoryName: 'Category',
          categoryColor: '#000',
          categoryIcon: 'icon',
          defaultExpectedMinutes: null,
          isPlannedDefault: true,
          isFavorite: true,
          displayOrder: 0,
          idlePromptEnabled: true,
          isArchived: false,
          usageCount: 10,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      await useActivityStore.getState().loadFavorites();

      const { favorites } = useActivityStore.getState();
      expect(favorites).toHaveLength(1);
      expect(favorites[0].isFavorite).toBe(true);
    });
  });

  describe('getActivityById', () => {
    it('returns activity from state', () => {
      useActivityStore.setState({
        activities: [
          {
            id: 'act-1',
            name: 'Test',
            categoryId: 'cat-1',
            categoryName: 'Cat',
            categoryColor: '#000',
            categoryIcon: 'icon',
            defaultExpectedMinutes: null,
            isPlannedDefault: true,
            isFavorite: false,
            displayOrder: 0,
            idlePromptEnabled: true,
            isArchived: false,
            usageCount: 0,
            lastUsedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      const activity = useActivityStore.getState().getActivityById('act-1');
      expect(activity?.name).toBe('Test');
    });

    it('returns undefined for non-existent activity', () => {
      const activity = useActivityStore.getState().getActivityById('non-existent');
      expect(activity).toBeUndefined();
    });
  });

  describe('toggleFavorite', () => {
    it('toggles favorite status', async () => {
      mockActivityRepo.toggleFavorite.mockResolvedValue(true);
      mockActivityRepo.getActivitiesWithCategories.mockResolvedValue([]);
      mockActivityRepo.getFavoriteActivities.mockResolvedValue([]);

      const result = await useActivityStore.getState().toggleFavorite('act-1');

      expect(mockActivityRepo.toggleFavorite).toHaveBeenCalledWith('act-1');
      expect(result).toBe(true);
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useActivityStore.setState({ error: 'Some error' });
      useActivityStore.getState().clearError();
      expect(useActivityStore.getState().error).toBeNull();
    });
  });
});
