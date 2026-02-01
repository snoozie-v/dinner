// src/components/AddPrepTaskModal.tsx
import { useState, useEffect } from 'react';
import type { PlanItem } from '../types';
import { MEAL_TYPES } from '../types';

interface AddPrepTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  plannedMeals: PlanItem[];
  onAddTask: (planItemId: string, description: string, daysBeforeMeal: number) => void;
}

const TIMING_OPTIONS = [
  { value: 0, label: 'Same day' },
  { value: 1, label: '1 day before' },
  { value: 2, label: '2 days before' },
  { value: 3, label: '3 days before' },
];

const AddPrepTaskModal = ({ isOpen, onClose, plannedMeals, onAddTask }: AddPrepTaskModalProps) => {
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [daysBeforeMeal, setDaysBeforeMeal] = useState(0);

  // Reset form when modal opens and scroll to top
  useEffect(() => {
    if (isOpen) {
      setSelectedMealId(plannedMeals[0]?.id || '');
      setDescription('');
      setDaysBeforeMeal(0);
      window.scrollTo(0, 0);
    }
  }, [isOpen, plannedMeals]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMealId || !description.trim()) return;

    onAddTask(selectedMealId, description.trim(), daysBeforeMeal);
    onClose();
  };

  const selectedMeal = plannedMeals.find(m => m.id === selectedMealId);
  const mealTypeConfig = selectedMeal
    ? MEAL_TYPES.find(mt => mt.id === selectedMeal.mealType)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Add Prep Task
          </h2>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-manipulation"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Meal Selector */}
          <div>
            <label
              htmlFor="meal-select"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              For which meal?
            </label>
            <select
              id="meal-select"
              value={selectedMealId}
              onChange={(e) => setSelectedMealId(e.target.value)}
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {plannedMeals.map((meal) => {
                const mt = MEAL_TYPES.find(m => m.id === meal.mealType);
                return (
                  <option key={meal.id} value={meal.id}>
                    Day {meal.day} {mt?.label || meal.mealType}: {meal.recipe?.name || 'Unknown'}
                  </option>
                );
              })}
            </select>
            {selectedMeal && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {mealTypeConfig?.icon} {selectedMeal.recipe?.name}
              </p>
            )}
          </div>

          {/* Task Description */}
          <div>
            <label
              htmlFor="task-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              What needs to be done?
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Marinate the chicken, Soak beans, Prep vegetables..."
              rows={3}
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          {/* Timing Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              When should this be done?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIMING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDaysBeforeMeal(option.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                    daysBeforeMeal === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {selectedMeal && daysBeforeMeal > 0 && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Do this on Day {Math.max(1, selectedMeal.day - daysBeforeMeal)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedMealId || !description.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPrepTaskModal;
