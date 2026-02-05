import { useState, useMemo, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { Recipe, PlanItem, MealType } from '../types';
import { MEAL_TYPES } from '../types';
import type { UndoAction } from '../components/UndoToast';
import { STORAGE_KEYS, getStoredValue } from '../utils/storage';

interface UseMealPlanParams {
  allRecipes: Recipe[];
  sortedEnabledMealTypes: MealType[];
  addToRecent: (recipeId: string) => void;
  setUndoAction: (action: UndoAction | null) => void;
}

export const useMealPlan = ({
  allRecipes,
  sortedEnabledMealTypes,
  addToRecent,
  setUndoAction,
}: UseMealPlanParams) => {
  const [days, setDays] = useState<number>(() => getStoredValue(STORAGE_KEYS.DAYS, 3));
  const [plan, setPlan] = useState<PlanItem[]>(() => getStoredValue(STORAGE_KEYS.PLAN, []));
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDayForPicker, setSelectedDayForPicker] = useState<number | null>(null);
  const [selectedMealTypeForPicker, setSelectedMealTypeForPicker] = useState<MealType | null>(null);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DAYS, JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(plan));
  }, [plan]);

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

  const generateRandomPlan = (): void => {
    const newPlan: PlanItem[] = [];
    const numDays = days || 7;

    for (let day = 1; day <= numDays; day++) {
      for (const mealType of sortedEnabledMealTypes) {
        const recipesForMeal = getRecipesForMealType(mealType);
        const randomIndex = Math.floor(Math.random() * recipesForMeal.length);
        const recipe = recipesForMeal[randomIndex];
        newPlan.push({
          day,
          mealType,
          id: `day-${day}-${mealType}-${recipe.id || Math.random().toString(36).slice(2)}`,
          recipe: { ...recipe },
          servingsMultiplier: 1,
        });
      }
    }

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
