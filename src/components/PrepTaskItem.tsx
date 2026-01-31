// src/components/PrepTaskItem.tsx
import type { PrepTask, MealType } from '../types';
import { MEAL_TYPES } from '../types';

interface PrepTaskItemProps {
  task: PrepTask;
  onToggle: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onViewRecipe?: (recipeId: string) => void;
}

const PrepTaskItem = ({ task, onToggle, onDelete, onViewRecipe }: PrepTaskItemProps) => {
  const mealTypeConfig = MEAL_TYPES.find(mt => mt.id === task.mealType);
  const mealLabel = mealTypeConfig?.label || task.mealType;
  const mealIcon = mealTypeConfig?.icon || '';

  const isManual = task.source === 'manual';
  const isCompleted = task.completed;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        isCompleted
          ? 'bg-gray-50 dark:bg-gray-800/50'
          : 'bg-white dark:bg-gray-800'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border-2 transition-colors touch-manipulation"
        style={{
          borderColor: isCompleted ? '#10b981' : '#d1d5db',
          backgroundColor: isCompleted ? '#10b981' : 'transparent',
        }}
        aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {isCompleted && (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Task description */}
        <p
          className={`text-sm font-medium transition-colors ${
            isCompleted
              ? 'text-gray-400 dark:text-gray-500 line-through'
              : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {task.description}
        </p>

        {/* Recipe name and meal info */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {/* Recipe link */}
          <button
            onClick={() => onViewRecipe?.(task.recipeId)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[150px]"
            title={task.recipeName}
          >
            {task.recipeName}
          </button>

          {/* Meal badge */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <span>{mealIcon}</span>
            <span>Day {task.mealDay} {mealLabel}</span>
          </span>

          {/* Source badge */}
          {isManual ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              Manual
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              Auto
            </span>
          )}
        </div>

        {/* Timing info */}
        {task.timing.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {task.timing.daysBeforeMeal > 0 ? (
              <span>Do {task.timing.description}</span>
            ) : task.timing.hoursBeforeMeal ? (
              <span>Start {task.timing.hoursBeforeMeal}h before meal</span>
            ) : null}
          </p>
        )}
      </div>

      {/* Delete button (manual tasks only) */}
      {isManual && onDelete && (
        <button
          onClick={() => onDelete(task.id)}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors touch-manipulation"
          aria-label="Delete task"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default PrepTaskItem;
