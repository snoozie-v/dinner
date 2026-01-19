// src/components/recipes/RecipeCard.tsx
import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { Recipe } from '../../types';
import { formatDuration } from '../../utils/recipeValidation';

interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onDuplicate: (recipe: Recipe) => void;
  isCustom: boolean;
}

const RecipeCard = ({
  recipe,
  onEdit,
  onDelete,
  onDuplicate,
  isCustom
}: RecipeCardProps) => {
  const [showMenu, setShowMenu] = useState<boolean>(false);

  const handleMenuToggle = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleAction = (action: (recipe: Recipe) => void) => (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setShowMenu(false);
    action(recipe);
  };

  const totalSteps = recipe.instructions?.reduce((acc, section) => acc + (section.steps?.length || 0), 0) || 0;

  return (
    <div className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="absolute top-3 left-3 z-10">
        {isCustom ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            Custom
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            Default
          </span>
        )}
      </div>

      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={handleMenuToggle}
          className="p-1.5 rounded-full bg-white bg-opacity-90 hover:bg-opacity-100 shadow-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              {isCustom ? (
                <>
                  <button
                    onClick={handleAction(onEdit)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={handleAction(onDuplicate)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Duplicate
                  </button>
                  <hr className="my-1 border-gray-200" />
                  <button
                    onClick={handleAction(onDelete)}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleAction(onDuplicate)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Duplicate to Edit
                  </button>
                  <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50">
                    Default recipes are read-only
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="p-4 pt-12">
        <h3 className="font-semibold text-gray-900 mb-1.5 truncate text-lg">
          {recipe.name || 'Unnamed Recipe'}
        </h3>

        {recipe.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {recipe.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-3 text-sm text-gray-600">
          {recipe.servings?.default && (
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {recipe.servings.default} {recipe.servings.unit || 'servings'}
            </span>
          )}
          {recipe.totalTime && (
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDuration(recipe.totalTime)}
            </span>
          )}
          {recipe.difficulty && (
            <span className="inline-flex items-center capitalize">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {recipe.difficulty}
            </span>
          )}
        </div>

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
              >
                {tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="inline-block px-2 py-0.5 text-gray-500 text-xs">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {recipe.ingredients?.length || 0} ingredients
            {totalSteps > 0 && ` • ${totalSteps} steps`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;
