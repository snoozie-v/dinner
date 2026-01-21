// src/components/PlanItem.tsx
import { useState } from 'react';
import type { PlanItem as PlanItemType } from '../types';

interface PlanItemProps {
  planItem: PlanItemType;
  setSelectedDayForPicker: (day: number | null) => void;
  updateServings: (planItemId: string, multiplier: number) => void;
  onRemoveRecipe: (dayIndex: number) => void;
}

const PlanItem = ({ planItem, setSelectedDayForPicker, updateServings, onRemoveRecipe }: PlanItemProps) => {
  const { recipe, servingsMultiplier = 1, day, id } = planItem;
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Calculate actual servings based on recipe default and multiplier
  const baseServings = recipe?.servings?.default || 4;
  const servingUnit = recipe?.servings?.unit || 'servings';
  const actualServings = baseServings * servingsMultiplier;

  if (!recipe) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700 overflow-hidden">
        <div className="p-4 sm:p-5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
            Day {day}: No Recipe Selected
          </h3>
          <button
            onClick={() => setSelectedDayForPicker(day - 1)}
            className="w-full sm:w-auto px-5 py-3 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800 active:bg-indigo-200 dark:active:bg-indigo-700 text-sm font-medium transition touch-manipulation min-h-[44px]"
          >
            Select Recipe
          </button>
        </div>
        <div className="p-5 text-center text-gray-500 dark:text-gray-400">
          Select a recipe to see ingredients and instructions.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700 overflow-hidden">
      <div className="p-4 sm:p-5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1">
              Day {day}: {recipe?.name || 'Recipe missing'}
            </h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDayForPicker(day - 1)}
                className="flex-1 sm:flex-none px-4 py-3 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800 active:bg-indigo-200 dark:active:bg-indigo-700 text-sm font-medium transition touch-manipulation min-h-[44px]"
              >
                Change Recipe
              </button>
              <button
                onClick={() => onRemoveRecipe(day - 1)}
                className="p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50 rounded-lg transition touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Remove recipe"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/40 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {actualServings} {servingUnit}
                </span>
              </div>
              <div className="flex gap-1">
                {[0.5, 1, 1.5, 2].map((m) => {
                  const resultingServings = baseServings * m;
                  return (
                    <button
                      key={m}
                      onClick={() => updateServings(id, m)}
                      title={`${resultingServings} ${servingUnit}`}
                      className={`px-3 py-2.5 text-sm rounded-md border transition touch-manipulation min-w-[44px] min-h-[44px] flex flex-col items-center justify-center leading-tight ${
                        servingsMultiplier === m
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500'
                      }`}
                    >
                      <span className="text-xs opacity-75">×{m}</span>
                      <span className="font-medium">{resultingServings}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex flex-wrap gap-x-6 gap-y-1">
          {recipe?.prepTime && (
            <div>Prep: {recipe.prepTime.replace('PT', '').replace('M', ' min')}</div>
          )}
          {recipe?.cookTime && (
            <div>Cook: {recipe.cookTime.replace('PT', '').replace('M', ' min')}</div>
          )}
          {recipe?.totalTime && (
            <div>Total: {recipe.totalTime.replace('PT', '').replace('M', ' min')}</div>
          )}
          {recipe?.difficulty && <div>Difficulty: {recipe.difficulty}</div>}
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Ingredients</h4>
            {recipe?.ingredients && recipe.ingredients.length > 0 ? (
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                {recipe.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>
                      <strong>
                        {(ing.quantity || 0) * servingsMultiplier} {ing.unit || ''}
                      </strong>{' '}
                      {ing.name}
                      {ing.preparation && ` (${ing.preparation})`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 italic">No ingredients listed</p>
            )}
          </div>

          <div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Instructions</h4>
            {recipe?.instructions && recipe.instructions.length > 0 ? (
              <div className="space-y-5">
                {recipe.instructions.map((section, sIdx) => (
                  <div key={sIdx}>
                    {section.section && (
                      <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{section.section}</h5>
                    )}
                    <ol className="list-decimal pl-5 space-y-1.5 text-gray-700 dark:text-gray-300">
                      {section.steps.map((step, stepIdx) => (
                        <li key={stepIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">No instructions available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanItem;
