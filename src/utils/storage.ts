export const STORAGE_KEYS = {
  DAYS: 'dinner-planner-days',
  PLAN: 'dinner-planner-plan',
  SHOPPING_ADJUSTMENTS: 'dinner-planner-shopping-adjustments',
  PANTRY_STAPLES: 'dinner-planner-pantry-staples',
  TEMPLATES: 'dinner-planner-templates',
  USER_PREFS: 'dinner-planner-user-prefs',
  MEAL_SETTINGS: 'dinner-planner-meal-settings',
  DATA_VERSION: 'dinner-planner-data-version',
  THEME: 'dinner-planner-theme',
  ONBOARDING_SEEN: 'dinner-planner-onboarding-seen',
  CUSTOM_RECIPES: 'dinner-planner-custom-recipes',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const storage = {
  get<T>(key: StorageKey, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return JSON.parse(stored) as T;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: StorageKey, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage quota exceeded or unavailable
    }
  },

  remove(key: StorageKey): void {
    localStorage.removeItem(key);
  },

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },
};
