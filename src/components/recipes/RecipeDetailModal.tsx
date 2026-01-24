// src/components/recipes/RecipeDetailModal.tsx
import type { Recipe } from '../../types';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onEdit?: (recipe: Recipe) => void;
  isCustomRecipe: (recipe: Recipe | null | undefined) => boolean;
}

const RecipeDetailModal = ({ recipe, onClose, onEdit, isCustomRecipe }: RecipeDetailModalProps) => {
  if (!recipe) return null;

  const formatTime = (time?: string): string => {
    if (!time) return '—';
    // Convert PT30M to "30 min", PT1H to "1 hour", etc.
    const match = time.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return time;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;

    const parts = [];
    if (hours > 0) parts.push(`${hours} hr`);
    if (minutes > 0) parts.push(`${minutes} min`);
    return parts.join(' ') || '—';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden">
          {/* Header */}
          <div className="relative">
            {recipe.imageUrl && (
              <div className="w-full h-64 sm:h-80 overflow-hidden bg-gray-200 dark:bg-gray-700">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Title and badges */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {recipe.name}
                </h2>
                {isCustomRecipe(recipe) && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 flex-shrink-0">
                    Custom
                  </span>
                )}
              </div>

              {recipe.description && (
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {recipe.description}
                </p>
              )}
            </div>

            {/* Meta information */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Servings</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {recipe.servings?.default || '?'} {recipe.servings?.unit || 'servings'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Prep Time</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatTime(recipe.prepTime)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cook Time</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatTime(recipe.cookTime)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Time</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatTime(recipe.totalTime)}
                </div>
              </div>
            </div>

            {/* Author and Source */}
            {(recipe.author || recipe.sourceUrl) && (
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                {recipe.author && (
                  <div className="mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">By: </span>
                    <span className="text-gray-900 dark:text-gray-100">{recipe.author}</span>
                  </div>
                )}
                {recipe.sourceUrl && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Source: </span>
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {new URL(recipe.sourceUrl).hostname.replace('www.', '')}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {(recipe.tags?.length || recipe.cuisine || recipe.difficulty) && (
              <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-2">
                  {recipe.cuisine && (
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm">
                      {recipe.cuisine}
                    </span>
                  )}
                  {recipe.difficulty && (
                    <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full text-sm">
                      {recipe.difficulty}
                    </span>
                  )}
                  {recipe.tags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Ingredients
                </h3>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, idx) => (
                    <li
                      key={idx}
                      className="flex items-start text-gray-700 dark:text-gray-300"
                    >
                      <span className="mr-3 text-blue-600 dark:text-blue-400 flex-shrink-0">•</span>
                      <span>
                        {ingredient.quantity && ingredient.quantity > 0 && (
                          <span className="font-medium">
                            {ingredient.quantity} {ingredient.unit}{' '}
                          </span>
                        )}
                        <span>{ingredient.name}</span>
                        {ingredient.preparation && (
                          <span className="text-gray-500 dark:text-gray-400">
                            , {ingredient.preparation}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions */}
            {recipe.instructions && recipe.instructions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Instructions
                </h3>
                {recipe.instructions.map((section, sectionIdx) => (
                  <div key={sectionIdx} className="mb-6 last:mb-0">
                    {section.section && section.section !== 'Instructions' && (
                      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                        {section.section}
                      </h4>
                    )}
                    <ol className="space-y-3">
                      {section.steps.map((step, stepIdx) => (
                        <li
                          key={stepIdx}
                          className="flex items-start text-gray-700 dark:text-gray-300"
                        >
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white text-sm flex items-center justify-center mr-3 mt-0.5">
                            {stepIdx + 1}
                          </span>
                          <span className="flex-1">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}

            {/* Nutrition */}
            {recipe.nutrition && (
              <div className="mb-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Nutrition (per serving)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Calories</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {recipe.nutrition.calories}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Protein</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {recipe.nutrition.protein_g}g
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Carbs</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {recipe.nutrition.carbs_g}g
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Fat</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {recipe.nutrition.fat_g}g
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Fiber</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {recipe.nutrition.fiber_g}g
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {recipe.notes && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
                  Notes
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-wrap">
                  {recipe.notes}
                </p>
              </div>
            )}

            {/* Equipment */}
            {recipe.equipment && recipe.equipment.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Equipment Needed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.equipment.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 sm:px-8 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
            >
              Close
            </button>
            {onEdit && isCustomRecipe(recipe) && (
              <button
                onClick={() => onEdit(recipe)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Edit Recipe
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailModal;
