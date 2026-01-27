// src/components/RecipePickerModal.tsx
import { useEffect, useMemo, useState } from 'react';
import type { Recipe, MealType, MealTypeConfig } from '../types';
import { MEAL_TYPES } from '../types';

interface RecipePickerModalProps {
  selectedDay: number | null;
  selectedMealType: MealType | null;
  onClose: () => void;
  searchTerm: string;
  filteredRecipes: Recipe[];
  recipes: Recipe[];
  assignRecipeToSlot: (day: number, mealType: MealType, recipe: Recipe | null) => void;
  isCustomRecipe: (recipe: Recipe | null | undefined) => boolean;
  onToggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  onViewRecipe?: (recipe: Recipe) => void;
}

const RecipePickerModal = ({
  selectedDay,
  selectedMealType,
  onClose,
  searchTerm,
  filteredRecipes,
  recipes,
  assignRecipeToSlot,
  isCustomRecipe,
  onToggleFavorite,
  isFavorite,
  onViewRecipe,
}: RecipePickerModalProps) => {
  const [showOnlySuggested, setShowOnlySuggested] = useState(false);

  // Scroll to top when modal opens
  useEffect(() => {
    if (selectedDay !== null && selectedMealType !== null) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedDay, selectedMealType]);

  // Reset filter when meal type changes
  useEffect(() => {
    setShowOnlySuggested(false);
  }, [selectedMealType]);

  // Check if a recipe matches the selected meal type
  const recipeMatchesMealType = (recipe: Recipe, mealType: MealType): boolean => {
    return recipe.mealTypes?.some(mt => mt.toLowerCase() === mealType.toLowerCase()) ?? false;
  };

  // Sort and filter recipes - suggested ones first
  const { suggestedRecipes, otherRecipes, displayRecipes } = useMemo(() => {
    const baseRecipes = searchTerm.trim() ? filteredRecipes : recipes;

    if (!selectedMealType) {
      return { suggestedRecipes: [], otherRecipes: baseRecipes, displayRecipes: baseRecipes };
    }

    const suggested: Recipe[] = [];
    const other: Recipe[] = [];

    baseRecipes.forEach(recipe => {
      if (recipeMatchesMealType(recipe, selectedMealType)) {
        suggested.push(recipe);
      } else {
        other.push(recipe);
      }
    });

    const display = showOnlySuggested && suggested.length > 0 ? suggested : [...suggested, ...other];

    return { suggestedRecipes: suggested, otherRecipes: other, displayRecipes: display };
  }, [searchTerm, filteredRecipes, recipes, selectedMealType, showOnlySuggested]);

  if (selectedDay === null || selectedMealType === null) return null;

  // Get meal type config for display
  const mealTypeConfig: MealTypeConfig | undefined = MEAL_TYPES.find(mt => mt.id === selectedMealType);
  const mealLabel = mealTypeConfig?.label || selectedMealType;
  const mealIcon = mealTypeConfig?.icon || '';

  const hasSuggestedRecipes = suggestedRecipes.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 pt-4 sm:pt-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Choose recipe for Day {selectedDay}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {mealIcon} {mealLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Filter toggle - only show if there are suggested recipes */}
        {hasSuggestedRecipes && !searchTerm.trim() && (
          <div className="px-5 py-3 border-b dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {suggestedRecipes.length} {mealLabel.toLowerCase()} recipe{suggestedRecipes.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <button
              onClick={() => setShowOnlySuggested(!showOnlySuggested)}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                showOnlySuggested
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700'
              }`}
            >
              {showOnlySuggested ? 'Show all recipes' : `Show only ${mealLabel.toLowerCase()}`}
            </button>
          </div>
        )}

        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayRecipes.map((recipe, index) => {
              const isSuggested = recipeMatchesMealType(recipe, selectedMealType);
              const isFirstOther = !showOnlySuggested && hasSuggestedRecipes && index === suggestedRecipes.length;

              return (
                <div key={recipe.id || recipe.name || Math.random().toString(36)}>
                  {/* Divider before "other" recipes */}
                  {isFirstOther && (
                    <div className="col-span-full mb-4 -mt-1 flex items-center gap-3">
                      <div className="flex-1 border-t border-gray-200 dark:border-gray-600"></div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                        All recipes
                      </span>
                      <div className="flex-1 border-t border-gray-200 dark:border-gray-600"></div>
                    </div>
                  )}
                  <div
                    className={`border rounded-lg p-4 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all duration-150 bg-white dark:bg-gray-700 relative ${
                      isSuggested && !showOnlySuggested
                        ? 'border-blue-200 dark:border-blue-700'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                    onClick={() => {
                      assignRecipeToSlot(selectedDay, selectedMealType, recipe);
                    }}
                  >
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      {isSuggested && !showOnlySuggested && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {mealLabel}
                        </span>
                      )}
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
                </div>
              );
            })}

            {displayRecipes.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
                {searchTerm.trim()
                  ? `No recipes match your search term "${searchTerm.trim()}"`
                  : `No ${mealLabel.toLowerCase()} recipes found`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipePickerModal;
