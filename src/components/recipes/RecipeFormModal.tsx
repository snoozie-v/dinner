// src/components/recipes/RecipeFormModal.tsx
import { useEffect } from 'react';
import type { Recipe } from '../../types';
import RecipeForm from './RecipeForm';

interface RecipeFormModalProps {
  recipe: Recipe | null;
  onSubmit: (recipeData: Partial<Recipe>) => string[] | null;
  onClose: () => void;
}

const RecipeFormModal = ({ recipe, onSubmit, onClose }: RecipeFormModalProps) => {
  // Scroll to top when modal opens
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-4 sm:pt-8 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full flex flex-col mb-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {recipe ? 'Edit Recipe' : 'Add New Recipe'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <RecipeForm
            initialData={recipe}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default RecipeFormModal;
