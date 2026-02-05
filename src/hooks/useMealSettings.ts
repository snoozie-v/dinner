import { useState, useEffect, useMemo } from 'react';
import type { MealPlanSettings, MealType } from '../types';
import { DEFAULT_ENABLED_MEAL_TYPES, MEAL_TYPES } from '../types';
import { STORAGE_KEYS, getStoredValue } from '../utils/storage';

export const useMealSettings = () => {
  const [mealSettings, setMealSettings] = useState<MealPlanSettings>(() => {
    const stored = getStoredValue<MealPlanSettings>(STORAGE_KEYS.MEAL_SETTINGS, {
      enabledMealTypes: DEFAULT_ENABLED_MEAL_TYPES,
      ingredientExclusions: [],
      frequencyLimits: [],
      mealSlotThemes: [],
    });
    return {
      enabledMealTypes: stored.enabledMealTypes ?? DEFAULT_ENABLED_MEAL_TYPES,
      ingredientExclusions: stored.ingredientExclusions ?? [],
      frequencyLimits: stored.frequencyLimits ?? [],
      mealSlotThemes: stored.mealSlotThemes ?? [],
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEAL_SETTINGS, JSON.stringify(mealSettings));
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
