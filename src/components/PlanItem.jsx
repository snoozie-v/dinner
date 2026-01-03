// src/components/PlanItem.jsx
import React, { useState } from 'react'; // Add useState

const PlanItem = ({ planItem, setSelectedDayForPicker, updateServings }) => {
  const { recipe, servingsMultiplier = 1, day, id } = planItem;
  const [isExpanded, setIsExpanded] = useState(false); // New: Collapse state

  const effectiveServings = Math.round((recipe?.servings?.default || 4) * servingsMultiplier);

  if (!recipe) {
    // Placeholder UI
    return (
      <div className="bg-white rounded-xl shadow-md border overflow-hidden">
        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">
            Day {day}: No Recipe Selected
          </h3>
          <button
            onClick={() => setSelectedDayForPicker(day - 1)}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium transition"
          >
            Select Recipe
          </button>
        </div>
        <div className="p-5 text-center text-gray-500">
          Select a recipe to see ingredients and instructions.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border overflow-hidden">
      <div className="p-5 border-b bg-gray-50">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <h3 className="text-xl font-semibold text-gray-900">
              Day {day}: {recipe?.name || 'Recipe missing'}
            </h3>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              {isExpanded ? '▲' : '▼'} {/* Simple arrow icon */}
            </button>
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            <button
              onClick={() => setSelectedDayForPicker(day - 1)}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium transition"
            >
              Change Recipe
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Servings:</span>
              {[0.5, 1, 1.5, 2].map((m) => (
                <button
                  key={m}
                  onClick={() => updateServings(id, m)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition ${
                    servingsMultiplier === m
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  ×{m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
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

      {isExpanded && ( // New: Conditional render for details
        <div className="p-5 grid md:grid-cols-2 gap-8">
          {/* Ingredients */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Ingredients</h4>
            {recipe?.ingredients?.length > 0 ? (
              <ul className="space-y-2 text-gray-700">
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

          {/* Instructions */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Instructions</h4>
            {recipe?.instructions?.length > 0 ? (
              <div className="space-y-5">
                {recipe.instructions.map((section, sIdx) => (
                  <div key={sIdx}>
                    {section.section && (
                      <h5 className="font-medium text-gray-700 mb-2">{section.section}</h5>
                    )}
                    <ol className="list-decimal pl-5 space-y-1.5 text-gray-700">
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
