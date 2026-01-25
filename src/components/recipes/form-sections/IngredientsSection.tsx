// src/components/recipes/form-sections/IngredientsSection.tsx
import { useState, type ChangeEvent } from 'react';
import type { FormSectionProps } from '../RecipeForm';
import type { Ingredient } from '../../../types';
import {
  createBlankIngredient,
  INGREDIENT_CATEGORIES,
  parseFraction,
  formatQuantity,
  parseIngredientLines,
} from '../../../utils/recipeValidation';

const IngredientsSection = ({ data, onChange }: FormSectionProps) => {
  const ingredients = data.ingredients || [];
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [bulkText, setBulkText] = useState('');

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

  // Handle quantity input - supports fractions like "1/2" or "1 1/2"
  const handleQuantityChange = (index: number, value: string): void => {
    // Store the parsed value, allowing fractions
    const parsed = parseFraction(value);
    updateIngredient(index, 'quantity', parsed);
  };

  // Process bulk ingredient paste
  const handleBulkAdd = (): void => {
    const parsed = parseIngredientLines(bulkText);
    if (parsed.length > 0) {
      onChange({ ingredients: [...ingredients, ...parsed] });
      setBulkText('');
      setShowBulkEntry(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Ingredients</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Add ingredients one at a time, or paste multiple ingredients at once.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-6">
          Tip: Quantities support fractions (1/2, 1 1/4) and ranges (2-3). For ranges, the average is used for scaling.
        </p>
      </div>

      {/* Bulk Entry Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowBulkEntry(!showBulkEntry)}
          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
            showBulkEntry
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Paste Multiple Ingredients
          </span>
        </button>
      </div>

      {/* Bulk Entry Panel */}
      {showBulkEntry && (
        <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Paste your ingredients (one per line)
            </label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Example:\n2 cups all-purpose flour\n1/2 tsp salt\n1 lb chicken breast, diced\n3-4 cloves garlic, minced\n1 can (14 oz) diced tomatoes`}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBulkAdd}
              disabled={!bulkText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Ingredients
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBulkEntry(false);
                setBulkText('');
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The parser will try to extract quantities, units, ingredient names, and preparation notes automatically.
            You can edit each ingredient after adding.
          </p>
        </div>
      )}

      {/* Ingredients List */}
      <div className="space-y-4">
        {ingredients.map((ingredient, index) => (
          <div
            key={index}
            className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ingredient.name || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'name', e.target.value)}
                  placeholder="e.g., chicken breast"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-100 dark:placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Quantity - Now supports fractions */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Quantity
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatQuantity(ingredient.quantity)}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleQuantityChange(index, e.target.value)}
                  placeholder="1/2, 2, 2-3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-100 dark:placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={ingredient.unit || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'unit', e.target.value)}
                  placeholder="cup, lb, tsp"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-100 dark:placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Preparation */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Preparation
                </label>
                <input
                  type="text"
                  value={ingredient.preparation || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => updateIngredient(index, 'preparation', e.target.value)}
                  placeholder="e.g., diced, melted"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-100 dark:placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Category
                </label>
                <select
                  value={ingredient.category || 'other'}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => updateIngredient(index, 'category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Optional</span>
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
        className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Ingredient
      </button>

      {ingredients.length === 0 && !showBulkEntry && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
          No ingredients added yet. Click "Add Ingredient" or "Paste Multiple Ingredients" to get started.
        </p>
      )}
    </div>
  );
};

export default IngredientsSection;
