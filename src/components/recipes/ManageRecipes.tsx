// src/components/recipes/ManageRecipes.tsx
import { useState, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import type { Recipe, RecipeOperationResult, FilterType } from '../../types';
import RecipeList from './RecipeList';
import RecipeFormModal from './RecipeFormModal';
import RecipeDetailModal from './RecipeDetailModal';
import ImportUrlModal from './ImportUrlModal';
import { parseRecipeFromUrl } from '../../utils/recipeParser';

interface ManageRecipesProps {
  recipes: Recipe[];
  onAddRecipe: (recipeData: Partial<Recipe>) => RecipeOperationResult;
  onUpdateRecipe: (recipeId: string, updates: Partial<Recipe>) => RecipeOperationResult;
  onDeleteRecipe: (recipeId: string) => { success: boolean; errors?: string[] };
  onDuplicateRecipe: (recipeId: string) => RecipeOperationResult;
  isCustomRecipe: (recipe: Recipe | null | undefined) => boolean;
}

const ManageRecipes = ({
  recipes,
  onAddRecipe,
  onUpdateRecipe,
  onDeleteRecipe,
  onDuplicateRecipe,
  isCustomRecipe
}: ManageRecipesProps) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);

  const filteredRecipes = useMemo<Recipe[]>(() => {
    let filtered = recipes;

    if (filterType === 'custom') {
      filtered = filtered.filter(r => isCustomRecipe(r));
    } else if (filterType === 'default') {
      filtered = filtered.filter(r => !isCustomRecipe(r));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(recipe =>
        recipe.name?.toLowerCase().includes(term) ||
        recipe.description?.toLowerCase().includes(term) ||
        recipe.tags?.some(tag => tag.toLowerCase().includes(term)) ||
        recipe.cuisine?.toLowerCase().includes(term) ||
        recipe.ingredients?.some(ing => ing.name?.toLowerCase().includes(term))
      );
    }

    return filtered;
  }, [recipes, searchTerm, filterType, isCustomRecipe]);

  const handleAddNew = (): void => {
    setEditingRecipe(null);
    setShowFormModal(true);
  };

  const handleView = (recipe: Recipe): void => {
    setViewingRecipe(recipe);
  };

  const handleViewClose = (): void => {
    setViewingRecipe(null);
  };

  const handleViewEdit = (recipe: Recipe): void => {
    setViewingRecipe(null);
    setEditingRecipe(recipe);
    setShowFormModal(true);
  };

  const handleEdit = (recipe: Recipe): void => {
    setEditingRecipe(recipe);
    setShowFormModal(true);
  };

  const handleDelete = (recipe: Recipe): void => {
    // Delete directly - undo toast provides recovery option
    onDeleteRecipe(recipe.id);
  };

  const handleDuplicate = (recipe: Recipe): void => {
    onDuplicateRecipe(recipe.id);
  };

  const handleFormSubmit = (recipeData: Partial<Recipe>): string[] | null => {
    let result: RecipeOperationResult;
    // Check if we're editing an existing recipe (has ID) or creating a new one (no ID, like imports)
    if (editingRecipe?.id) {
      result = onUpdateRecipe(editingRecipe.id, recipeData);
    } else {
      result = onAddRecipe(recipeData);
    }

    if (result.success) {
      setShowFormModal(false);
      setEditingRecipe(null);
    } else {
      return result.errors || null;
    }
    return null;
  };

  const handleFormClose = (): void => {
    setShowFormModal(false);
    setEditingRecipe(null);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
  };

  const handleImportClick = (): void => {
    setShowImportModal(true);
  };

  const handleUrlImport = async (url: string): Promise<void> => {
    const result = await parseRecipeFromUrl(url);
    if (result.success && result.recipe) {
      setEditingRecipe(result.recipe as Recipe);
      setShowImportModal(false);
      setShowFormModal(true);
    } else {
      throw new Error(result.errors?.join(', ') || 'Import failed');
    }
  };

  const handleImportClose = (): void => {
    setShowImportModal(false);
  };

  const customCount = recipes.filter(r => isCustomRecipe(r)).length;
  const defaultCount = recipes.filter(r => !isCustomRecipe(r)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recipe Library</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {recipes.length} recipes ({defaultCount} default, {customCount} custom)
          </p>
        </div>
        <div className="flex gap-3">
          {import.meta.env.VITE_PROXY_URL && (
            <button
              onClick={handleImportClick}
              className="inline-flex items-center px-4 py-2.5 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Import from URL
            </button>
          )}
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Recipe
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search recipes by name, ingredient, tag..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
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
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 overflow-hidden">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('default')}
            className={`px-4 py-2.5 text-sm font-medium border-l border-gray-300 dark:border-gray-600 transition-colors ${
              filterType === 'default'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Default
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-4 py-2.5 text-sm font-medium border-l border-gray-300 dark:border-gray-600 transition-colors ${
              filterType === 'custom'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      <RecipeList
        recipes={filteredRecipes}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        isCustomRecipe={isCustomRecipe}
      />

      {filteredRecipes.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No recipes found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm
              ? `No recipes match "${searchTerm}"`
              : filterType === 'custom'
              ? 'You haven\'t created any custom recipes yet'
              : 'No recipes available'}
          </p>
          {!searchTerm && filterType === 'custom' && (
            <button
              onClick={handleAddNew}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create your first recipe
            </button>
          )}
        </div>
      )}

      {showFormModal && (
        <RecipeFormModal
          recipe={editingRecipe}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}

      {showImportModal && (
        <ImportUrlModal
          onImport={handleUrlImport}
          onClose={handleImportClose}
        />
      )}

      <RecipeDetailModal
        recipe={viewingRecipe}
        onClose={handleViewClose}
        onEdit={handleViewEdit}
        isCustomRecipe={isCustomRecipe}
      />
    </div>
  );
};

export default ManageRecipes;
