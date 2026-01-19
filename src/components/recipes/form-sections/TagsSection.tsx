// src/components/recipes/form-sections/TagsSection.tsx
import { useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { FormSectionProps } from '../RecipeForm';
import { MEAL_TYPES, DIETARY_OPTIONS, ALLERGEN_OPTIONS } from '../../../utils/recipeValidation';

const TagsSection = ({ data, onChange }: FormSectionProps) => {
  const [tagInput, setTagInput] = useState<string>('');

  // Tags
  const tags = data.tags || [];

  const addTag = (): void => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onChange({ tags: [...tags, tag] });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string): void => {
    onChange({ tags: tags.filter(t => t !== tagToRemove) });
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Cuisine
  const handleCuisineChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange({ cuisine: e.target.value });
  };

  // Meal Types (multi-select)
  const mealTypes = data.mealTypes || [];

  const toggleMealType = (type: string): void => {
    if (mealTypes.includes(type)) {
      onChange({ mealTypes: mealTypes.filter(t => t !== type) });
    } else {
      onChange({ mealTypes: [...mealTypes, type] });
    }
  };

  // Dietary (multi-select)
  const dietary = data.dietary || [];

  const toggleDietary = (option: string): void => {
    if (dietary.includes(option)) {
      onChange({ dietary: dietary.filter(d => d !== option) });
    } else {
      onChange({ dietary: [...dietary, option] });
    }
  };

  // Allergens (multi-select)
  const allergens = data.allergiesToAvoid || [];

  const toggleAllergen = (allergen: string): void => {
    if (allergens.includes(allergen)) {
      onChange({ allergiesToAvoid: allergens.filter(a => a !== allergen) });
    } else {
      onChange({ allergiesToAvoid: [...allergens, allergen] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags & Categories</h3>
        <p className="text-sm text-gray-600 mb-6">
          Add tags and categorize your recipe to make it easier to find later.
        </p>
      </div>

      {/* Custom Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add a tag and press Enter"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Cuisine */}
      <div>
        <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700 mb-2">
          Cuisine
        </label>
        <input
          type="text"
          id="cuisine"
          value={data.cuisine || ''}
          onChange={handleCuisineChange}
          placeholder="e.g., Italian, Mexican, Thai"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Meal Types */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Meal Types
        </label>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => toggleMealType(type)}
              className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                mealTypes.includes(type)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dietary Options
        </label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => toggleDietary(option)}
              className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                dietary.includes(option)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Allergens */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contains Allergens
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Select any allergens present in this recipe
        </p>
        <div className="flex flex-wrap gap-2">
          {ALLERGEN_OPTIONS.map(allergen => (
            <button
              key={allergen}
              type="button"
              onClick={() => toggleAllergen(allergen)}
              className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
                allergens.includes(allergen)
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {allergen}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TagsSection;
