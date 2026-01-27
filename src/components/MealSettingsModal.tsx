// src/components/MealSettingsModal.tsx
import { useState, useEffect } from 'react';
import type { MealType, MealPlanSettings } from '../types';
import { MEAL_TYPES } from '../types';

interface MealSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MealPlanSettings;
  onSave: (settings: MealPlanSettings) => void;
}

const MealSettingsModal = ({
  isOpen,
  onClose,
  settings,
  onSave,
}: MealSettingsModalProps) => {
  const [enabledMealTypes, setEnabledMealTypes] = useState<MealType[]>(settings.enabledMealTypes);

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEnabledMealTypes(settings.enabledMealTypes);
    }
  }, [isOpen, settings.enabledMealTypes]);

  if (!isOpen) return null;

  const toggleMealType = (mealType: MealType) => {
    setEnabledMealTypes(prev => {
      if (prev.includes(mealType)) {
        // Don't allow disabling all meal types - must have at least one
        if (prev.length <= 1) return prev;
        return prev.filter(mt => mt !== mealType);
      } else {
        return [...prev, mealType];
      }
    });
  };

  const handleSave = () => {
    onSave({ enabledMealTypes });
    onClose();
  };

  const handleCancel = () => {
    setEnabledMealTypes(settings.enabledMealTypes);
    onClose();
  };

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify([...enabledMealTypes].sort()) !==
                     JSON.stringify([...settings.enabledMealTypes].sort());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Meal Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose which meals to plan</p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enable the meal types you want to include in your daily meal plan. At least one meal type must be enabled.
          </p>

          <div className="space-y-3">
            {MEAL_TYPES.map((mealType) => {
              const isEnabled = enabledMealTypes.includes(mealType.id);
              const isLastEnabled = isEnabled && enabledMealTypes.length === 1;

              return (
                <div
                  key={mealType.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isEnabled
                      ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mealType.icon}</span>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {mealType.label}
                      </span>
                      {(mealType.id === 'snack' || mealType.id === 'dessert') && (
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          (optional)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleMealType(mealType.id)}
                    disabled={isLastEnabled}
                    className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      isEnabled
                        ? 'bg-blue-600'
                        : 'bg-gray-300 dark:bg-gray-600'
                    } ${isLastEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={isLastEnabled ? 'At least one meal type must be enabled' : ''}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Info note */}
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Changing meal types will update your current plan. Existing recipes will be preserved for enabled meal types.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              hasChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealSettingsModal;
