import { useState, useMemo, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { Recipe, PlanItem, MealType } from '../types';
import { MEAL_TYPES } from '../types';
import type { UndoAction } from '../components/UndoToast';
import { STORAGE_KEYS } from '../utils/storage';
import { usePersistedState } from './usePersistedState';

interface UseMealPlanParams {
  allRecipes: Recipe[];
  sortedEnabledMealTypes: MealType[];
  addToRecent: (recipeId: string) => void;
  setUndoAction: (action: UndoAction | null) => void;
  incrementTimesUsed?: (recipeId: string) => void;
}

export const useMealPlan = ({
  allRecipes,
  sortedEnabledMealTypes,
  addToRecent,
  setUndoAction,
  incrementTimesUsed,
}: UseMealPlanParams) => {
  const [days, setDays] = usePersistedState<number>(STORAGE_KEYS.DAYS, 3);
  const [plan, setPlan] = usePersistedState<PlanItem[]>(STORAGE_KEYS.PLAN, []);
  const [planStartDate, setPlanStartDate] = usePersistedState<string | null>(STORAGE_KEYS.PLAN_START_DATE, null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDayForPicker, setSelectedDayForPicker] = useState<number | null>(null);
  const [selectedMealTypeForPicker, setSelectedMealTypeForPicker] = useState<MealType | null>(null);

  // Filter recipes by search term
  const filteredRecipes = useMemo<Recipe[]>(() => {
    if (!searchTerm.trim()) return allRecipes;

    const term = searchTerm.toLowerCase().trim();
    return allRecipes.filter((recipe) => {
      if (recipe.name?.toLowerCase().includes(term)) return true;
      if (recipe.description?.toLowerCase().includes(term)) return true;
      if (recipe.author?.toLowerCase().includes(term)) return true;
      if (recipe.cuisine?.toLowerCase().includes(term)) return true;
      if (recipe.difficulty?.toLowerCase().includes(term)) return true;
      if (recipe.tags?.some(tag => tag.toLowerCase().includes(term))) return true;
      if (recipe.mealTypes?.some(type => type.toLowerCase().includes(term))) return true;
      if (recipe.dietary?.some(diet => diet.toLowerCase().includes(term))) return true;
      if (recipe.allergiesToAvoid?.some(allergen => allergen.toLowerCase().includes(term))) return true;
      if (recipe.equipment?.some(equip => equip.toLowerCase().includes(term))) return true;
      if (recipe.ingredients?.some(ing => ing?.name?.toLowerCase().includes(term))) return true;
      return false;
    });
  }, [searchTerm, allRecipes]);

  // Helper to get recipes that match a meal type
  const getRecipesForMealType = (mealType: MealType): Recipe[] => {
    const matchingRecipes = allRecipes.filter(recipe =>
      recipe.mealTypes?.some(mt => mt.toLowerCase() === mealType.toLowerCase())
    );
    return matchingRecipes.length > 0 ? matchingRecipes : allRecipes;
  };

  /**
   * Weighted reservoir sampling: pick the top-N recipes by score.
   * Score = Math.random() ** (1 / weight). Higher weight → higher score on average.
   */
  const weightedSample = (recipes: Recipe[], n: number, weights: Map<string, number>): Recipe[] => {
    const scored = recipes.map(r => ({
      recipe: r,
      score: Math.random() ** (1 / Math.max(0.001, weights.get(r.id) ?? 1)),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, n).map(s => s.recipe);
  };

  const generateRandomPlan = (): void => {
    const newPlan: PlanItem[] = [];
    const numDays = days || 7;
    const now = Date.now();

    // Build recency info from existing plan's cookedAt timestamps
    const recencyMap = new Map<string, number>(); // recipeId → most recent cookedAt ms
    for (const item of plan) {
      if (item.recipe?.id && item.cookedAt) {
        const ts = new Date(item.cookedAt).getTime();
        const existing = recencyMap.get(item.recipe.id);
        if (existing === undefined || ts > existing) {
          recencyMap.set(item.recipe.id, ts);
        }
      }
    }

    // Track recipes already placed in this new plan (no repeats)
    const placedIds = new Set<string>();

    for (const mealType of sortedEnabledMealTypes) {
      const recipesForMeal = getRecipesForMealType(mealType);
      const numNeeded = numDays;

      // Build weight map for this meal type's recipes
      const weights = new Map<string, number>();
      for (const r of recipesForMeal) {
        const cookedAt = recencyMap.get(r.id);
        const ageDays = cookedAt ? (now - cookedAt) / (1000 * 60 * 60 * 24) : Infinity;

        // Recency penalty
        let w = 1.0;
        if (ageDays < 7) w = 0; // exclude
        else if (ageDays < 14) w = 0.1;

        // Rating boost
        if (r.rating != null) {
          if (r.rating >= 4) w *= 2.0;
          else if (r.rating <= 2) w *= 0.3;
        }

        weights.set(r.id, w);
      }

      // Filter out excluded recipes and already-placed ones
      const eligible = recipesForMeal.filter(r => (weights.get(r.id) ?? 0) > 0 && !placedIds.has(r.id));
      // Fallback to all if not enough eligible
      const pool = eligible.length >= numNeeded ? eligible : recipesForMeal.filter(r => !placedIds.has(r.id));
      // Final fallback: use all if still not enough
      const finalPool = pool.length > 0 ? pool : recipesForMeal;

      const selected = weightedSample(finalPool, numNeeded, weights);

      for (let i = 0; i < numDays; i++) {
        const recipe = selected[i % selected.length];
        placedIds.add(recipe.id);
        newPlan.push({
          day: i + 1,
          mealType,
          id: `day-${i + 1}-${mealType}-${recipe.id || Math.random().toString(36).slice(2)}`,
          recipe: { ...recipe },
          servingsMultiplier: 1,
        });
      }
    }

    // Sort by day then meal type order
    newPlan.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      const aOrder = MEAL_TYPES.find(mt => mt.id === a.mealType)?.order ?? 99;
      const bOrder = MEAL_TYPES.find(mt => mt.id === b.mealType)?.order ?? 99;
      return aOrder - bOrder;
    });

    setPlan(newPlan);
    setSearchTerm('');
    setSelectedDayForPicker(null);
    setSelectedMealTypeForPicker(null);
  };

  const assignRecipeToSlot = (day: number, mealType: MealType, newRecipe: Recipe | null): void => {
    if (newRecipe?.id) {
      addToRecent(newRecipe.id);
    }

    setPlan((prevPlan) => {
      const updated = prevPlan.map((item) => ({ ...item }));
      const existingIndex = updated.findIndex((p) => p.day === day && p.mealType === mealType);
      const recipeCopy = newRecipe ? { ...newRecipe } : null;

      if (existingIndex !== -1) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          recipe: recipeCopy,
          id: `day-${day}-${mealType}-${newRecipe?.id || 'empty'}`,
        };
      } else {
        updated.push({
          day,
          mealType,
          id: `day-${day}-${mealType}-${newRecipe?.id || 'empty'}`,
          recipe: recipeCopy,
          servingsMultiplier: 1,
        });
      }

      return updated;
    });

    setSelectedDayForPicker(null);
    setSelectedMealTypeForPicker(null);
  };

  const assignRecipeToDay = (dayIndex: number, newRecipe: Recipe | null): void => {
    assignRecipeToSlot(dayIndex + 1, 'dinner', newRecipe);
  };

  const updateServings = (planItemId: string, multiplier: number): void => {
    setPlan((prev) =>
      prev.map((item) =>
        item.id === planItemId ? { ...item, servingsMultiplier: multiplier } : item
      )
    );
  };

  const updateNotes = (planItemId: string, notes: string): void => {
    setPlan((prev) =>
      prev.map((item) =>
        item.id === planItemId ? { ...item, notes } : item
      )
    );
  };

  // Adjust plan when days or enabled meal types change
  useEffect(() => {
    setPlan((prevPlan) => {
      let updated = [...prevPlan];

      updated = updated.filter((p) => p.day <= days);
      updated = updated.filter((p) => sortedEnabledMealTypes.includes(p.mealType));

      for (let day = 1; day <= days; day++) {
        for (const mealType of sortedEnabledMealTypes) {
          const exists = updated.some(p => p.day === day && p.mealType === mealType);
          if (!exists) {
            updated.push({
              day,
              mealType,
              id: `day-${day}-${mealType}-empty`,
              recipe: null,
              servingsMultiplier: 1,
            });
          }
        }
      }

      return updated.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        const aOrder = MEAL_TYPES.find(mt => mt.id === a.mealType)?.order ?? 99;
        const bOrder = MEAL_TYPES.find(mt => mt.id === b.mealType)?.order ?? 99;
        return aOrder - bOrder;
      });
    });
  }, [days, sortedEnabledMealTypes]);

  const removeMealPlanRecipe = (day: number, mealType: MealType): void => {
    const planItem = plan.find(p => p.day === day && p.mealType === mealType);
    if (!planItem?.recipe) return;

    const removedRecipe = planItem.recipe;
    const removedMultiplier = planItem.servingsMultiplier;
    const removedNotes = planItem.notes;

    assignRecipeToSlot(day, mealType, null);

    const mealTypeConfig = MEAL_TYPES.find(mt => mt.id === mealType);
    const mealLabel = mealTypeConfig?.label || mealType;

    setUndoAction({
      id: `plan-${Date.now()}`,
      message: `Removed "${removedRecipe.name}" from Day ${day} ${mealLabel}`,
      onUndo: () => {
        setPlan(prev => prev.map(item => {
          if (item.day === day && item.mealType === mealType) {
            return {
              ...item,
              recipe: removedRecipe,
              servingsMultiplier: removedMultiplier,
              notes: removedNotes,
              id: `day-${day}-${mealType}-${removedRecipe.id}`,
            };
          }
          return item;
        }));
      },
    });
  };

  const handleReorderDays = useCallback((activeDay: number, overDay: number): void => {
    setPlan((prevPlan) => {
      const uniqueDays = [...new Set(prevPlan.map(item => item.day))].sort((a, b) => a - b);

      const activeIndex = uniqueDays.indexOf(activeDay);
      const overIndex = uniqueDays.indexOf(overDay);

      if (activeIndex === -1 || overIndex === -1) return prevPlan;

      const newDayOrder = arrayMove(uniqueDays, activeIndex, overIndex);

      const dayMapping: Record<number, number> = {};
      newDayOrder.forEach((oldDay, newIndex) => {
        dayMapping[oldDay] = newIndex + 1;
      });

      return prevPlan.map((item) => ({
        ...item,
        day: dayMapping[item.day],
        id: `day-${dayMapping[item.day]}-${item.mealType}-${item.recipe?.id || 'empty'}`,
      })).sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        const aOrder = MEAL_TYPES.find(mt => mt.id === a.mealType)?.order ?? 99;
        const bOrder = MEAL_TYPES.find(mt => mt.id === b.mealType)?.order ?? 99;
        return aOrder - bOrder;
      });
    });
  }, []);

  const updateRecipeRatingInPlan = (recipeId: string, rating: number): void => {
    setPlan(prev => prev.map(item =>
      item.recipe?.id === recipeId
        ? { ...item, recipe: { ...item.recipe!, rating } }
        : item
    ));
  };

  const markCooked = (planItemId: string): void => {
    setPlan(prev => prev.map(item => {
      if (item.id !== planItemId) return item;
      if (item.cookedAt) {
        // Un-mark cooked
        const { cookedAt: _, ...rest } = item;
        return rest as PlanItem;
      }
      // Mark cooked for the first time → increment timesUsed
      if (item.recipe?.id && incrementTimesUsed) {
        incrementTimesUsed(item.recipe.id);
      }
      return { ...item, cookedAt: new Date().toISOString() };
    }));
  };

  const handleSelectRecipeSlot = (day: number, mealType: MealType): void => {
    setSelectedDayForPicker(day);
    setSelectedMealTypeForPicker(mealType);
  };

  const handleCloseRecipePicker = (): void => {
    setSelectedDayForPicker(null);
    setSelectedMealTypeForPicker(null);
  };

  const handleAssign = (recipe: Recipe, day: number, mealType: MealType): void => {
    assignRecipeToSlot(day, mealType, recipe);
  };

  const loadPlan = (newPlan: PlanItem[], newDays: number): void => {
    setPlan(newPlan);
    setDays(newDays);
  };

  return {
    plan, days, setDays,
    planStartDate, setPlanStartDate,
    markCooked,
    updateRecipeRatingInPlan,
    searchTerm, setSearchTerm,
    selectedDayForPicker, selectedMealTypeForPicker,
    filteredRecipes,
    generateRandomPlan,
    assignRecipeToSlot, assignRecipeToDay,
    updateServings, updateNotes,
    removeMealPlanRecipe,
    handleReorderDays,
    handleSelectRecipeSlot, handleCloseRecipePicker,
    handleAssign,
    loadPlan,
    setPlan,
  };
};
