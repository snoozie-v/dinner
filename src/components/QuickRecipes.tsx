// src/components/QuickRecipes.tsx
import { useState, useMemo, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import type { Recipe, MealType, MealTypeConfig } from '../types';

interface QuickRecipesProps {
  favoriteRecipes: Recipe[];
  recentRecipes: Recipe[];
  allRecipes?: Recipe[];
  onAssign: (recipe: Recipe, day: number, mealType: MealType) => void;
  onToggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  days: number;
  mealTypes: MealTypeConfig[];
  onViewRecipe?: (recipe: Recipe) => void;
}

const QuickRecipes = ({
  favoriteRecipes,
  recentRecipes,
  allRecipes = [],
  onAssign,
  onToggleFavorite,
  isFavorite,
  days,
  mealTypes,
  onViewRecipe,
}: QuickRecipesProps) => {
  const [activeSection, setActiveSection] = useState<'favorites' | 'recent' | 'discover'>('favorites');
  const [discoverSeed, setDiscoverSeed] = useState(0);

  // Pick up to 8 random untried recipes, re-seeded on refresh
  const discoverRecipes = useMemo(() => {
    const untried = allRecipes.filter(r => (r.timesUsed ?? 0) === 0);
    // Shuffle deterministically based on seed
    const shuffled = [...untried].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  }, [allRecipes, discoverSeed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefreshDiscover = useCallback(() => setDiscoverSeed(s => s + 1), []);

  const recipes = activeSection === 'favorites' ? favoriteRecipes : activeSection === 'recent' ? recentRecipes : discoverRecipes;

  // Parse "day-mealType" value from select
  const handleAssignChange = (recipe: Recipe) => (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      const [dayStr, mealType] = value.split('-');
      const day = parseInt(dayStr);
      if (!isNaN(day) && mealType) {
        onAssign(recipe, day, mealType as MealType);
        e.target.value = '';
      }
    }
  };

  const untriedCount = allRecipes.filter(r => (r.timesUsed ?? 0) === 0).length;

  if (favoriteRecipes.length === 0 && recentRecipes.length === 0 && untriedCount === 0) {
    return null;
  }

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Quick Add</h3>
        <div className="flex gap-2 flex-wrap">
          {favoriteRecipes.length > 0 && (
            <button
              onClick={() => setActiveSection('favorites')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeSection === 'favorites'
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="mr-1">★</span>
              Favorites ({favoriteRecipes.length})
            </button>
          )}
          {recentRecipes.length > 0 && (
            <button
              onClick={() => setActiveSection('recent')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeSection === 'recent'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="mr-1">↻</span>
              Recent ({recentRecipes.length})
            </button>
          )}
          {untriedCount > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveSection('discover')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === 'discover'
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="mr-1">✦</span>
                Discover ({untriedCount})
              </button>
              {activeSection === 'discover' && (
                <button
                  onClick={handleRefreshDiscover}
                  className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                  title="Refresh discover list"
                >
                  ↺
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {recipes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {activeSection === 'favorites'
            ? 'No favorites yet. Star recipes to add them here!'
            : activeSection === 'recent'
            ? 'No recently used recipes yet.'
            : 'All recipes tried! Great work.'}
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex-shrink-0 w-48 border dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700 hover:shadow-md transition-shadow relative"
            >
              {/* NEW badge for Discover tab */}
              {activeSection === 'discover' && (
                <span className="absolute top-2 right-2 text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold leading-none">
                  NEW
                </span>
              )}
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate flex-1 pr-1">
                  {recipe.name}
                </h4>
                <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                  {onViewRecipe && activeSection !== 'discover' && (
                    <button
                      onClick={() => onViewRecipe(recipe)}
                      className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="View recipe details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                  {activeSection !== 'discover' && (
                    <button
                      onClick={() => onToggleFavorite(recipe.id)}
                      className={`${
                        isFavorite(recipe.id) ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-500 hover:text-yellow-400'
                      }`}
                      title={isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      ★
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {recipe.totalTime?.replace('PT', '').replace('M', ' min') || '—'}
              </p>
              {activeSection === 'discover' && onViewRecipe && (
                <button
                  onClick={() => onViewRecipe(recipe)}
                  className="w-full text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 mb-1.5 text-left"
                >
                  View recipe →
                </button>
              )}
              <select
                onChange={handleAssignChange(recipe)}
                className="w-full border dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-600 dark:text-gray-100"
                defaultValue=""
              >
                <option value="">Add to...</option>
                {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
                  <optgroup key={d} label={`Day ${d}`}>
                    {mealTypes.map((mt) => (
                      <option key={`${d}-${mt.id}`} value={`${d}-${mt.id}`}>
                        {mt.icon} {mt.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuickRecipes;
