// src/components/RecipePickerModal.tsx
import { useEffect, useMemo, useState } from 'react';
import type { Recipe, MealType, MealTypeConfig, PlanItem, IngredientExclusion, IngredientFrequencyLimit, MealSlotTheme } from '../types';
import { MEAL_TYPES, PREDEFINED_THEMES } from '../types';
import {
  filterExcludedRecipes,
  getRecipesExceedingLimits,
  getThemeForSlot,
  recipeMatchesTheme,
} from '../utils/dietaryPreferences';

interface RecipePickerModalProps {
  selectedDay: number | null;
  selectedMealType: MealType | null;
  onClose: () => void;
  recipes: Recipe[];
  assignRecipeToSlot: (day: number, mealType: MealType, recipe: Recipe | null) => void;
  isCustomRecipe: (recipe: Recipe | null | undefined) => boolean;
  onToggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  onViewRecipe?: (recipe: Recipe) => void;
  ingredientExclusions?: IngredientExclusion[];
  frequencyLimits?: IngredientFrequencyLimit[];
  mealSlotThemes?: MealSlotTheme[];
  plan?: PlanItem[];
}

const RecipePickerModal = ({
  selectedDay,
  selectedMealType,
  onClose,
  recipes,
  assignRecipeToSlot,
  isCustomRecipe,
  onToggleFavorite,
  isFavorite,
  onViewRecipe,
  ingredientExclusions = [],
  frequencyLimits = [],
  mealSlotThemes = [],
  plan = [],
}: RecipePickerModalProps) => {
  const [showOnlySuggested, setShowOnlySuggested] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (selectedDay !== null && selectedMealType !== null) {
      setLocalSearchTerm('');
      setShowOnlySuggested(false);
    }
  }, [selectedDay, selectedMealType]);

  // Check if a recipe matches the selected meal type
  const recipeMatchesMealType = (recipe: Recipe, mealType: MealType): boolean => {
    return recipe.mealTypes?.some(mt => mt.toLowerCase() === mealType.toLowerCase()) ?? false;
  };

  // Get theme for current slot
  const slotTheme = useMemo(() => {
    if (!selectedDay || !selectedMealType) return null;
    return getThemeForSlot(selectedDay, selectedMealType, mealSlotThemes);
  }, [selectedDay, selectedMealType, mealSlotThemes]);

  const themeConfig = slotTheme ? PREDEFINED_THEMES.find(t => t.id === slotTheme) : null;

  // Filter and sort recipes
  const { suggestedRecipes, displayRecipes, recipesAtLimit, themedRecipeIds } = useMemo(() => {
    // Step 1: Filter out excluded ingredients
    let filtered = filterExcludedRecipes(recipes, ingredientExclusions);

    // Step 2: Apply search filter
    if (localSearchTerm.trim()) {
      const term = localSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(recipe => {
        if (recipe.name?.toLowerCase().includes(term)) return true;
        if (recipe.ingredients?.some(i => i.name?.toLowerCase().includes(term))) return true;
        if (recipe.tags?.some(t => t.toLowerCase().includes(term))) return true;
        if (recipe.cuisine?.toLowerCase().includes(term)) return true;
        if (recipe.dietary?.some(d => d.toLowerCase().includes(term))) return true;
        if (recipe.mealTypes?.some(mt => mt.toLowerCase().includes(term))) return true;
        return false;
      });
    }

    // Step 3: Get recipes that would exceed frequency limits
    const atLimit = getRecipesExceedingLimits(filtered, plan, frequencyLimits);

    // Step 4: Identify themed recipes
    const themedIds = new Set<string>();
    if (slotTheme) {
      filtered.forEach(recipe => {
        if (recipeMatchesTheme(recipe, slotTheme)) {
          themedIds.add(recipe.id);
        }
      });
    }

    // Step 5: Sort recipes - themed+suggested first, then suggested, then themed, then rest
    if (!selectedMealType) {
      return {
        suggestedRecipes: [],
        displayRecipes: filtered,
        recipesAtLimit: atLimit,
        themedRecipeIds: themedIds,
      };
    }

    const themedSuggested: Recipe[] = [];
    const suggested: Recipe[] = [];
    const themedOther: Recipe[] = [];
    const other: Recipe[] = [];

    filtered.forEach(recipe => {
      const isSuggested = recipeMatchesMealType(recipe, selectedMealType);
      const isThemed = themedIds.has(recipe.id);

      if (isThemed && isSuggested) {
        themedSuggested.push(recipe);
      } else if (isSuggested) {
        suggested.push(recipe);
      } else if (isThemed) {
        themedOther.push(recipe);
      } else {
        other.push(recipe);
      }
    });

    const allSuggested = [...themedSuggested, ...suggested];
    const display = showOnlySuggested && allSuggested.length > 0
      ? allSuggested
      : [...themedSuggested, ...suggested, ...themedOther, ...other];

    return {
      suggestedRecipes: allSuggested,
      displayRecipes: display,
      recipesAtLimit: atLimit,
      themedRecipeIds: themedIds,
    };
  }, [recipes, localSearchTerm, selectedMealType, showOnlySuggested, ingredientExclusions, frequencyLimits, plan, slotTheme]);

  if (selectedDay === null || selectedMealType === null) return null;

  // Get meal type config for display
  const mealTypeConfig: MealTypeConfig | undefined = MEAL_TYPES.find(mt => mt.id === selectedMealType);
  const mealLabel = mealTypeConfig?.label || selectedMealType;
  const mealIcon = mealTypeConfig?.icon || '';

  const hasSuggestedRecipes = suggestedRecipes.length > 0;
  const isSearching = localSearchTerm.trim().length > 0;
  const hasExclusions = ingredientExclusions.length > 0;
  const excludedCount = recipes.length - filterExcludedRecipes(recipes, ingredientExclusions).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 pt-4 sm:pt-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Choose recipe for Day {selectedDay}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {mealIcon} {mealLabel}
                </span>
                {themeConfig && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                    {themeConfig.icon} {themeConfig.label}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 text-2xl leading-none p-2"
            >
              ×
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder="Search recipes by name, ingredient, tag..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            {localSearchTerm && (
              <button
                onClick={() => setLocalSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter toggle - only show if there are suggested recipes and not searching */}
        {hasSuggestedRecipes && !isSearching && (
          <div className="px-5 py-3 border-b dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {suggestedRecipes.length} {mealLabel.toLowerCase()} recipe{suggestedRecipes.length !== 1 ? 's' : ''} available
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

        {/* Search results count / exclusion notice */}
        {(isSearching || hasExclusions) && (
          <div className="px-5 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {displayRecipes.length} recipe{displayRecipes.length !== 1 ? 's' : ''} available
              {hasSuggestedRecipes && ` (${suggestedRecipes.length} ${mealLabel.toLowerCase()})`}
            </span>
            {hasExclusions && excludedCount > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {excludedCount} hidden by exclusions
              </span>
            )}
          </div>
        )}

        {/* Recipe grid */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayRecipes.map((recipe, index) => {
              const isSuggested = recipeMatchesMealType(recipe, selectedMealType);
              const isThemed = themedRecipeIds.has(recipe.id);
              const isAtLimit = recipesAtLimit.has(recipe.id);
              const isFirstOther = !showOnlySuggested && !isSearching && hasSuggestedRecipes && index === suggestedRecipes.length;

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
                      isAtLimit
                        ? 'border-amber-300 dark:border-amber-700 opacity-75'
                        : isThemed
                        ? 'border-purple-200 dark:border-purple-700'
                        : isSuggested && !showOnlySuggested
                        ? 'border-blue-200 dark:border-blue-700'
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                    onClick={() => {
                      assignRecipeToSlot(selectedDay, selectedMealType, recipe);
                    }}
                  >
                    {/* Warning for at-limit recipes */}
                    {isAtLimit && (
                      <div className="absolute -top-2 -left-2 bg-amber-500 text-white rounded-full p-1" title="At frequency limit">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    )}

                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      {isThemed && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                          {themeConfig?.icon}
                        </span>
                      )}
                      {isSuggested && !showOnlySuggested && !isThemed && (
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
                {isSearching
                  ? `No recipes match "${localSearchTerm.trim()}"`
                  : hasExclusions
                  ? 'No recipes available with current exclusions'
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
