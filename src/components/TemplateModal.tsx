// src/components/TemplateModal.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { MealPlanTemplate } from '../types';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MealPlanTemplate[];
  onSaveTemplate: (name: string) => void;
  onLoadTemplate: (template: MealPlanTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  currentPlanHasRecipes: boolean;
}

const TemplateModal = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
  currentPlanHasRecipes,
}: TemplateModalProps) => {
  const [newTemplateName, setNewTemplateName] = useState('');
  const [activeTab, setActiveTab] = useState<'load' | 'save'>('load');

  if (!isOpen) return null;

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (newTemplateName.trim()) {
      onSaveTemplate(newTemplateName.trim());
      setNewTemplateName('');
      setActiveTab('load');
    }
  };

  const handleLoad = (template: MealPlanTemplate) => {
    if (window.confirm(`Load "${template.name}"? This will replace your current meal plan.`)) {
      onLoadTemplate(template);
    }
  };

  const handleDelete = (template: MealPlanTemplate) => {
    onDeleteTemplate(template.id);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Meal Plan Templates</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Save and reuse your meal plans</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('load')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'load'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Load Template ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('save')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'save'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Save Current Plan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'load' ? (
            <>
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No templates saved yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Create a meal plan and save it as a template to reuse later
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{template.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {template.days} days • Created {formatDate(template.createdAt)}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {template.recipes.filter(r => r !== null).length} recipes
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleLoad(template)}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDelete(template)}
                            className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSave}>
              {!currentPlanHasRecipes ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No recipes in current plan</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Add some recipes to your meal plan before saving it as a template
                  </p>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Quick Weeknight Dinners"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!newTemplateName.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    Save as Template
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    This will save your current meal plan so you can load it later
                  </p>
                </>
              )}
            </form>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;
