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
  ACTIVE_TAB: 'dinner-planner-active-tab',
} as const;

export function getStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}
