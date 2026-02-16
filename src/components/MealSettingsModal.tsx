// src/components/MealSettingsModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { MealType, MealPlanSettings, PlanItem, IngredientExclusion, IngredientFrequencyLimit, MealSlotTheme } from '../types';
import { MEAL_TYPES, PREDEFINED_THEMES } from '../types';
import { COMMON_EXCLUSIONS, getIngredientUsageSummary } from '../utils/dietaryPreferences';

type SettingsTab = 'mealTypes' | 'exclusions' | 'limits' | 'themes';

interface MealSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MealPlanSettings;
  onSave: (settings: MealPlanSettings) => void;
  plan: PlanItem[];
  days: number;
}

const MealSettingsModal = ({
  isOpen,
  onClose,
  settings,
  onSave,
  plan,
  days,
}: MealSettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('mealTypes');
  const [enabledMealTypes, setEnabledMealTypes] = useState<MealType[]>(settings.enabledMealTypes);
  const [exclusions, setExclusions] = useState<IngredientExclusion[]>(settings.ingredientExclusions || []);
  const [limits, setLimits] = useState<IngredientFrequencyLimit[]>(settings.frequencyLimits || []);
  const [themes, setThemes] = useState<MealSlotTheme[]>(settings.mealSlotThemes || []);

  // Form inputs
  const [newExclusion, setNewExclusion] = useState('');
  const [newLimitIngredient, setNewLimitIngredient] = useState('');
  const [newLimitMax, setNewLimitMax] = useState(2);

  // Reset local state when modal opens and scroll to top
  useEffect(() => {
    if (isOpen) {
      setEnabledMealTypes(settings.enabledMealTypes);
      setExclusions(settings.ingredientExclusions || []);
      setLimits(settings.frequencyLimits || []);
      setThemes(settings.mealSlotThemes || []);
      setActiveTab('mealTypes');
      setNewExclusion('');
      setNewLimitIngredient('');
      setNewLimitMax(2);
      window.scrollTo(0, 0);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const toggleMealType = (mealType: MealType) => {
    setEnabledMealTypes(prev => {
      if (prev.includes(mealType)) {
        if (prev.length <= 1) return prev;
        return prev.filter(mt => mt !== mealType);
      } else {
        return [...prev, mealType];
      }
    });
  };

  const addExclusion = (ingredientName: string, displayName: string) => {
    const normalized = ingredientName.toLowerCase().trim();
    if (!normalized) return;
    if (exclusions.some(e => e.ingredientName === normalized)) return;
    setExclusions([...exclusions, { ingredientName: normalized, displayName }]);
  };

  const removeExclusion = (ingredientName: string) => {
    setExclusions(exclusions.filter(e => e.ingredientName !== ingredientName));
  };

  const handleAddCustomExclusion = () => {
    if (newExclusion.trim()) {
      addExclusion(newExclusion.trim(), newExclusion.trim());
      setNewExclusion('');
    }
  };

  const addLimit = () => {
    const normalized = newLimitIngredient.toLowerCase().trim();
    if (!normalized || newLimitMax < 1) return;
    if (limits.some(l => l.ingredientName === normalized)) return;
    setLimits([...limits, {
      ingredientName: normalized,
      displayName: newLimitIngredient.trim(),
      maxPerWeek: newLimitMax,
    }]);
    setNewLimitIngredient('');
    setNewLimitMax(2);
  };

  const removeLimit = (ingredientName: string) => {
    setLimits(limits.filter(l => l.ingredientName !== ingredientName));
  };

  const setThemeForSlot = (day: number, mealType: MealType, themeId: string | null) => {
    setThemes(prev => {
      const filtered = prev.filter(t => !(t.day === day && t.mealType === mealType));
      if (themeId) {
        return [...filtered, { day, mealType, theme: themeId }];
      }
      return filtered;
    });
  };

  const getThemeForSlot = (day: number, mealType: MealType): string | null => {
    return themes.find(t => t.day === day && t.mealType === mealType)?.theme || null;
  };

  const clearAllThemes = () => {
    setThemes([]);
  };

  const handleSave = () => {
    onSave({
      enabledMealTypes,
      ingredientExclusions: exclusions,
      frequencyLimits: limits,
      mealSlotThemes: themes,
    });
    onClose();
  };

  const handleCancel = () => {
    setEnabledMealTypes(settings.enabledMealTypes);
    setExclusions(settings.ingredientExclusions || []);
    setLimits(settings.frequencyLimits || []);
    setThemes(settings.mealSlotThemes || []);
    onClose();
  };

  // Check if there are unsaved changes
  const hasChanges =
    JSON.stringify([...enabledMealTypes].sort()) !== JSON.stringify([...settings.enabledMealTypes].sort()) ||
    JSON.stringify(exclusions) !== JSON.stringify(settings.ingredientExclusions || []) ||
    JSON.stringify(limits) !== JSON.stringify(settings.frequencyLimits || []) ||
    JSON.stringify(themes) !== JSON.stringify(settings.mealSlotThemes || []);

  const usageSummary = getIngredientUsageSummary(plan, limits);

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'mealTypes', label: 'Meals', icon: '🍽️' },
    { id: 'exclusions', label: 'Exclude', icon: '🚫' },
    { id: 'limits', label: 'Limits', icon: '📊' },
    { id: 'themes', label: 'Themes', icon: '📅' },
  ];

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-4 sm:pt-8 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden my-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Meal Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Customize your meal planning</p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="block sm:hidden">{tab.icon}</span>
              <span className="hidden sm:block">{tab.icon} {tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Meal Types Tab */}
          {activeTab === 'mealTypes' && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enable the meal types you want to include in your daily meal plan.
              </p>
              <div className="space-y-3">
                {MEAL_TYPES.map((mealType) => {
                  const isEnabled = enabledMealTypes.includes(mealType.id);
                  const isLastEnabled = isEnabled && enabledMealTypes.length === 1;

                  return (
                    <div
                      key={mealType.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isEnabled
                          ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{mealType.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {mealType.label}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleMealType(mealType.id)}
                        disabled={isLastEnabled}
                        className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        } ${isLastEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Exclusions Tab */}
          {activeTab === 'exclusions' && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Recipes containing these ingredients will never be shown.
              </p>

              {/* Add custom exclusion */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomExclusion()}
                  placeholder="Enter ingredient to exclude..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
                <button
                  onClick={handleAddCustomExclusion}
                  disabled={!newExclusion.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Add
                </button>
              </div>

              {/* Quick add buttons */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick add:</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_EXCLUSIONS.slice(0, 8).map(item => {
                    const isAdded = exclusions.some(e => e.ingredientName === item.ingredientName);
                    return (
                      <button
                        key={item.ingredientName}
                        onClick={() => !isAdded && addExclusion(item.ingredientName, item.displayName)}
                        disabled={isAdded}
                        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                          isAdded
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400'
                        }`}
                      >
                        {item.displayName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current exclusions */}
              {exclusions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current exclusions:</p>
                  {exclusions.map(exclusion => (
                    <div
                      key={exclusion.ingredientName}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <span className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <span className="text-red-500">🚫</span>
                        {exclusion.displayName}
                      </span>
                      <button
                        onClick={() => removeExclusion(exclusion.ingredientName)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
                  No ingredients excluded yet
                </p>
              )}
            </div>
          )}

          {/* Frequency Limits Tab */}
          {activeTab === 'limits' && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Limit how often certain ingredients appear per week.
              </p>

              {/* Add new limit */}
              <div className="flex gap-2 mb-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Ingredient</label>
                  <input
                    type="text"
                    value={newLimitIngredient}
                    onChange={(e) => setNewLimitIngredient(e.target.value)}
                    placeholder="e.g., chicken"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Max/week</label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={newLimitMax}
                    onChange={(e) => setNewLimitMax(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                </div>
                <button
                  onClick={addLimit}
                  disabled={!newLimitIngredient.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Add
                </button>
              </div>

              {/* Current limits with usage */}
              {limits.length > 0 ? (
                <div className="space-y-3">
                  {usageSummary.map(item => (
                    <div
                      key={item.ingredient}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {item.displayName}: {item.max}x/week
                        </span>
                        <button
                          onClick={() => removeLimit(item.ingredient)}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              item.percentage >= 100
                                ? 'bg-red-500'
                                : item.percentage >= 75
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          item.percentage >= 100
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {item.current}/{item.max}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-4">
                  No frequency limits set
                </p>
              )}
            </div>
          )}

          {/* Themes Tab */}
          {activeTab === 'themes' && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Assign themes to meal slots. Themed recipes will appear first when selecting.
              </p>

              {/* Theme grid */}
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-1 text-gray-500 dark:text-gray-400 font-normal">Day</th>
                      {enabledMealTypes.map(mt => {
                        const config = MEAL_TYPES.find(m => m.id === mt);
                        return (
                          <th key={mt} className="text-center py-2 px-1 text-gray-500 dark:text-gray-400 font-normal">
                            <span className="hidden sm:inline">{config?.icon} {config?.label}</span>
                            <span className="sm:hidden">{config?.icon}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: days }, (_, i) => i + 1).map(day => (
                      <tr key={day} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="py-2 px-1 text-gray-700 dark:text-gray-300">Day {day}</td>
                        {enabledMealTypes.map(mt => (
                          <td key={mt} className="py-2 px-1">
                            <select
                              value={getThemeForSlot(day, mt) || ''}
                              onChange={(e) => setThemeForSlot(day, mt, e.target.value || null)}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="">-</option>
                              {PREDEFINED_THEMES.map(theme => (
                                <option key={theme.id} value={theme.id}>
                                  {theme.icon} {theme.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {themes.length > 0 && (
                <button
                  onClick={clearAllThemes}
                  className="mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  Clear all themes
                </button>
              )}

              {/* Theme legend */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Available themes:</p>
                <div className="flex flex-wrap gap-2">
                  {PREDEFINED_THEMES.map(theme => (
                    <span
                      key={theme.id}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {theme.icon} {theme.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              hasChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MealSettingsModal;
