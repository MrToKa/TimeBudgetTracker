// Default Categories and Activities - Seeded Data

import { v4 as uuidv4 } from 'uuid';

export interface DefaultCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  activities: string[];
}

// Generate consistent IDs for default categories
export const CATEGORY_IDS = {
  DAILY_BASICS: 'cat-daily-basics',
  EDUCATION: 'cat-education',
  HEALTH: 'cat-health',
  ENTERTAINMENT: 'cat-entertainment',
  HOBBIES: 'cat-hobbies',
  TIME_WASTING: 'cat-time-wasting',
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    id: CATEGORY_IDS.DAILY_BASICS,
    name: 'Daily Basics',
    color: '#6B7280', // Gray
    icon: 'home',
    activities: [
      'Sleeping',
      'Eating',
      'Toilet',
      'Shower',
      'Shopping',
      'Commuting',
      'Chores',
    ],
  },
  {
    id: CATEGORY_IDS.EDUCATION,
    name: 'Education',
    color: '#3B82F6', // Blue
    icon: 'school',
    activities: [
      'Language learning',
      'Computer skills',
      'Reading book',
      'Dancing',
    ],
  },
  {
    id: CATEGORY_IDS.HEALTH,
    name: 'Health',
    color: '#10B981', // Green
    icon: 'fitness-center',
    activities: [
      'Exercises',
      'Gym',
      'Sauna',
      'Walking',
      'Stretching',
    ],
  },
  {
    id: CATEGORY_IDS.ENTERTAINMENT,
    name: 'Entertainment',
    color: '#8B5CF6', // Purple
    icon: 'movie',
    activities: [
      'YouTube',
      'Film',
      'Documentary',
      'Social media',
    ],
  },
  {
    id: CATEGORY_IDS.HOBBIES,
    name: 'Hobbies',
    color: '#F59E0B', // Amber
    icon: 'palette',
    activities: [
      'Fishing',
      'DIY',
      'Personal projects',
    ],
  },
  {
    id: CATEGORY_IDS.TIME_WASTING,
    name: 'Time Wasting',
    color: '#EF4444', // Red
    icon: 'warning',
    activities: [
      'Games',
      'Porn',
      'Doomscrolling',
    ],
  },
];

// Helper function to get all default activities with their category info
export function getDefaultActivitiesWithCategories() {
  const activities: { name: string; categoryId: string; categoryName: string }[] = [];
  
  for (const category of DEFAULT_CATEGORIES) {
    for (const activityName of category.activities) {
      activities.push({
        name: activityName,
        categoryId: category.id,
        categoryName: category.name,
      });
    }
  }
  
  return activities;
}

// Get category by ID
export function getDefaultCategoryById(id: string): DefaultCategory | undefined {
  return DEFAULT_CATEGORIES.find(cat => cat.id === id);
}

// Get category by name
export function getDefaultCategoryByName(name: string): DefaultCategory | undefined {
  return DEFAULT_CATEGORIES.find(cat => cat.name.toLowerCase() === name.toLowerCase());
}
