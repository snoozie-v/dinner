// src/components/DataSettingsModal.tsx
import { useState, useRef, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import type { Recipe, PlanItem, PantryStaple, MealPlanTemplate, UserPreferences, ShoppingAdjustments } from '../types';
import { downloadFile } from '../utils/platform';
import { fixIngredientData } from '../utils/fixIngredientData';

interface ExportData {
  version: number;
  exportedAt: string;
  data: {
    customRecipes: Recipe[];
    days: number;
    plan: PlanItem[];
    shoppingAdjustments: ShoppingAdjustments;
    pantryStaples: PantryStaple[];
    templates: MealPlanTemplate[];
    userPrefs: UserPreferences;
    theme: string;
  };
}

interface DataSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Current data for export
  customRecipes: Recipe[];
  days: number;
  plan: PlanItem[];
  shoppingAdjustments: ShoppingAdjustments;
  pantryStaples: PantryStaple[];
  templates: MealPlanTemplate[];
  userPrefs: UserPreferences;
  theme: string;
  // Setters for import
  onImportData: (data: ExportData, mode: 'overwrite' | 'merge') => void;
  onFixIngredientData: (fixedRecipes: Recipe[], fixedPlan: PlanItem[]) => void;
}

const DataSettingsModal = ({
  isOpen,
  onClose,
  customRecipes,
  days,
  plan,
  shoppingAdjustments,
  pantryStaples,
  templates,
  userPrefs,
  theme,
  onImportData,
  onFixIngredientData,
}: DataSettingsModalProps) => {
  const [importMode, setImportMode] = useState<'overwrite' | 'merge'>('merge');
  const [importPreview, setImportPreview] = useState<ExportData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [fixResult, setFixResult] = useState<{ ingredientsFixed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      window.scrollTo(0, 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    const exportData: ExportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        customRecipes,
        days,
        plan,
        shoppingAdjustments,
        pantryStaples,
        templates,
        userPrefs,
        theme,
      },
    };

    const filename = `meal-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
    const content = JSON.stringify(exportData, null, 2);
    downloadFile(content, filename, 'application/json');
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportPreview(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content) as ExportData;

        // Validate structure
        if (!parsed.version || !parsed.data) {
          throw new Error('Invalid backup file format');
        }

        if (!parsed.data.customRecipes && !parsed.data.templates && !parsed.data.pantryStaples) {
          throw new Error('Backup file contains no recognizable data');
        }

        setImportPreview(parsed);
        setShowImportConfirm(true);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to parse backup file');
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    if (!importPreview) return;

    onImportData(importPreview, importMode);
    setImportPreview(null);
    setShowImportConfirm(false);
    onClose();
  };

  const handleImportCancel = () => {
    setImportPreview(null);
    setShowImportConfirm(false);
    setImportError(null);
  };

  const handleFixIngredientData = () => {
    const { fixedRecipes, fixedPlan, ingredientsFixed } = fixIngredientData(customRecipes, plan);
    onFixIngredientData(fixedRecipes, fixedPlan);
    setFixResult({ ingredientsFixed });
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 pt-4 sm:pt-8 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full mb-8">
        {/* Header */}
        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Data Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Export Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Export Data
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Download a backup of all your data including custom recipes, meal plans, templates, and settings.
            </p>
            <button
              onClick={handleExport}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition font-medium touch-manipulation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Backup
            </button>

            {/* Current data summary */}
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Current data:</p>
              <ul className="space-y-0.5">
                <li>{customRecipes.length} custom recipe{customRecipes.length !== 1 ? 's' : ''}</li>
                <li>{templates.length} saved template{templates.length !== 1 ? 's' : ''}</li>
                <li>{pantryStaples.length} pantry staple{pantryStaples.length !== 1 ? 's' : ''}</li>
                <li>{userPrefs.favoriteRecipeIds.length} favorite{userPrefs.favoriteRecipeIds.length !== 1 ? 's' : ''}</li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Import Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Import Data
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Restore data from a backup file. Choose whether to merge with existing data or replace it entirely.
            </p>

            {/* Import mode selection */}
            <div className="mb-4 space-y-2">
              <label className="flex items-start gap-3 p-3 border dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="mt-0.5 w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Merge</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Add imported items to your existing data. Duplicates will be skipped.
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <input
                  type="radio"
                  name="importMode"
                  value="overwrite"
                  checked={importMode === 'overwrite'}
                  onChange={() => setImportMode('overwrite')}
                  className="mt-0.5 w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Overwrite</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Replace all existing data with the imported backup.
                  </div>
                </div>
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 active:bg-gray-800 transition font-medium touch-manipulation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Select Backup File
            </button>

            {importError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {importError}
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Fix Ingredient Data Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Fix Ingredient Data
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Some recipe importers write the quantity and unit into the ingredient name instead of the correct fields (e.g. <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">1/2 teaspoon black pepper</span> as the name with no quantity). This scans your recipe library and meal plan and fixes those ingredients in place.
            </p>
            <button
              onClick={handleFixIngredientData}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 active:bg-amber-800 transition font-medium touch-manipulation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Scan & Fix Ingredients
            </button>
            {fixResult && (
              fixResult.ingredientsFixed > 0 ? (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
                  Fixed {fixResult.ingredientsFixed} ingredient{fixResult.ingredientsFixed !== 1 ? 's' : ''} across your recipe library and meal plan.
                </div>
              ) : (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                  No issues found — all ingredient data looks correct.
                </div>
              )
            )}
          </div>
        </div>

        {/* Import Confirmation Modal */}
        {showImportConfirm && importPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-start justify-center p-4 pt-20 sm:pt-32 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mb-8">
              <div className="p-5 border-b dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Confirm Import
                </h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Backup from: <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(importPreview.exportedAt)}</span>
                </p>

                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">This backup contains:</p>
                  <ul className="space-y-0.5">
                    <li>{importPreview.data.customRecipes?.length || 0} custom recipe{(importPreview.data.customRecipes?.length || 0) !== 1 ? 's' : ''}</li>
                    <li>{importPreview.data.templates?.length || 0} template{(importPreview.data.templates?.length || 0) !== 1 ? 's' : ''}</li>
                    <li>{importPreview.data.pantryStaples?.length || 0} pantry staple{(importPreview.data.pantryStaples?.length || 0) !== 1 ? 's' : ''}</li>
                    <li>{importPreview.data.userPrefs?.favoriteRecipeIds?.length || 0} favorite{(importPreview.data.userPrefs?.favoriteRecipeIds?.length || 0) !== 1 ? 's' : ''}</li>
                  </ul>
                </div>

                <div className={`p-3 rounded-lg text-sm mb-4 ${
                  importMode === 'overwrite'
                    ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    : 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                }`}>
                  {importMode === 'overwrite' ? (
                    <>
                      <strong>Warning:</strong> This will replace all your current data with the imported backup.
                    </>
                  ) : (
                    <>
                      <strong>Merge mode:</strong> New items will be added. Existing items with the same ID will be kept.
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleImportCancel}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportConfirm}
                    className={`flex-1 px-4 py-2.5 text-white rounded-lg transition font-medium ${
                      importMode === 'overwrite'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {importMode === 'overwrite' ? 'Replace Data' : 'Merge Data'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSettingsModal;
