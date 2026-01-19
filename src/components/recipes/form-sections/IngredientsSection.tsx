// src/components/recipes/form-sections/IngredientsSection.tsx
import type { ChangeEvent } from 'react';
import type { FormSectionProps } from '../RecipeForm';
import type { Ingredient } from '../../../types';
import { createBlankIngredient, INGREDIENT_CATEGORIES } from '../../../utils/recipeValidation';

const IngredientsSection = ({ data, onChange }: FormSectionProps) => {
  const ingredients = data.ingredients || [];

  const addIngredient = (): void => {
    onChange({ ingredients: [...ingredients, createBlankIngredient()] });
  };

  const removeIngredient = (index: number): void => {
    onChange({ ingredients: ingredients.filter((_, i) => i !== index) });
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number | boolean | null): void => {
    const updated = ingredients.map((ing, i) => {
      if (i !== index) return ing;
      return { ...ing, [field]: value };
    });
    onChange({ ingredients: updated });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ingredients</h3>
        <p className="text-sm text-gray-600 mb-6">
          Add all the ingredients needed for this recipe. Include quantities, units, and any preparation notes.
        </p>
      </div>

      {/* Ingredients List */}
      <div className="space-y-4">
        {ingredients.map((ingredient, index) => (
          <div
            key={index}
            className="p-4 border border-gray-200 rounded-lg bg-gray-50"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm font-medium text-gray-700">
                Ingredient {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Ingredient Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ingredient.name || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'name', e.target.value)}
                  placeholder="e.g., chicken breast"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={ingredient.quantity ?? ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'quantity', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={ingredient.unit || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'unit', e.target.value)}
                  placeholder="lb, cup, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Preparation */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Preparation
                </label>
                <input
                  type="text"
                  value={ingredient.preparation || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'preparation', e.target.value)}
                  placeholder="e.g., diced, melted"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Category
                </label>
                <select
                  value={ingredient.category || 'other'}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => updateIngredient(index, 'category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {INGREDIENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Optional */}
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ingredient.optional || false}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'optional', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Optional</span>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={addIngredient}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Ingredient
      </button>

      {ingredients.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">
          No ingredients added yet. Click the button above to add your first ingredient.
        </p>
      )}
    </div>
  );
};

export default IngredientsSection;
