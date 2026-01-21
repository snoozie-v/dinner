// src/components/PlanItem.tsx
import { useState } from 'react';
import type { PlanItem as PlanItemType } from '../types';

interface PlanItemProps {
  planItem: PlanItemType;
  setSelectedDayForPicker: (day: number | null) => void;
  updateServings: (planItemId: string, multiplier: number) => void;
}

const PlanItem = ({ planItem, setSelectedDayForPicker, updateServings }: PlanItemProps) => {
  const { recipe, servingsMultiplier = 1, day, id } = planItem;
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!recipe) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700 overflow-hidden">
        <div className="p-5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Day {day}: No Recipe Selected
          </h3>
          <button
            onClick={() => setSelectedDayForPicker(day - 1)}
            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800 text-sm font-medium transition"
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
      <div className="p-5 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Day {day}: {recipe?.name || 'Recipe missing'}
            </h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            <button
              onClick={() => setSelectedDayForPicker(day - 1)}
              className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800 text-sm font-medium transition"
            >
              Change Recipe
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Servings:</span>
              {[0.5, 1, 1.5, 2].map((m) => (
                <button
                  key={m}
                  onClick={() => updateServings(id, m)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition ${
                    servingsMultiplier === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  ×{m}
                </button>
              ))}
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
