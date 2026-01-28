// src/components/SearchBar.tsx
import type { ChangeEvent } from 'react';
import type { Recipe, MealType, MealTypeConfig } from '../types';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredRecipes: Recipe[];
  onAssign: (recipe: Recipe, day: number, mealType: MealType) => void;
  days: number;
  mealTypes: MealTypeConfig[];
  onToggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
  onViewRecipe?: (recipe: Recipe) => void;
}

const SearchBar = ({
  searchTerm,
  setSearchTerm,
  filteredRecipes,
  onAssign,
  days,
  mealTypes,
  onToggleFavorite,
  isFavorite,
  onViewRecipe,
}: SearchBarProps) => {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

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

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
      <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100">
        Search Recipes
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Search by name, ingredient, cuisine, tags, dietary options, and more
      </p>
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder="e.g. chicken, italian, vegetarian, quick..."
        className="w-full max-w-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
      />

      {searchTerm.trim() && (
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          Found {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} matching "{searchTerm.trim()}"
        </div>
      )}

      {filteredRecipes.length > 0 && searchTerm.trim() && (
        <div className="mt-6 max-h-96 overflow-y-auto">
          <h4 className="text-lg font-medium mb-3 text-gray-700 dark:text-gray-300">Matching Recipes</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id || recipe.name}
                className="border dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition hover:border-green-400 bg-gray-50 dark:bg-gray-700"
              >
                <div className="flex items-start justify-between mb-1">
                  <h5 className="font-semibold truncate flex-1 dark:text-gray-100">
                    {recipe.name}
                  </h5>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {onViewRecipe && (
                      <button
                        onClick={() => onViewRecipe(recipe)}
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
                      onClick={() => onToggleFavorite(recipe.id)}
                      className={`text-lg ${
                        isFavorite(recipe.id) ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-500 hover:text-yellow-400'
                      }`}
                      title={isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      ★
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {recipe.servings?.default || '?'} servings • {recipe.totalTime?.replace('PT', '').replace('M', ' min') || '—'}
                  {recipe.cuisine && ` • ${recipe.cuisine}`}
                </p>
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {recipe.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                        {tag}
                      </span>
                    ))}
                    {recipe.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{recipe.tags.length - 3}</span>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                  {recipe.ingredients?.map(i => i.name).join(', ') || 'No ingredients listed'}
                </p>
                <select
                  onChange={handleAssignChange(recipe)}
                  className="mt-2 w-full border dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-600 dark:text-gray-100"
                  defaultValue=""
                >
                  <option value="">Assign to...</option>
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
        </div>
      )}
    </div>
  );
};

export default SearchBar;
