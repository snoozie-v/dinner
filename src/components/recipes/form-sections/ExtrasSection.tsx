// src/components/recipes/form-sections/ExtrasSection.tsx
import { useState } from 'react';
import type { ChangeEvent, KeyboardEvent, SyntheticEvent } from 'react';
import type { FormSectionProps } from '../RecipeForm';

const ExtrasSection = ({ data, onChange }: FormSectionProps) => {
  const [equipmentInput, setEquipmentInput] = useState<string>('');

  // Equipment
  const equipment = data.equipment || [];

  const addEquipment = (): void => {
    const item = equipmentInput.trim();
    if (item && !equipment.includes(item)) {
      onChange({ equipment: [...equipment, item] });
      setEquipmentInput('');
    }
  };

  const removeEquipment = (itemToRemove: string): void => {
    onChange({ equipment: equipment.filter(e => e !== itemToRemove) });
  };

  const handleEquipmentKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEquipment();
    }
  };

  // Notes
  const handleNotesChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    onChange({ notes: e.target.value });
  };

  // Image URL
  const handleImageUrlChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange({ imageUrl: e.target.value });
  };

  // Video URL
  const handleVideoUrlChange = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange({ videoUrl: e.target.value });
  };

  const handleImageError = (e: SyntheticEvent<HTMLImageElement>): void => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Extras</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Add additional details like required equipment, notes, and media links.
        </p>
      </div>

      {/* Equipment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Equipment Needed
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={equipmentInput}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEquipmentInput(e.target.value)}
            onKeyDown={handleEquipmentKeyDown}
            placeholder="e.g., large skillet, mixing bowl"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={addEquipment}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
          >
            Add
          </button>
        </div>
        {equipment.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {equipment.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm rounded-full"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeEquipment(item)}
                  className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recipe Notes
        </label>
        <textarea
          id="notes"
          value={data.notes || ''}
          onChange={handleNotesChange}
          placeholder="Tips, variations, storage instructions, etc."
          rows={4}
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Image URL */}
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Image URL
        </label>
        <input
          type="url"
          id="imageUrl"
          value={data.imageUrl || ''}
          onChange={handleImageUrlChange}
          placeholder="https://example.com/recipe-image.jpg"
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {data.imageUrl && (
          <div className="mt-2">
            <img
              src={data.imageUrl}
              alt="Recipe preview"
              className="max-w-xs h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
              onError={handleImageError}
            />
          </div>
        )}
      </div>

      {/* Video URL */}
      <div>
        <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Video URL
        </label>
        <input
          type="url"
          id="videoUrl"
          value={data.videoUrl || ''}
          onChange={handleVideoUrlChange}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Link to a video tutorial if available</p>
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Recipe Summary</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>Name: {data.name || '(not set)'}</li>
          <li>Ingredients: {data.ingredients?.length || 0}</li>
          <li>Instruction sections: {data.instructions?.length || 0}</li>
          <li>Tags: {data.tags?.length || 0}</li>
          <li>Equipment: {equipment.length}</li>
        </ul>
      </div>
    </div>
  );
};

export default ExtrasSection;
