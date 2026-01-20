// src/components/RecipePickerModal.tsx
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
}: RecipePickerModalProps) => {
  if (selectedDayForPicker === null) return null;

  const displayRecipes = searchTerm.trim() ? filteredRecipes : recipes;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900">
            Choose recipe for Day {selectedDayForPicker + 1}
          </h3>
          <button
            onClick={() => setSelectedDayForPicker(null)}
            className="text-gray-600 hover:text-gray-900 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayRecipes.map((recipe) => (
              <div
                key={recipe.id || recipe.name || Math.random().toString(36)}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all duration-150 bg-white relative"
                onClick={() => {
                  assignRecipeToDay(selectedDayForPicker, recipe);
                }}
              >
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {isCustomRecipe(recipe) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Custom
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(recipe.id);
                    }}
                    className={`text-lg leading-none ${
                      isFavorite(recipe.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                    }`}
                    title={isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    ★
                  </button>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1.5 truncate pr-16">
                  {recipe.name || "Unnamed recipe"}
                </h4>
                <div className="text-sm text-gray-600 mb-2.5">
                  {recipe.servings?.default || '?'} servings •{' '}
                  {recipe.totalTime?.replace('PT', '').replace('M', ' min') || '—'}
                </div>
                <div className="text-xs text-gray-500 line-clamp-2">
                  {recipe.ingredients?.slice(0, 3).map((i) => i?.name || '?').join(', ') || 'No ingredients listed'}
                  {(recipe.ingredients?.length ?? 0) > 3 ? ' …' : ''}
                </div>
              </div>
            ))}

            {displayRecipes.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500">
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
