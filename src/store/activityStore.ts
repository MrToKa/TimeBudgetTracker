// Activity Store - Zustand state management for activities

import { create } from 'zustand';
import { Activity, ActivityWithCategory, Category, CreateActivityInput, UpdateActivityInput } from '../types';
import * as activityRepository from '../database/repositories/activityRepository';
import * as categoryRepository from '../database/repositories/categoryRepository';

interface ActivityState {
  // State
  activities: ActivityWithCategory[];
  favorites: ActivityWithCategory[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadActivities: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadFavorites: () => Promise<void>;
  getActivityById: (id: string) => ActivityWithCategory | undefined;
  createActivity: (input: CreateActivityInput) => Promise<Activity>;
  updateActivity: (id: string, updates: UpdateActivityInput) => Promise<Activity | null>;
  archiveActivity: (id: string) => Promise<boolean>;
  unarchiveActivity: (id: string) => Promise<boolean>;
  toggleFavorite: (id: string) => Promise<boolean>;
  deleteActivity: (id: string) => Promise<boolean>;
  searchActivities: (query: string) => Promise<ActivityWithCategory[]>;
  getSmartOrderedActivities: () => Promise<ActivityWithCategory[]>;
  clearError: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: [],
  favorites: [],
  categories: [],
  isLoading: false,
  error: null,

  loadActivities: async () => {
    set({ isLoading: true, error: null });
    try {
      const activities = await activityRepository.getActivitiesWithCategories();
      set({ activities, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await categoryRepository.getAllCategories();
      set({ categories, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadFavorites: async () => {
    set({ error: null });
    try {
      const favorites = await activityRepository.getFavoriteActivities();
      set({ favorites });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  getActivityById: (id) => {
    const { activities } = get();
    return activities.find(a => a.id === id);
  },

  createActivity: async (input) => {
    set({ error: null });
    try {
      const activity = await activityRepository.createActivity(input);
      
      // Reload activities to get updated list with category info
      await get().loadActivities();
      
      return activity;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateActivity: async (id, updates) => {
    set({ error: null });
    try {
      const activity = await activityRepository.updateActivity(id, updates);
      
      if (activity) {
        // Reload activities to get updated list
        await get().loadActivities();
        await get().loadFavorites();
      }
      
      return activity;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  archiveActivity: async (id) => {
    set({ error: null });
    try {
      const result = await activityRepository.archiveActivity(id);
      
      if (result) {
        await get().loadActivities();
        await get().loadFavorites();
      }
      
      return result;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  unarchiveActivity: async (id) => {
    set({ error: null });
    try {
      const result = await activityRepository.unarchiveActivity(id);
      
      if (result) {
        await get().loadActivities();
      }
      
      return result;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  toggleFavorite: async (id) => {
    set({ error: null });
    try {
      const isFavorite = await activityRepository.toggleFavorite(id);
      
      // Reload both activities and favorites
      await get().loadActivities();
      await get().loadFavorites();
      
      return isFavorite;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteActivity: async (id) => {
    set({ error: null });
    try {
      const deleted = await activityRepository.deleteActivity(id);

      if (deleted) {
        await get().loadActivities();
        await get().loadFavorites();
      }

      return deleted;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  searchActivities: async (query) => {
    try {
      return await activityRepository.searchActivities(query);
    } catch (error) {
      set({ error: (error as Error).message });
      return [];
    }
  },

  getSmartOrderedActivities: async () => {
    try {
      return await activityRepository.getSmartOrderedActivities();
    } catch (error) {
      set({ error: (error as Error).message });
      return [];
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
