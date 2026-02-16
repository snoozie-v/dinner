import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import defaultRecipes from './recipes.json';
import type { Recipe, PlanItem, LegacyPlanItem, ShoppingAdjustments, PantryStaple, MealPlanTemplate, LegacyMealPlanTemplate, UserPreferences, MealPlanSettings, ActiveTab } from './types';
import { MEAL_TYPES } from './types';
import { migrateLegacyPlan, migrateTemplates, isLegacyPlanItem, CURRENT_DATA_VERSION } from './utils/migration';
import { STORAGE_KEYS, storage } from './utils/storage';

import Controls from './components/Controls';
import SearchBar from './components/SearchBar';
import RecipePickerModal from './components/RecipePickerModal';
import MealPlan from './components/MealPlan';
import ShoppingList from './components/ShoppingList';
import ManageRecipes from './components/recipes/ManageRecipes';
import QuickRecipes from './components/QuickRecipes';
import PantryModal from './components/PantryModal';
import TemplateModal from './components/TemplateModal';
import UndoToast from './components/UndoToast';
import BottomNav from './components/BottomNav';
import OnboardingModal from './components/OnboardingModal';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import PullToRefresh from './components/PullToRefresh';
import RecipeDetailModal from './components/recipes/RecipeDetailModal';
import DataSettingsModal from './components/DataSettingsModal';
import HelpModal from './components/HelpModal';
import MealSettingsModal from './components/MealSettingsModal';
import ConfirmModal from './components/ConfirmModal';

import { useRecipes } from './hooks/useRecipes';
import { useUndo } from './hooks/useUndo';
import { useMealSettings } from './hooks/useMealSettings';
import { useAppSettings } from './hooks/useAppSettings';
import { useUserPreferences } from './hooks/useUserPreferences';
import { usePantryStaples } from './hooks/usePantryStaples';
import { useMealPlan } from './hooks/useMealPlan';
import { useShoppingList } from './hooks/useShoppingList';
import { useTemplates } from './hooks/useTemplates';

type Theme = 'light' | 'dark' | 'system';

function App() {
  // --- Derive activeTab from URL ---
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab: ActiveTab =
    location.pathname === '/shop' ? 'shop' :
    location.pathname === '/recipes' ? 'recipes' : 'planner';

  // --- Hook composition (dependency order) ---
  const undo = useUndo();
  const recipes = useRecipes(defaultRecipes as Recipe[]);
  const mealSettingsHook = useMealSettings();
  const app = useAppSettings();
  const userPrefs = useUserPreferences(recipes.allRecipes);
  const pantry = usePantryStaples(undo.setUndoAction);
  const mealPlan = useMealPlan({
    allRecipes: recipes.allRecipes,
    sortedEnabledMealTypes: mealSettingsHook.sortedEnabledMealTypes,
    addToRecent: userPrefs.addToRecent,
    setUndoAction: undo.setUndoAction,
  });
  const shopping = useShoppingList({
    plan: mealPlan.plan,
    pantryStaples: pantry.pantryStaples,
    days: mealPlan.days,
  });
  const templates = useTemplates({
    plan: mealPlan.plan,
    mealSettings: mealSettingsHook.mealSettings,
    allRecipes: recipes.allRecipes,
    setUndoAction: undo.setUndoAction,
  });

  // --- Local UI state ---
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);

  const handleViewRecipe = (recipe: Recipe): void => {
    setViewingRecipe(recipe);
  };

  const handleCloseViewRecipe = (): void => {
    setViewingRecipe(null);
  };

  // --- Pull-to-refresh (depends on activeTab from URL) ---
  const handlePullRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 300));

    let message = '';
    if (activeTab === 'planner') {
      message = 'Meal plan is up to date!';
    } else if (activeTab === 'shop') {
      message = 'Shopping list refreshed!';
    } else if (activeTab === 'recipes') {
      message = 'Recipes are up to date!';
    }

    setRefreshMessage(message);
    setTimeout(() => {
      setRefreshMessage(null);
    }, 2000);
  }, [activeTab]);

  // --- Orchestration functions (cross-hook) ---

  const handleGenerateRandomPlan = () => {
    mealPlan.generateRandomPlan();
    shopping.resetAdjustments();
  };

  const handleLoadTemplate = (template: MealPlanTemplate): void => {
    const resolved = templates.resolveTemplate(template);
    if (resolved.enabledMealTypes) {
      mealSettingsHook.setMealSettings({ enabledMealTypes: resolved.enabledMealTypes });
    }
    mealPlan.loadPlan(resolved.plan, resolved.days);
    shopping.resetAdjustments();
    app.setShowTemplateModal(false);
  };

  const deleteRecipeWithUndo = (recipeId: string): { success: boolean; errors?: string[] } => {
    const result = recipes.deleteRecipe(recipeId);
    if (result.success && result.recipe) {
      const deletedRecipe = result.recipe;
      undo.setUndoAction({
        id: `recipe-${Date.now()}`,
        message: `Deleted "${deletedRecipe.name}"`,
        onUndo: () => {
          recipes.restoreRecipe(deletedRecipe);
        },
      });
    }
    return result;
  };

  const clearAllData = (): void => {
    setShowClearDataConfirm(true);
  };

  const confirmClearAllData = (): void => {
    storage.clearAll();
    mealPlan.setDays(3);
    mealPlan.setPlan([]);
    shopping.resetAdjustments();
    mealPlan.setSearchTerm('');
    setShowClearDataConfirm(false);
  };

  const handleImportData = useCallback((data: {
    version: number;
    exportedAt: string;
    data: {
      customRecipes?: Recipe[];
      days?: number;
      plan?: PlanItem[];
      shoppingAdjustments?: ShoppingAdjustments;
      pantryStaples?: PantryStaple[];
      templates?: MealPlanTemplate[];
      userPrefs?: UserPreferences;
      theme?: string;
    };
  }, mode: 'overwrite' | 'merge') => {
    const importedData = data.data;

    if (mode === 'overwrite') {
      if (importedData.customRecipes) {
        recipes.importRecipes(importedData.customRecipes, 'overwrite');
      }
      if (importedData.days !== undefined && importedData.plan) {
        mealPlan.loadPlan(importedData.plan, importedData.days);
      } else if (importedData.days !== undefined) {
        mealPlan.setDays(importedData.days);
      } else if (importedData.plan) {
        mealPlan.setPlan(importedData.plan);
      }
      if (importedData.shoppingAdjustments) {
        shopping.importAdjustments(importedData.shoppingAdjustments);
      }
      if (importedData.pantryStaples) {
        pantry.importStaples(importedData.pantryStaples, 'overwrite');
      }
      if (importedData.templates) {
        templates.importTemplates(importedData.templates, 'overwrite');
      }
      if (importedData.userPrefs) {
        userPrefs.importPrefs(importedData.userPrefs, 'overwrite');
      }
      if (importedData.theme) {
        app.setTheme(importedData.theme as Theme);
      }
    } else {
      if (importedData.customRecipes) {
        recipes.importRecipes(importedData.customRecipes, 'merge');
      }
      if (importedData.pantryStaples) {
        pantry.importStaples(importedData.pantryStaples, 'merge');
      }
      if (importedData.templates) {
        templates.importTemplates(importedData.templates, 'merge');
      }
      if (importedData.userPrefs) {
        userPrefs.importPrefs(importedData.userPrefs, 'merge');
      }
    }
  }, [recipes, mealPlan, shopping, pantry, templates, userPrefs, app]);

  // --- Migration (one-time on mount) ---
  useEffect(() => {
    const storedVersion = storage.get<number | null>(STORAGE_KEYS.DATA_VERSION, null);

    if (storedVersion === null || storedVersion < CURRENT_DATA_VERSION) {
      const storedPlan = storage.get<(PlanItem | LegacyPlanItem)[]>(STORAGE_KEYS.PLAN, []);
      if (storedPlan.length > 0 && isLegacyPlanItem(storedPlan[0])) {
        const migratedPlan = migrateLegacyPlan(
          storedPlan as LegacyPlanItem[],
          mealSettingsHook.mealSettings.enabledMealTypes
        );
        mealPlan.setPlan(migratedPlan);
      }

      const storedTemplates = storage.get<(MealPlanTemplate | LegacyMealPlanTemplate)[]>(
        STORAGE_KEYS.TEMPLATES,
        []
      );
      if (storedTemplates.length > 0) {
        const migratedTemplates = migrateTemplates(storedTemplates);
        templates.setTemplates(migratedTemplates);
      }

      storage.set(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Tab content ---
  const plannerContent = (
    <>
      <Controls
        days={mealPlan.days}
        setDays={mealPlan.setDays}
        generateRandomPlan={handleGenerateRandomPlan}
        clearAllData={clearAllData}
        onOpenTemplates={() => app.setShowTemplateModal(true)}
        onOpenPantry={() => app.setShowPantryModal(true)}
        onOpenMealSettings={() => app.setShowMealSettingsModal(true)}
        hasTemplates={templates.templates.length > 0}
      />

      <QuickRecipes
        favoriteRecipes={userPrefs.favoriteRecipes}
        recentRecipes={userPrefs.recentRecipes}
        onAssign={mealPlan.handleAssign}
        onToggleFavorite={userPrefs.toggleFavorite}
        isFavorite={userPrefs.isFavorite}
        days={mealPlan.days}
        mealTypes={MEAL_TYPES.filter(mt => mealSettingsHook.mealSettings.enabledMealTypes.includes(mt.id))}
        onViewRecipe={handleViewRecipe}
      />

      <SearchBar
        searchTerm={mealPlan.searchTerm}
        setSearchTerm={mealPlan.setSearchTerm}
        filteredRecipes={mealPlan.filteredRecipes}
        onAssign={mealPlan.handleAssign}
        days={mealPlan.days}
        mealTypes={MEAL_TYPES.filter(mt => mealSettingsHook.mealSettings.enabledMealTypes.includes(mt.id))}
        onToggleFavorite={userPrefs.toggleFavorite}
        isFavorite={userPrefs.isFavorite}
        onViewRecipe={handleViewRecipe}
      />

      <MealPlan
        plan={mealPlan.plan}
        mealTypes={MEAL_TYPES.filter(mt => mealSettingsHook.mealSettings.enabledMealTypes.includes(mt.id))}
        onSelectRecipe={mealPlan.handleSelectRecipeSlot}
        updateServings={mealPlan.updateServings}
        updateNotes={mealPlan.updateNotes}
        onReorderDays={mealPlan.handleReorderDays}
        onRemoveRecipe={mealPlan.removeMealPlanRecipe}
        onViewRecipe={handleViewRecipe}
        mealSlotThemes={mealSettingsHook.mealSettings.mealSlotThemes}
      />

      <RecipePickerModal
        selectedDay={mealPlan.selectedDayForPicker}
        selectedMealType={mealPlan.selectedMealTypeForPicker}
        onClose={mealPlan.handleCloseRecipePicker}
        recipes={recipes.allRecipes}
        assignRecipeToSlot={mealPlan.assignRecipeToSlot}
        isCustomRecipe={recipes.isCustomRecipe}
        onToggleFavorite={userPrefs.toggleFavorite}
        isFavorite={userPrefs.isFavorite}
        onViewRecipe={handleViewRecipe}
        ingredientExclusions={mealSettingsHook.mealSettings.ingredientExclusions}
        frequencyLimits={mealSettingsHook.mealSettings.frequencyLimits}
        mealSlotThemes={mealSettingsHook.mealSettings.mealSlotThemes}
        plan={mealPlan.plan}
      />

      <PantryModal
        isOpen={app.showPantryModal}
        onClose={() => app.setShowPantryModal(false)}
        pantryStaples={pantry.pantryStaples}
        onAddStaple={pantry.addPantryStaple}
        onRemoveStaple={pantry.removePantryStaple}
      />

      <TemplateModal
        isOpen={app.showTemplateModal}
        onClose={() => app.setShowTemplateModal(false)}
        templates={templates.templates}
        onSaveTemplate={templates.saveTemplate}
        onLoadTemplate={handleLoadTemplate}
        onDeleteTemplate={templates.deleteTemplate}
        currentPlanHasRecipes={mealPlan.plan.some(p => p.recipe !== null)}
      />

      <MealSettingsModal
        isOpen={app.showMealSettingsModal}
        onClose={() => app.setShowMealSettingsModal(false)}
        settings={mealSettingsHook.mealSettings}
        onSave={mealSettingsHook.handleSaveMealSettings}
        plan={mealPlan.plan}
        days={mealPlan.days}
      />
    </>
  );

  const shopContent = (
    <>
      <ShoppingList
        plan={mealPlan.plan}
        shoppingList={shopping.shoppingList}
        toggleHaveItem={shopping.toggleHaveItem}
        onOpenPantry={() => app.setShowPantryModal(true)}
        totalDays={mealPlan.days}
        selectedDays={shopping.selectedShoppingDays}
        onSelectedDaysChange={shopping.setSelectedShoppingDays}
      />

      <PantryModal
        isOpen={app.showPantryModal}
        onClose={() => app.setShowPantryModal(false)}
        pantryStaples={pantry.pantryStaples}
        onAddStaple={pantry.addPantryStaple}
        onRemoveStaple={pantry.removePantryStaple}
      />
    </>
  );

  const recipesContent = (
    <ManageRecipes
      recipes={recipes.allRecipes}
      onAddRecipe={recipes.addRecipe}
      onUpdateRecipe={recipes.updateRecipe}
      onDeleteRecipe={deleteRecipeWithUndo}
      onDuplicateRecipe={recipes.duplicateRecipe}
      isCustomRecipe={recipes.isCustomRecipe}
    />
  );

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PullToRefresh
        onRefresh={handlePullRefresh}
        pullText="Pull to refresh"
        releaseText="Release to refresh"
        refreshingText="Refreshing..."
      >
        <div className="py-6 sm:py-8 px-4 sm:px-6 lg:px-8 mobile-bottom-padding">
          <div className="max-w-6xl mx-auto">
        {/* Header with theme toggle and help button */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex-1 flex justify-start relative">
            <button
              onClick={() => app.setShowTutorialDropdown(!app.showTutorialDropdown)}
              className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors touch-manipulation"
              aria-label="Show tutorial"
              title="Show tutorial"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Tutorial Dropdown */}
            {app.showTutorialDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => app.setShowTutorialDropdown(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  <button
                    onClick={() => {
                      app.setShowHelpModal(true);
                      app.setShowTutorialDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border-b border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <div>
                        <span className="font-semibold text-blue-700 dark:text-blue-300">User Guide</span>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Full documentation & examples</p>
                      </div>
                    </div>
                  </button>

                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quick Tutorials</p>
                  </div>
                  <div className="py-1 max-h-80 overflow-y-auto">
                    {[
                      { step: 0, title: 'Welcome', desc: 'Introduction to the app' },
                      { step: 1, title: 'Plan Your Meals', desc: 'Create & organize meal plans' },
                      { step: 2, title: 'View & Prep Notes', desc: 'View recipes, add prep reminders' },
                      { step: 3, title: 'Shopping List', desc: 'Auto-generated, shareable lists' },
                      { step: 4, title: 'Pantry Staples', desc: 'Mark items you always have' },
                      { step: 5, title: 'Save Templates', desc: 'Reuse meal plans' },
                      { step: 6, title: 'Quick Recipe Access', desc: 'Favorites & recent recipes' },
                      { step: 7, title: 'Manage Recipes', desc: 'Browse, create & edit recipes' },
                      { step: 8, title: 'Import from URLs', desc: 'Import from recipe websites' },
                      { step: 9, title: 'Share Recipes', desc: 'Share recipes with anyone' },
                      { step: 10, title: 'Backup & Restore', desc: 'Export/import your data' },
                      { step: 11, title: 'Undo & Dark Mode', desc: 'Recovery & theme options' },
                    ].map(({ step, title, desc }) => (
                      <button
                        key={step}
                        onClick={() => app.handleShowOnboarding(step)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <span className="font-medium">{title}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center">
            {activeTab === 'shop' ? 'Shopping List' : activeTab === 'recipes' ? 'Recipes' : 'Meal Planner'}
          </h1>
          <div className="flex-1 flex justify-end">
            <button
              onClick={app.toggleTheme}
              className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors touch-manipulation"
              aria-label={app.isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {app.isDarkMode ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation - Hidden on mobile, shown on desktop */}
        <div className="hidden sm:flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 shadow-sm">
            <button
              onClick={() => navigate('/plan')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'planner'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Plan
            </button>
            <button
              onClick={() => navigate('/shop')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors relative ${
                activeTab === 'shop'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Shop
              {shopping.shoppingNeededCount > 0 && (
                <span className={`min-w-[20px] h-5 flex items-center justify-center text-xs font-bold rounded-full px-1.5 ${
                  activeTab === 'shop' ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                }`}>
                  {shopping.shoppingNeededCount > 99 ? '99+' : shopping.shoppingNeededCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/recipes')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'recipes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Recipes
            </button>
          </div>
        </div>

        {/* Tab Content via Routes */}
        <Routes>
          <Route path="/" element={plannerContent} />
          <Route path="/plan" element={plannerContent} />
          <Route path="/shop" element={shopContent} />
          <Route path="/recipes" element={recipesContent} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <button
              onClick={() => app.setShowPrivacyPolicy(true)}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors touch-manipulation py-2"
            >
              Privacy Policy
            </button>
            <span className="hidden sm:inline">•</span>
            <button
              onClick={() => app.handleShowOnboarding(0)}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors touch-manipulation py-2"
            >
              App Tutorial
            </button>
            <span className="hidden sm:inline">•</span>
            <button
              onClick={() => app.setShowDataSettings(true)}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors touch-manipulation py-2"
            >
              Backup & Restore
            </button>
            <span className="hidden sm:inline">•</span>
            <span className="text-gray-400 dark:text-gray-500">
              Meal Planner v1.0
            </span>
          </div>
        </footer>
          </div>
        </div>
      </PullToRefresh>

      {/* Refresh Message Toast */}
      {refreshMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-green-600 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">{refreshMessage}</span>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Mobile only */}
      <BottomNav
        shoppingCount={shopping.shoppingNeededCount}
      />

      {/* Undo Toast */}
      <UndoToast action={undo.undoAction} onDismiss={undo.dismissUndo} />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={app.showOnboarding}
        onComplete={app.handleOnboardingComplete}
        initialStep={app.onboardingInitialStep}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={app.showPrivacyPolicy}
        onClose={() => app.setShowPrivacyPolicy(false)}
      />

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        recipe={viewingRecipe}
        onClose={handleCloseViewRecipe}
        isCustomRecipe={recipes.isCustomRecipe}
      />

      {/* Data Settings Modal - Export/Import */}
      <DataSettingsModal
        isOpen={app.showDataSettings}
        onClose={() => app.setShowDataSettings(false)}
        customRecipes={recipes.customRecipes}
        days={mealPlan.days}
        plan={mealPlan.plan}
        shoppingAdjustments={shopping.shoppingAdjustments}
        pantryStaples={pantry.pantryStaples}
        templates={templates.templates}
        userPrefs={userPrefs.userPrefs}
        theme={app.theme}
        onImportData={handleImportData}
      />

      {/* Help Modal - User Guide */}
      <HelpModal
        isOpen={app.showHelpModal}
        onClose={() => app.setShowHelpModal(false)}
      />

      {/* Clear Data Confirmation */}
      <ConfirmModal
        isOpen={showClearDataConfirm}
        title="Clear All Data"
        message="This will reset your meal plan and shopping list. This action cannot be undone."
        confirmLabel="Clear Data"
        variant="danger"
        onConfirm={confirmClearAllData}
        onCancel={() => setShowClearDataConfirm(false)}
      />
    </div>
  );
}

export default App;
