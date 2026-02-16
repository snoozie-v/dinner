import { useMemo } from 'react';
import type { Recipe, UserPreferences } from '../types';
import { STORAGE_KEYS } from '../utils/storage';
import { usePersistedState } from './usePersistedState';

export const useUserPreferences = (allRecipes: Recipe[]) => {
  const [userPrefs, setUserPrefs] = usePersistedState<UserPreferences>(
    STORAGE_KEYS.USER_PREFS, { favoriteRecipeIds: [], recentRecipeIds: [] }
  );

  const toggleFavorite = (recipeId: string): void => {
    setUserPrefs(prev => {
      const isFav = prev.favoriteRecipeIds.includes(recipeId);
      return {
        ...prev,
        favoriteRecipeIds: isFav
          ? prev.favoriteRecipeIds.filter(id => id !== recipeId)
          : [...prev.favoriteRecipeIds, recipeId],
      };
    });
  };

  const isFavorite = (recipeId: string): boolean => {
    return userPrefs.favoriteRecipeIds.includes(recipeId);
  };

  const addToRecent = (recipeId: string): void => {
    setUserPrefs(prev => {
      const filtered = prev.recentRecipeIds.filter(id => id !== recipeId);
      return {
        ...prev,
        recentRecipeIds: [recipeId, ...filtered].slice(0, 10),
      };
    });
  };

  const favoriteRecipes = useMemo(() => {
    return userPrefs.favoriteRecipeIds
      .map(id => allRecipes.find(r => r.id === id))
      .filter((r): r is Recipe => r !== undefined);
  }, [userPrefs.favoriteRecipeIds, allRecipes]);

  const recentRecipes = useMemo(() => {
    return userPrefs.recentRecipeIds
      .map(id => allRecipes.find(r => r.id === id))
      .filter((r): r is Recipe => r !== undefined);
  }, [userPrefs.recentRecipeIds, allRecipes]);

  const importPrefs = (prefs: UserPreferences, mode: 'overwrite' | 'merge'): void => {
    if (mode === 'overwrite') {
      setUserPrefs(prefs);
    } else {
      setUserPrefs(prev => ({
        favoriteRecipeIds: [...new Set([...prev.favoriteRecipeIds, ...(prefs.favoriteRecipeIds || [])])],
        recentRecipeIds: prev.recentRecipeIds,
      }));
    }
  };

  return {
    userPrefs, toggleFavorite, isFavorite, addToRecent,
    favoriteRecipes, recentRecipes, importPrefs,
  };
};
