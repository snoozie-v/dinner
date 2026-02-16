import { useState, useEffect, useMemo } from 'react';
import type { MealPlanSettings, MealType } from '../types';
import { DEFAULT_ENABLED_MEAL_TYPES, MEAL_TYPES } from '../types';
import { STORAGE_KEYS, storage } from '../utils/storage';

export const useMealSettings = () => {
  // Field-level defaults needed for backward compat — cannot use usePersistedState
  const [mealSettings, setMealSettings] = useState<MealPlanSettings>(() => {
    const stored = storage.get<Partial<MealPlanSettings>>(STORAGE_KEYS.MEAL_SETTINGS, {});
    return {
      enabledMealTypes: stored.enabledMealTypes ?? DEFAULT_ENABLED_MEAL_TYPES,
      ingredientExclusions: stored.ingredientExclusions ?? [],
      frequencyLimits: stored.frequencyLimits ?? [],
      mealSlotThemes: stored.mealSlotThemes ?? [],
    };
  });

  useEffect(() => {
    storage.set(STORAGE_KEYS.MEAL_SETTINGS, mealSettings);
  }, [mealSettings]);

  const handleSaveMealSettings = (newSettings: MealPlanSettings): void => {
    setMealSettings(newSettings);
  };

  const sortedEnabledMealTypes = useMemo<MealType[]>(() => {
    return MEAL_TYPES
      .filter(mt => mealSettings.enabledMealTypes.includes(mt.id))
      .sort((a, b) => a.order - b.order)
      .map(mt => mt.id);
  }, [mealSettings.enabledMealTypes]);

  return { mealSettings, setMealSettings, handleSaveMealSettings, sortedEnabledMealTypes };
};
