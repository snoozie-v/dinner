// src/components/MealSlot.tsx
import { useState } from 'react';
import type { PlanItem as PlanItemType, Recipe, MealType } from '../types';
import { MEAL_TYPES, PREDEFINED_THEMES } from '../types';

interface MealSlotProps {
  planItem: PlanItemType;
  onSelectRecipe: (day: number, mealType: MealType) => void;
  updateServings: (planItemId: string, multiplier: number) => void;
  updateNotes: (planItemId: string, notes: string) => void;
  onRemoveRecipe: (day: number, mealType: MealType) => void;
  onViewRecipe: (recipe: Recipe) => void;
  slotTheme?: string | null;
}

const MealSlot = ({
  planItem,
  onSelectRecipe,
  updateServings,
  updateNotes,
  onRemoveRecipe,
  onViewRecipe,
  slotTheme,
}: MealSlotProps) => {
  const { recipe, servingsMultiplier = 1, day, mealType, id, notes = '' } = planItem;
  const themeConfig = slotTheme ? PREDEFINED_THEMES.find(t => t.id === slotTheme) : null;
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(notes);

  const mealTypeConfig = MEAL_TYPES.find(mt => mt.id === mealType);
  const mealLabel = mealTypeConfig?.label || mealType;
  const mealIcon = mealTypeConfig?.icon || '🍽️';

  const handleSaveNotes = () => {
    updateNotes(id, notesDraft);
    setIsEditingNotes(false);
  };

  const handleCancelNotes = () => {
    setNotesDraft(notes);
    setIsEditingNotes(false);
  };

  // Calculate actual servings
  const baseServings = recipe?.servings?.default || 4;
  const actualServings = baseServings * servingsMultiplier;

  // Empty slot
  if (!recipe) {
    return (
      <div className="flex items-center gap-3 py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <span className="text-xl" title={mealLabel}>{mealIcon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{mealLabel}</span>
            {themeConfig && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                {themeConfig.icon} {themeConfig.label}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onSelectRecipe(day, mealType)}
          className="px-4 py-2.5 text-sm bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition touch-manipulation min-h-[44px]"
        >
          + Add
        </button>
      </div>
    );
  }

  // Filled slot
  return (
    <div className="py-3 px-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5" title={mealLabel}>{mealIcon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {mealLabel}
            </span>
            {themeConfig && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                {themeConfig.icon} {themeConfig.label}
              </span>
            )}
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 sm:truncate">
            {recipe.name}
          </h4>

          {/* Time info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-3">
            {recipe.totalTime && (
              <span>{recipe.totalTime.replace('PT', '').replace('M', ' min')}</span>
            )}
            {recipe.difficulty && <span>{recipe.difficulty}</span>}
          </div>
        </div>

        {/* Action buttons - min 44px tap targets for accessibility */}
        <div className="flex items-center gap-0.5 sm:gap-1 -mr-1">
          <button
            onClick={() => onViewRecipe(recipe)}
            className="p-2.5 sm:p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="View recipe"
          >
            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={() => onSelectRecipe(day, mealType)}
            className="p-2.5 sm:p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Change recipe"
          >
            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button
            onClick={() => onRemoveRecipe(day, mealType)}
            className="p-2.5 sm:p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Remove recipe"
          >
            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Servings row */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-medium">{actualServings}</span>
        </div>
        <div className="flex gap-1">
          {[0.5, 1, 1.5, 2].map((m) => (
            <button
              key={m}
              onClick={() => updateServings(id, m)}
              className={`px-3 py-1.5 text-xs rounded transition touch-manipulation min-h-[32px] ${
                servingsMultiplier === m
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {m}x
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-2">
        {isEditingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Add prep notes..."
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNotes}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Save
              </button>
              <button
                onClick={handleCancelNotes}
                className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : notes ? (
          <button
            onClick={() => setIsEditingNotes(true)}
            className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50 transition text-left w-full"
          >
            <span className="whitespace-pre-wrap">{notes}</span>
          </button>
        ) : (
          <button
            onClick={() => setIsEditingNotes(true)}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition"
          >
            + Add note
          </button>
        )}
      </div>
    </div>
  );
};

export default MealSlot;
