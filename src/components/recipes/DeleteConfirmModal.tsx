// src/components/recipes/DeleteConfirmModal.tsx
import type { Recipe } from '../../types';

interface DeleteConfirmModalProps {
  recipe: Recipe;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal = ({ recipe, onConfirm, onCancel }: DeleteConfirmModalProps) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Delete Recipe</h2>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">"{recipe.name}"</span>?
              </p>
              <p className="mt-2 text-sm text-gray-500">
                This action cannot be undone. The recipe will be permanently removed from your library.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Recipe
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
