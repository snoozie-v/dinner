// src/components/SearchBar.tsx
import type { ChangeEvent } from 'react';
import type { Recipe } from '../types';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredRecipes: Recipe[];
  onAssign: (recipe: Recipe, dayIndex: number) => void;
  days: number;
  onToggleFavorite: (recipeId: string) => void;
  isFavorite: (recipeId: string) => boolean;
}

const SearchBar = ({
  searchTerm,
  setSearchTerm,
  filteredRecipes,
  onAssign,
  days,
  onToggleFavorite,
  isFavorite,
}: SearchBarProps) => {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleAssignChange = (recipe: Recipe) => (e: ChangeEvent<HTMLSelectElement>) => {
    const dayIndex = parseInt(e.target.value);
    if (!isNaN(dayIndex)) {
      onAssign(recipe, dayIndex);
      e.target.value = '';
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
                  <h5 className="font-semibold truncate flex-1 dark:text-gray-100">{recipe.name}</h5>
                  <button
                    onClick={() => onToggleFavorite(recipe.id)}
                    className={`ml-2 flex-shrink-0 text-lg ${
                      isFavorite(recipe.id) ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-500 hover:text-yellow-400'
                    }`}
                    title={isFavorite(recipe.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    ★
                  </button>
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
                  <option value="">Assign to Day...</option>
                  {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d - 1}>Day {d}</option>
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
