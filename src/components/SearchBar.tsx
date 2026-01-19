// src/components/SearchBar.tsx
import type { ChangeEvent } from 'react';
import type { Recipe } from '../types';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredRecipes: Recipe[];
  onAssign: (recipe: Recipe, dayIndex: number) => void;
  days: number;
}

const SearchBar = ({ searchTerm, setSearchTerm, filteredRecipes, onAssign, days }: SearchBarProps) => {
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
    <div className="mb-10 bg-white p-6 rounded-xl shadow-sm border">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        Find Recipes by Ingredient
      </h3>
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearchChange}
        placeholder="e.g. chicken, rice, tomato, tofu..."
        className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
      />

      {searchTerm.trim() && (
        <div className="mt-3 text-sm text-gray-600">
          Found {filteredRecipes.length} recipes containing "{searchTerm.trim()}"
        </div>
      )}

      {filteredRecipes.length > 0 && (
        <div className="mt-6 max-h-96 overflow-y-auto">
          <h4 className="text-lg font-medium mb-3 text-gray-700">Matching Recipes</h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id || recipe.name}
                className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition hover:border-green-400 bg-gray-50"
              >
                <h5 className="font-semibold mb-1 truncate">{recipe.name}</h5>
                <p className="text-sm text-gray-600">
                  {recipe.servings?.default || '?'} servings • {recipe.totalTime?.replace('PT', '').replace('M', ' min') || '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                  Ingredients: {recipe.ingredients?.map(i => i.name).join(', ') || 'None listed'}
                </p>
                <select
                  onChange={handleAssignChange(recipe)}
                  className="mt-2 w-full border rounded px-2 py-1 text-sm bg-white"
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
