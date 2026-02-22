// src/hooks/useRecipes.ts
import { useEffect, useCallback, useMemo } from 'react';
import type { Recipe, RecipeOperationResult } from '../types';
import {
  isCustomRecipe,
  generateRecipeId,
  createBlankRecipe,
  validateRecipe
} from '../utils/recipeValidation';
import { STORAGE_KEYS } from '../utils/storage';
import { usePersistedState } from './usePersistedState';

// Metadata persisted separately so default recipes can also store rating/timesUsed
interface RecipeMetadata {
  rating?: number | null;
  timesUsed?: number;
}

export interface UseRecipesReturn {
  customRecipes: Recipe[];
  allRecipes: Recipe[];
  addRecipe: (recipeData: Partial<Recipe>) => RecipeOperationResult;
  updateRecipe: (recipeId: string, updates: Partial<Recipe>) => RecipeOperationResult;
  deleteRecipe: (recipeId: string) => RecipeOperationResult;
  restoreRecipe: (recipe: Recipe) => void;
  duplicateRecipe: (recipeId: string) => RecipeOperationResult;
  getRecipeById: (recipeId: string) => Recipe | null;
  isCustomRecipe: (recipe: Recipe | null | undefined) => boolean;
  importRecipes: (recipes: Recipe[], mode: 'overwrite' | 'merge') => void;
  rateRecipe: (recipeId: string, rating: number) => void;
  incrementTimesUsed: (recipeId: string) => void;
}

/**
 * Custom hook for managing recipes with CRUD operations
 */
export const useRecipes = (defaultRecipes: Recipe[] = []): UseRecipesReturn => {
  const [customRecipes, setCustomRecipes] = usePersistedState<Recipe[]>(
    STORAGE_KEYS.CUSTOM_RECIPES, []
  );
  const [recipeMetadata, setRecipeMetadata] = usePersistedState<Record<string, RecipeMetadata>>(
    STORAGE_KEYS.RECIPE_METADATA, {}
  );

  // Merge default and custom recipes, applying persisted metadata overrides
  const allRecipes = useMemo<Recipe[]>(() => {
    const merged = [...defaultRecipes, ...customRecipes];
    return merged.map(r => {
      const meta = recipeMetadata[r.id];
      if (!meta) return r;
      return {
        ...r,
        rating: meta.rating !== undefined ? meta.rating : r.rating,
        timesUsed: meta.timesUsed !== undefined ? meta.timesUsed : (r.timesUsed ?? 0),
      };
    });
  }, [defaultRecipes, customRecipes, recipeMetadata]);

  /**
   * Add a new custom recipe
   */
  const addRecipe = useCallback((recipeData: Partial<Recipe>): RecipeOperationResult => {
    const newRecipe: Recipe = {
      ...createBlankRecipe(),
      ...recipeData,
      id: generateRecipeId(),
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const validation = validateRecipe(newRecipe);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    setCustomRecipes(prev => [...prev, newRecipe]);
    return { success: true, recipe: newRecipe };
  }, []);

  /**
   * Update an existing custom recipe
   */
  const updateRecipe = useCallback((recipeId: string, updates: Partial<Recipe>): RecipeOperationResult => {
    // Find the recipe
    const existingRecipe = customRecipes.find(r => r.id === recipeId);

    if (!existingRecipe) {
      return { success: false, errors: ['Recipe not found'] };
    }

    if (!isCustomRecipe(existingRecipe)) {
      return { success: false, errors: ['Cannot edit default recipes'] };
    }

    const updatedRecipe: Recipe = {
      ...existingRecipe,
      ...updates,
      id: recipeId, // Ensure ID doesn't change
      isCustom: true, // Ensure it stays custom
      updatedAt: new Date().toISOString()
    };

    const validation = validateRecipe(updatedRecipe);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    setCustomRecipes(prev =>
      prev.map(r => r.id === recipeId ? updatedRecipe : r)
    );

    return { success: true, recipe: updatedRecipe };
  }, [customRecipes]);

  /**
   * Delete a custom recipe
   */
  const deleteRecipe = useCallback((recipeId: string): RecipeOperationResult => {
    const recipe = customRecipes.find(r => r.id === recipeId);

    if (!recipe) {
      return { success: false, errors: ['Recipe not found'] };
    }

    if (!isCustomRecipe(recipe)) {
      return { success: false, errors: ['Cannot delete default recipes'] };
    }

    setCustomRecipes(prev => prev.filter(r => r.id !== recipeId));
    return { success: true, recipe }; // Return deleted recipe for undo
  }, [customRecipes]);

  /**
   * Restore a previously deleted recipe (for undo)
   */
  const restoreRecipe = useCallback((recipe: Recipe): void => {
    setCustomRecipes(prev => [...prev, recipe]);
  }, []);

  /**
   * Duplicate a recipe (creates a custom copy)
   */
  const duplicateRecipe = useCallback((recipeId: string): RecipeOperationResult => {
    const originalRecipe = allRecipes.find(r => r.id === recipeId);

    if (!originalRecipe) {
      return { success: false, errors: ['Recipe not found'] };
    }

    const newRecipe: Recipe = {
      ...originalRecipe,
      id: generateRecipeId(),
      isCustom: true,
      name: `${originalRecipe.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCustomRecipes(prev => [...prev, newRecipe]);
    return { success: true, recipe: newRecipe };
  }, [allRecipes]);

  /**
   * Get a single recipe by ID
   */
  const getRecipeById = useCallback((recipeId: string): Recipe | null => {
    return allRecipes.find(r => r.id === recipeId) || null;
  }, [allRecipes]);

  /**
   * Import recipes from backup
   */
  const importRecipes = useCallback((recipes: Recipe[], mode: 'overwrite' | 'merge'): void => {
    if (mode === 'overwrite') {
      // Replace all custom recipes
      setCustomRecipes(recipes.filter(r => r.isCustom));
    } else {
      // Merge: add only recipes with IDs that don't exist
      setCustomRecipes(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const newRecipes = recipes.filter(r => r.isCustom && !existingIds.has(r.id));
        return [...prev, ...newRecipes];
      });
    }
  }, []);

  /**
   * Save a star rating for any recipe (default or custom)
   */
  const rateRecipe = useCallback((recipeId: string, rating: number): void => {
    setRecipeMetadata(prev => ({
      ...prev,
      [recipeId]: { ...prev[recipeId], rating },
    }));
  }, []);

  /**
   * Increment timesUsed for any recipe (called when marking as cooked for first time)
   */
  const incrementTimesUsed = useCallback((recipeId: string): void => {
    setRecipeMetadata(prev => {
      const current = prev[recipeId]?.timesUsed ?? 0;
      return { ...prev, [recipeId]: { ...prev[recipeId], timesUsed: current + 1 } };
    });
  }, []);

  return {
    customRecipes,
    allRecipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    restoreRecipe,
    duplicateRecipe,
    getRecipeById,
    isCustomRecipe,
    importRecipes,
    rateRecipe,
    incrementTimesUsed,
  };
};

export default useRecipes;
