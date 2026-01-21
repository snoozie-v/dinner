// src/components/recipes/form-sections/TimingSection.tsx
import type { ChangeEvent } from 'react';
import type { FormSectionProps } from '../RecipeForm';
import {
  parseDurationToMinutes,
  minutesToDuration,
  DIFFICULTY_OPTIONS
} from '../../../utils/recipeValidation';

const TimingSection = ({ data, onChange }: FormSectionProps) => {
  const handleTimeChange = (field: 'prepTime' | 'cookTime' | 'totalTime') => (e: ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10) || 0;
    onChange({ [field]: minutesToDuration(minutes) });
  };

  const handleDifficultyChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    onChange({ difficulty: e.target.value as 'easy' | 'medium' | 'hard' });
  };

  const handleServingsChange = (field: 'default' | 'unit') => (e: ChangeEvent<HTMLInputElement>): void => {
    const value = field === 'default'
      ? parseInt(e.target.value, 10) || 1
      : e.target.value;

    onChange({
      servings: {
        default: data.servings?.default ?? 4,
        unit: data.servings?.unit ?? 'servings',
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Timing & Difficulty</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Set the preparation and cooking times, difficulty level, and serving information.
        </p>
      </div>

      {/* Time Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prep Time (minutes)
          </label>
          <input
            type="number"
            id="prepTime"
            min="0"
            value={parseDurationToMinutes(data.prepTime) || ''}
            onChange={handleTimeChange('prepTime')}
            placeholder="15"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="cookTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cook Time (minutes)
          </label>
          <input
            type="number"
            id="cookTime"
            min="0"
            value={parseDurationToMinutes(data.cookTime) || ''}
            onChange={handleTimeChange('cookTime')}
            placeholder="30"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="totalTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Total Time (minutes)
          </label>
          <input
            type="number"
            id="totalTime"
            min="0"
            value={parseDurationToMinutes(data.totalTime) || ''}
            onChange={handleTimeChange('totalTime')}
            placeholder="45"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Total may include rest time</p>
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Difficulty Level
        </label>
        <select
          id="difficulty"
          value={data.difficulty || 'easy'}
          onChange={handleDifficultyChange}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {DIFFICULTY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Servings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="servingsDefault" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Number of Servings
          </label>
          <input
            type="number"
            id="servingsDefault"
            min="1"
            value={data.servings?.default || ''}
            onChange={handleServingsChange('default')}
            placeholder="4"
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="servingsUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Serving Unit
          </label>
          <input
            type="text"
            id="servingsUnit"
            value={data.servings?.unit || ''}
            onChange={handleServingsChange('unit')}
            placeholder="servings, portions, tacos, etc."
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default TimingSection;
