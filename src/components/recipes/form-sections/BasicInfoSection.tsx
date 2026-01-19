// src/components/recipes/form-sections/BasicInfoSection.tsx
import type { ChangeEvent } from 'react';
import type { FormSectionProps } from '../RecipeForm';
import type { Recipe } from '../../../types';

const BasicInfoSection = ({ data, onChange }: FormSectionProps) => {
  const handleChange = (field: keyof Recipe) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({ [field]: e.target.value });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <p className="text-sm text-gray-600 mb-6">
          Enter the essential details about your recipe. Only the name is required.
        </p>
      </div>

      {/* Recipe Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Recipe Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={data.name || ''}
          onChange={handleChange('name')}
          placeholder="e.g., Grandma's Chicken Pot Pie"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={data.description || ''}
          onChange={handleChange('description')}
          placeholder="A brief description of your recipe..."
          rows={3}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Author */}
      <div>
        <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
          Author / Source
        </label>
        <input
          type="text"
          id="author"
          value={data.author || ''}
          onChange={handleChange('author')}
          placeholder="e.g., Family recipe, Adapted from Food Network"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Source URL */}
      <div>
        <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-1">
          Source URL
        </label>
        <input
          type="url"
          id="sourceUrl"
          value={data.sourceUrl || ''}
          onChange={handleChange('sourceUrl')}
          placeholder="https://example.com/recipe"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">Link to the original recipe if applicable</p>
      </div>
    </div>
  );
};

export default BasicInfoSection;
