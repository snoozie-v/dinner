// src/components/recipes/ManageRecipes.tsx
import { useState, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import type { Recipe, RecipeOperationResult, FilterType } from '../../types';
import RecipeList from './RecipeList';
import RecipeFormModal from './RecipeFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ManageRecipesProps {
  recipes: Recipe[];
  onAddRecipe: (recipeData: Partial<Recipe>) => RecipeOperationResult;
  onUpdateRecipe: (recipeId: string, updates: Partial<Recipe>) => RecipeOperationResult;
  onDeleteRecipe: (recipeId: string) => RecipeOperationResult;
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
  const [deleteTarget, setDeleteTarget] = useState<Recipe | null>(null);

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

  const handleEdit = (recipe: Recipe): void => {
    setEditingRecipe(recipe);
    setShowFormModal(true);
  };

  const handleDelete = (recipe: Recipe): void => {
    setDeleteTarget(recipe);
  };

  const handleDuplicate = (recipe: Recipe): void => {
    onDuplicateRecipe(recipe.id);
  };

  const handleFormSubmit = (recipeData: Partial<Recipe>): string[] | null => {
    let result: RecipeOperationResult;
    if (editingRecipe) {
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

  const handleDeleteConfirm = (): void => {
    if (deleteTarget) {
      onDeleteRecipe(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = (): void => {
    setDeleteTarget(null);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
  };

  const customCount = recipes.filter(r => isCustomRecipe(r)).length;
  const defaultCount = recipes.filter(r => !isCustomRecipe(r)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recipe Library</h2>
          <p className="text-sm text-gray-600 mt-1">
            {recipes.length} recipes ({defaultCount} default, {customCount} custom)
          </p>
        </div>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search recipes by name, ingredient, tag..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex rounded-lg border border-gray-300 bg-white overflow-hidden">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('default')}
            className={`px-4 py-2.5 text-sm font-medium border-l border-gray-300 transition-colors ${
              filterType === 'default'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Default
          </button>
          <button
            onClick={() => setFilterType('custom')}
            className={`px-4 py-2.5 text-sm font-medium border-l border-gray-300 transition-colors ${
              filterType === 'custom'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      <RecipeList
        recipes={filteredRecipes}
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No recipes found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? `No recipes match "${searchTerm}"`
              : filterType === 'custom'
              ? 'You haven\'t created any custom recipes yet'
              : 'No recipes available'}
          </p>
          {!searchTerm && filterType === 'custom' && (
            <button
              onClick={handleAddNew}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
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

      {deleteTarget && (
        <DeleteConfirmModal
          recipe={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
};

export default ManageRecipes;
