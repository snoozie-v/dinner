// src/components/PantryModal.tsx
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { PantryStaple } from '../types';

interface PantryModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantryStaples: PantryStaple[];
  onAddStaple: (name: string, unit: string) => void;
  onRemoveStaple: (key: string) => void;
}

// Common pantry staples suggestions
const COMMON_STAPLES = [
  { name: 'salt', unit: 'tsp' },
  { name: 'black pepper', unit: 'tsp' },
  { name: 'olive oil', unit: 'tbsp' },
  { name: 'vegetable oil', unit: 'tbsp' },
  { name: 'butter', unit: 'tbsp' },
  { name: 'garlic', unit: 'cloves' },
  { name: 'onion', unit: 'unit' },
  { name: 'sugar', unit: 'tbsp' },
  { name: 'flour', unit: 'cup' },
  { name: 'eggs', unit: 'unit' },
  { name: 'milk', unit: 'cup' },
  { name: 'soy sauce', unit: 'tbsp' },
  { name: 'chicken broth', unit: 'cup' },
];

const PantryModal = ({
  isOpen,
  onClose,
  pantryStaples,
  onAddStaple,
  onRemoveStaple,
}: PantryModalProps) => {
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('unit');

  useEffect(() => {
    if (isOpen) {
      window.scrollTo(0, 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddStaple(newName.trim(), newUnit);
      setNewName('');
      setNewUnit('unit');
    }
  };

  const handleAddSuggestion = (name: string, unit: string) => {
    onAddStaple(name, unit);
  };

  const stapleKeys = new Set(pantryStaples.map(s => s.key));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-4 sm:pt-8 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full flex flex-col mb-8">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pantry Staples</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Items you always have on hand</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Add new staple */}
          <form onSubmit={handleSubmit} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Custom Staple
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Item name"
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="Unit"
                className="w-full sm:w-24 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation min-h-[44px] font-medium"
              >
                Add
              </button>
            </div>
          </form>

          {/* Quick add suggestions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Add Common Items
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_STAPLES.filter(s => !stapleKeys.has(`${s.name}|${s.unit}`)).map((staple) => (
                <button
                  key={`${staple.name}|${staple.unit}`}
                  onClick={() => handleAddSuggestion(staple.name, staple.unit)}
                  className="px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 active:bg-gray-300 dark:active:bg-gray-500 transition-colors touch-manipulation min-h-[44px]"
                >
                  + {staple.name}
                </button>
              ))}
            </div>
          </div>

          {/* Current staples */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Pantry Staples ({pantryStaples.length})
            </label>
            {pantryStaples.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                No pantry staples added yet. Items added here will be automatically marked as "collected" in your shopping list.
              </p>
            ) : (
              <div className="space-y-2">
                {pantryStaples.map((staple) => (
                  <div
                    key={staple.key}
                    className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800"
                  >
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{staple.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({staple.unit})</span>
                    </div>
                    <button
                      onClick={() => onRemoveStaple(staple.key)}
                      className="px-4 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50 rounded-lg text-sm font-medium transition-colors touch-manipulation min-h-[44px]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 active:bg-gray-400 dark:active:bg-gray-400 transition-colors font-medium touch-manipulation min-h-[44px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PantryModal;
