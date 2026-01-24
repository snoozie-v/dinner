// src/components/RecipePickerModal.tsx
import { useEffect } from 'react';
import type { Recipe } from '../types';

interface RecipePickerModalProps {
  selectedDayForPicker: number | null;
  setSelectedDayForPicker: (day: number | null) => void;
  searchTerm: string;
  filteredRecipes: Recipe[];
  recipes: Recipe[];
  assignRecipeToDay: (dayIndex: number, recipe: Recipe | null) => void;
  isCustomRecipe: (recipe: Recipe | null | undefined) => boolean;
  onToggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  onViewRecipe?: (recipe: Recipe) => void;
}

const RecipePickerModal = ({
  selectedDayForPicker,
  setSelectedDayForPicker,
  searchTerm,
  filteredRecipes,
  recipes,
  assignRecipeToDay,
  isCustomRecipe,
  onToggleFavorite,
  isFavorite,
  onViewRecipe,
}: RecipePickerModalProps) => {
  // Scroll to top when modal opens
  useEffect(() => {
    if (selectedDayForPicker !== null) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedDayForPicker]);

  if (selectedDayForPicker === null) return null;

  const displayRecipes = searchTerm.trim() ? filteredRecipes : recipes;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 pt-4 sm:pt-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Choose recipe for Day {selectedDayForPicker + 1}
          </h3>
          <button
            onClick={() => setSelectedDayForPicker(null)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayRecipes.map((recipe) => (
              <div
                key={recipe.id || recipe.name || Math.random().toString(36)}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all duration-150 bg-white dark:bg-gray-700 relative"
                onClick={() => {
                  assignRecipeToDay(selectedDayForPicker, recipe);
                }}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {isCustomRecipe(recipe) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300">
                      Custom
                    </span>
                  )}
                  {onViewRecipe && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewRecipe(recipe);
                      }}
                      className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="View recipe details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(recipe.id);
                    }}
                    className={`text-lg leading-none ${
                      isFavorite(recipe.id) ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-500 hover:text-yellow-400'
                    }`}
                    title={isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    ★
                  </button>
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1.5 truncate pr-16">
                  {recipe.name || "Unnamed recipe"}
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2.5">
                  {recipe.servings?.default || '?'} servings •{' '}
                  {recipe.totalTime?.replace('PT', '').replace('M', ' min') || '—'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {recipe.ingredients?.slice(0, 3).map((i) => i?.name || '?').join(', ') || 'No ingredients listed'}
                  {(recipe.ingredients?.length ?? 0) > 3 ? ' …' : ''}
                </div>
              </div>
            ))}

            {displayRecipes.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
                No recipes match your search term "{searchTerm.trim()}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipePickerModal;
