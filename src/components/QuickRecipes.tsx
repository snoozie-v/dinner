// src/components/QuickRecipes.tsx
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Recipe } from '../types';

interface QuickRecipesProps {
  favoriteRecipes: Recipe[];
  recentRecipes: Recipe[];
  onAssign: (recipe: Recipe, dayIndex: number) => void;
  onToggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  days: number;
  onViewRecipe?: (recipe: Recipe) => void;
}

const QuickRecipes = ({
  favoriteRecipes,
  recentRecipes,
  onAssign,
  onToggleFavorite,
  isFavorite,
  days,
  onViewRecipe,
}: QuickRecipesProps) => {
  const [activeSection, setActiveSection] = useState<'favorites' | 'recent'>('favorites');

  const recipes = activeSection === 'favorites' ? favoriteRecipes : recentRecipes;

  const handleAssignChange = (recipe: Recipe) => (e: ChangeEvent<HTMLSelectElement>) => {
    const dayIndex = parseInt(e.target.value);
    if (!isNaN(dayIndex)) {
      onAssign(recipe, dayIndex);
      e.target.value = '';
    }
  };

  if (favoriteRecipes.length === 0 && recentRecipes.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Quick Add</h3>
        <div className="flex gap-2">
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
        </div>
      </div>

      {recipes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          {activeSection === 'favorites'
            ? 'No favorites yet. Star recipes to add them here!'
            : 'No recently used recipes yet.'}
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex-shrink-0 w-48 border dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate flex-1">
                  {recipe.name}
                </h4>
                <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                  {onViewRecipe && (
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
                  <button
                    onClick={() => onToggleFavorite(recipe.id)}
                    className={`${
                      isFavorite(recipe.id) ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-500 hover:text-yellow-400'
                    }`}
                    title={isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    ★
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {recipe.totalTime?.replace('PT', '').replace('M', ' min') || '—'}
              </p>
              <select
                onChange={handleAssignChange(recipe)}
                className="w-full border dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-600 dark:text-gray-100"
                defaultValue=""
              >
                <option value="">Add to day...</option>
                {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d - 1}>Day {d}</option>
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
