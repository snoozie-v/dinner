// src/components/PantryModal.tsx
import { useState } from 'react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Pantry Staples</h2>
            <p className="text-sm text-gray-500">Items you always have on hand</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Add new staple */}
          <form onSubmit={handleSubmit} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Custom Staple
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Item name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="Unit"
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </form>

          {/* Quick add suggestions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Add Common Items
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_STAPLES.filter(s => !stapleKeys.has(`${s.name}|${s.unit}`)).map((staple) => (
                <button
                  key={`${staple.name}|${staple.unit}`}
                  onClick={() => handleAddSuggestion(staple.name, staple.unit)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  + {staple.name}
                </button>
              ))}
            </div>
          </div>

          {/* Current staples */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Pantry Staples ({pantryStaples.length})
            </label>
            {pantryStaples.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                No pantry staples added yet. Items added here will be automatically marked as "collected" in your shopping list.
              </p>
            ) : (
              <div className="space-y-2">
                {pantryStaples.map((staple) => (
                  <div
                    key={staple.key}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{staple.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({staple.unit})</span>
                    </div>
                    <button
                      onClick={() => onRemoveStaple(staple.key)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PantryModal;
