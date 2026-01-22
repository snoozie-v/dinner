// src/App.tsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import defaultRecipes from './recipes.json';
import type { Recipe, PlanItem, ShoppingItem, ShoppingAdjustments, ActiveTab, PantryStaple, MealPlanTemplate, UserPreferences } from './types';

import Controls from './components/Controls';
import SearchBar from './components/SearchBar';
import RecipePickerModal from './components/RecipePickerModal';
import MealPlan from './components/MealPlan';
import ShoppingList from './components/ShoppingList';
import ManageRecipes from './components/recipes/ManageRecipes';
import QuickRecipes from './components/QuickRecipes';
import PantryModal from './components/PantryModal';
import TemplateModal from './components/TemplateModal';
import UndoToast, { type UndoAction } from './components/UndoToast';
import BottomNav from './components/BottomNav';
import OnboardingModal from './components/OnboardingModal';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import PullToRefresh from './components/PullToRefresh';

import { useRecipes } from './hooks/useRecipes';

// localStorage keys
const STORAGE_KEYS = {
  DAYS: 'dinner-planner-days',
  PLAN: 'dinner-planner-plan',
  SHOPPING_ADJUSTMENTS: 'dinner-planner-shopping-adjustments',
  PANTRY_STAPLES: 'dinner-planner-pantry-staples',
  TEMPLATES: 'dinner-planner-templates',
  USER_PREFS: 'dinner-planner-user-prefs',
  THEME: 'dinner-planner-theme',
  ONBOARDING_SEEN: 'dinner-planner-onboarding-seen',
} as const;

type Theme = 'light' | 'dark' | 'system';

// Helper to safely parse JSON from localStorage
function getStoredValue<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function App() {
  const [days, setDays] = useState<number>(() => getStoredValue(STORAGE_KEYS.DAYS, 3));
  const [plan, setPlan] = useState<PlanItem[]>(() => getStoredValue(STORAGE_KEYS.PLAN, []));
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDayForPicker, setSelectedDayForPicker] = useState<number | null>(null);
  const [shoppingAdjustments, setShoppingAdjustments] = useState<ShoppingAdjustments>(() =>
    getStoredValue(STORAGE_KEYS.SHOPPING_ADJUSTMENTS, {})
  );

  // Pantry staples - items user always has on hand
  const [pantryStaples, setPantryStaples] = useState<PantryStaple[]>(() =>
    getStoredValue(STORAGE_KEYS.PANTRY_STAPLES, [])
  );

  // Meal plan templates
  const [templates, setTemplates] = useState<MealPlanTemplate[]>(() =>
    getStoredValue(STORAGE_KEYS.TEMPLATES, [])
  );

  // User preferences (favorites, recent)
  const [userPrefs, setUserPrefs] = useState<UserPreferences>(() =>
    getStoredValue(STORAGE_KEYS.USER_PREFS, { favoriteRecipeIds: [], recentRecipeIds: [] })
  );

  // Modal states
  const [showPantryModal, setShowPantryModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Tab state: 'planner' or 'recipes'
  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');

  // Theme state
  const [theme, setTheme] = useState<Theme>(() => getStoredValue(STORAGE_KEYS.THEME, 'system'));

  // Onboarding state - show for new users
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    const seen = localStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN);
    return !seen; // Show if not seen before
  });

  // Privacy policy modal state
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Pull-to-refresh feedback
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // Apply dark mode class to <html>
  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      document.documentElement.classList.toggle('dark', isDark);
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  // Persist theme to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));
  }, [theme]);

  // Toggle between light and dark (skipping system for simplicity)
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Check if currently showing dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');
    setShowOnboarding(false);
  };

  // Show onboarding again (for Help button)
  const handleShowOnboarding = () => {
    setShowOnboarding(true);
  };

  // Handle pull-to-refresh
  const handlePullRefresh = useCallback(async () => {
    // Simulate a brief refresh action
    await new Promise(resolve => setTimeout(resolve, 300));

    // Show feedback based on current tab
    let message = '';
    if (activeTab === 'planner') {
      message = 'Meal plan is up to date!';
    } else if (activeTab === 'shop') {
      message = 'Shopping list refreshed!';
    } else if (activeTab === 'recipes') {
      message = 'Recipes are up to date!';
    }

    setRefreshMessage(message);

    // Clear message after 2 seconds
    setTimeout(() => {
      setRefreshMessage(null);
    }, 2000);
  }, [activeTab]);

  // Undo state
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  // Recipe CRUD operations
  const {
    allRecipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    restoreRecipe,
    duplicateRecipe,
    isCustomRecipe
  } = useRecipes(defaultRecipes as Recipe[]);

  const filteredRecipes = useMemo<Recipe[]>(() => {
    if (!searchTerm.trim()) return allRecipes;

    const term = searchTerm.toLowerCase().trim();
    return allRecipes.filter((recipe) => {
      // Search recipe name
      if (recipe.name?.toLowerCase().includes(term)) return true;

      // Search description
      if (recipe.description?.toLowerCase().includes(term)) return true;

      // Search author
      if (recipe.author?.toLowerCase().includes(term)) return true;

      // Search cuisine
      if (recipe.cuisine?.toLowerCase().includes(term)) return true;

      // Search difficulty
      if (recipe.difficulty?.toLowerCase().includes(term)) return true;

      // Search tags
      if (recipe.tags?.some(tag => tag.toLowerCase().includes(term))) return true;

      // Search meal types
      if (recipe.mealTypes?.some(type => type.toLowerCase().includes(term))) return true;

      // Search dietary options
      if (recipe.dietary?.some(diet => diet.toLowerCase().includes(term))) return true;

      // Search allergens
      if (recipe.allergiesToAvoid?.some(allergen => allergen.toLowerCase().includes(term))) return true;

      // Search equipment
      if (recipe.equipment?.some(equip => equip.toLowerCase().includes(term))) return true;

      // Search ingredient names
      if (recipe.ingredients?.some(ing => ing?.name?.toLowerCase().includes(term))) return true;

      return false;
    });
  }, [searchTerm, allRecipes]);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DAYS, JSON.stringify(days));
  }, [days]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(plan));
  }, [plan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHOPPING_ADJUSTMENTS, JSON.stringify(shoppingAdjustments));
  }, [shoppingAdjustments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PANTRY_STAPLES, JSON.stringify(pantryStaples));
  }, [pantryStaples]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER_PREFS, JSON.stringify(userPrefs));
  }, [userPrefs]);

  // Dismiss undo action
  const dismissUndo = useCallback(() => {
    setUndoAction(null);
  }, []);

  // Pantry staple handlers
  const addPantryStaple = (name: string, unit: string): void => {
    const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
    if (!pantryStaples.some(s => s.key === key)) {
      setPantryStaples(prev => [...prev, { name, unit, key }]);
    }
  };

  const removePantryStaple = (key: string): void => {
    const staple = pantryStaples.find(s => s.key === key);
    if (!staple) return;

    setPantryStaples(prev => prev.filter(s => s.key !== key));

    // Show undo toast
    setUndoAction({
      id: `pantry-${Date.now()}`,
      message: `Removed "${staple.name}" from pantry`,
      onUndo: () => {
        setPantryStaples(prev => [...prev, staple]);
      },
    });
  };

  // Template handlers
  const saveTemplate = (name: string): void => {
    const template: MealPlanTemplate = {
      id: `template-${Date.now().toString(36)}`,
      name,
      createdAt: new Date().toISOString(),
      days: plan.length,
      recipes: plan.map(p => p.recipe?.id || null),
    };
    setTemplates(prev => [...prev, template]);
  };

  const loadTemplate = (template: MealPlanTemplate): void => {
    const newPlan: PlanItem[] = template.recipes.map((recipeId, index) => {
      const recipe = recipeId ? allRecipes.find(r => r.id === recipeId) || null : null;
      return {
        day: index + 1,
        id: `day-${index + 1}-${recipeId || 'placeholder'}`,
        recipe: recipe ? { ...recipe } : null,
        servingsMultiplier: 1,
      };
    });
    setDays(template.days);
    setPlan(newPlan);
    setShoppingAdjustments({});
    setShowTemplateModal(false);
  };

  const deleteTemplate = (templateId: string): void => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setTemplates(prev => prev.filter(t => t.id !== templateId));

    // Show undo toast
    setUndoAction({
      id: `template-${Date.now()}`,
      message: `Deleted template "${template.name}"`,
      onUndo: () => {
        setTemplates(prev => [...prev, template]);
      },
    });
  };

  // Favorites handlers
  const toggleFavorite = (recipeId: string): void => {
    setUserPrefs(prev => {
      const isFavorite = prev.favoriteRecipeIds.includes(recipeId);
      return {
        ...prev,
        favoriteRecipeIds: isFavorite
          ? prev.favoriteRecipeIds.filter(id => id !== recipeId)
          : [...prev.favoriteRecipeIds, recipeId],
      };
    });
  };

  const isFavorite = (recipeId: string): boolean => {
    return userPrefs.favoriteRecipeIds.includes(recipeId);
  };

  // Track recent recipe usage
  const addToRecent = (recipeId: string): void => {
    setUserPrefs(prev => {
      const filtered = prev.recentRecipeIds.filter(id => id !== recipeId);
      return {
        ...prev,
        recentRecipeIds: [recipeId, ...filtered].slice(0, 10),
      };
    });
  };

  // Get favorite and recent recipes
  const favoriteRecipes = useMemo(() => {
    return userPrefs.favoriteRecipeIds
      .map(id => allRecipes.find(r => r.id === id))
      .filter((r): r is Recipe => r !== undefined);
  }, [userPrefs.favoriteRecipeIds, allRecipes]);

  const recentRecipes = useMemo(() => {
    return userPrefs.recentRecipeIds
      .map(id => allRecipes.find(r => r.id === id))
      .filter((r): r is Recipe => r !== undefined);
  }, [userPrefs.recentRecipeIds, allRecipes]);

  const generateRandomPlan = (): void => {
    const newPlan: PlanItem[] = [];
    for (let i = 0; i < days; i++) {
      const randomIndex = Math.floor(Math.random() * allRecipes.length);
      const recipe = allRecipes[randomIndex];
      newPlan.push({
        day: i + 1,
        id: `day-${i + 1}-${recipe.id || Math.random().toString(36).slice(2)}`,
        recipe: { ...recipe },
        servingsMultiplier: 1,
      });
    }
    setPlan(newPlan.sort((a, b) => a.day - b.day));
    setSearchTerm('');
    setSelectedDayForPicker(null);
    setShoppingAdjustments({});
  };

  const initManualPlan = (): void => {
    const newPlan: PlanItem[] = [];
    for (let i = 0; i < days; i++) {
      newPlan.push({
        day: i + 1,
        id: `day-${i + 1}-placeholder`,
        recipe: null,
        servingsMultiplier: 1,
      });
    }
    setPlan(newPlan.sort((a, b) => a.day - b.day));
    setSearchTerm('');
    setSelectedDayForPicker(null);
    setShoppingAdjustments({});
  };

  const assignRecipeToDay = (dayIndex: number, newRecipe: Recipe | null): void => {
    // Track recent recipe usage
    if (newRecipe?.id) {
      addToRecent(newRecipe.id);
    }

    setPlan((prevPlan) => {
      const updated = prevPlan.map((item) => ({ ...item }));

      const targetDay = dayIndex + 1;
      const existingIndex = updated.findIndex((p) => p.day === targetDay);

      const recipeCopy = newRecipe ? { ...newRecipe } : null;

      if (existingIndex !== -1) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          recipe: recipeCopy,
          id: `day-${targetDay}-${newRecipe?.id || Date.now().toString(36).slice(2)}`,
        };
      } else {
        updated.push({
          day: targetDay,
          id: `day-${targetDay}-${newRecipe?.id || Date.now().toString(36).slice(2)}`,
          recipe: recipeCopy,
          servingsMultiplier: 1,
        });
      }

      return updated.sort((a, b) => a.day - b.day);
    });

    setSelectedDayForPicker(null);
  };

  const updateServings = (planItemId: string, multiplier: number): void => {
    setPlan((prev) =>
      prev.map((item) =>
        item.id === planItemId ? { ...item, servingsMultiplier: multiplier } : item
      )
    );
  };

  useEffect(() => {
    setPlan((prevPlan) => {
      let updated = [...prevPlan];

      updated = updated.filter((p) => p.day <= days);

      for (let i = updated.length + 1; i <= days; i++) {
        updated.push({
          day: i,
          id: `day-${i}-placeholder`,
          recipe: null,
          servingsMultiplier: 1,
        });
      }

      return updated.sort((a, b) => a.day - b.day);
    });
  }, [days]);

  const shoppingListMemo = useMemo<ShoppingItem[]>(() => {
    const map = new Map<string, {
      name: string;
      unit: string;
      totalQty: number;
      count: number;
      preparation: string;
      category: string;
      key: string;
    }>();

    plan.forEach(({ recipe, servingsMultiplier }) => {
      if (!recipe) return;

      recipe?.ingredients?.forEach((ing) => {
        if (!ing?.name) return;
        const key = `${ing.name}|${ing.unit || 'unit'}`;
        const qty = (ing.quantity || 0) * (servingsMultiplier || 1);

        if (!map.has(key)) {
          map.set(key, {
            name: ing.name,
            unit: ing.unit || 'unit',
            totalQty: 0,
            count: 0,
            preparation: ing.preparation || '',
            category: ing.category || 'other',
            key,
          });
        }

        const item = map.get(key)!;
        item.totalQty += qty;
        item.count += 1;
      });
    });

    // Create a set of pantry staple keys for quick lookup
    const pantryKeys = new Set(pantryStaples.map(s => s.key));

    return Array.from(map.values())
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      })
      .map((item) => {
        const adj = shoppingAdjustments[item.key] || { haveQty: 0 };
        // Auto-mark pantry staples as "have"
        const isPantryStaple = pantryKeys.has(item.key);
        const haveQty = isPantryStaple ? item.totalQty : adj.haveQty;
        const neededQty = Math.max(0, item.totalQty - haveQty);
        return {
          ...item,
          haveQty,
          ordered: false,
          neededQty,
          displayNeeded: neededQty % 1 === 0 ? neededQty : neededQty.toFixed(1),
          displayTotal: item.totalQty % 1 === 0 ? item.totalQty : item.totalQty.toFixed(1),
          isPantryStaple,
        };
      });
  }, [plan, shoppingAdjustments, pantryStaples]);

  const toggleHaveItem = (key: string, totalQty: number): void => {
    setShoppingAdjustments((prev) => {
      const current = prev[key] || { haveQty: 0 };
      const newHave = current.haveQty > 0 ? 0 : totalQty;
      return {
        ...prev,
        [key]: { haveQty: newHave },
      };
    });
  };

  const clearAllData = (): void => {
    if (window.confirm('Clear all saved data? This will reset your meal plan and shopping list.')) {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
      setDays(3);
      setPlan([]);
      setShoppingAdjustments({});
      setSearchTerm('');
      setSelectedDayForPicker(null);
    }
  };

  const handleAssign = (recipe: Recipe, dayIndex: number): void => {
    assignRecipeToDay(dayIndex, recipe);
  };

  // Remove recipe from meal plan with undo
  const removeMealPlanRecipe = (dayIndex: number): void => {
    const planItem = plan.find(p => p.day === dayIndex + 1);
    if (!planItem?.recipe) return;

    const removedRecipe = planItem.recipe;
    const removedMultiplier = planItem.servingsMultiplier;

    // Clear the recipe
    assignRecipeToDay(dayIndex, null);

    // Show undo toast
    setUndoAction({
      id: `plan-${Date.now()}`,
      message: `Removed "${removedRecipe.name}" from Day ${dayIndex + 1}`,
      onUndo: () => {
        setPlan(prev => prev.map(item => {
          if (item.day === dayIndex + 1) {
            return {
              ...item,
              recipe: removedRecipe,
              servingsMultiplier: removedMultiplier,
              id: `day-${dayIndex + 1}-${removedRecipe.id}`,
            };
          }
          return item;
        }));
      },
    });
  };

  // Delete recipe with undo (wrapper for ManageRecipes)
  const deleteRecipeWithUndo = (recipeId: string): { success: boolean; errors?: string[] } => {
    const result = deleteRecipe(recipeId);

    if (result.success && result.recipe) {
      const deletedRecipe = result.recipe;
      setUndoAction({
        id: `recipe-${Date.now()}`,
        message: `Deleted "${deletedRecipe.name}"`,
        onUndo: () => {
          restoreRecipe(deletedRecipe);
        },
      });
    }

    return result;
  };

  const handleReorderDays = useCallback((activeId: string, overId: string): void => {
    setPlan((prevPlan) => {
      const oldIndex = prevPlan.findIndex((item) => item.id === activeId);
      const newIndex = prevPlan.findIndex((item) => item.id === overId);

      if (oldIndex === -1 || newIndex === -1) return prevPlan;

      // Reorder the array
      const reordered = arrayMove(prevPlan, oldIndex, newIndex);

      // Reassign day numbers based on new positions
      return reordered.map((item, index) => ({
        ...item,
        day: index + 1,
      }));
    });
  }, []);

  // Calculate shopping items needed count for badge
  const shoppingNeededCount = shoppingListMemo.filter(item => item.haveQty < item.totalQty).length;

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
          <div className="flex-1 flex justify-start">
            <button
              onClick={handleShowOnboarding}
              className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors touch-manipulation"
              aria-label="Show tutorial"
              title="Show tutorial"
            >
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center">
            {activeTab === 'shop' ? 'Shopping List' : activeTab === 'recipes' ? 'Recipes' : 'Meal Planner'}
          </h1>
          <div className="flex-1 flex justify-end">
            <button
              onClick={toggleTheme}
              className="p-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors touch-manipulation"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
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
              onClick={() => setActiveTab('planner')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'planner' || activeTab === 'shop'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Meal Planner
            </button>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'recipes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Manage Recipes
            </button>
          </div>
        </div>

        {/* Planner Tab Content */}
        {activeTab === 'planner' && (
          <>
            <Controls
              days={days}
              setDays={setDays}
              generateRandomPlan={generateRandomPlan}
              initManualPlan={initManualPlan}
              clearAllData={clearAllData}
              onOpenTemplates={() => setShowTemplateModal(true)}
              onOpenPantry={() => setShowPantryModal(true)}
              hasTemplates={templates.length > 0}
            />

            <QuickRecipes
              favoriteRecipes={favoriteRecipes}
              recentRecipes={recentRecipes}
              onAssign={handleAssign}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
              days={days}
            />

            <SearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredRecipes={filteredRecipes}
              onAssign={handleAssign}
              days={days}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />

            <MealPlan
              plan={plan}
              setSelectedDayForPicker={setSelectedDayForPicker}
              updateServings={updateServings}
              onReorderDays={handleReorderDays}
              onRemoveRecipe={removeMealPlanRecipe}
            />

            {/* Shopping list shown on desktop in planner tab */}
            <div className="hidden sm:block">
              <ShoppingList
                plan={plan}
                shoppingList={shoppingListMemo}
                toggleHaveItem={toggleHaveItem}
                onOpenPantry={() => setShowPantryModal(true)}
              />
            </div>

            <RecipePickerModal
              selectedDayForPicker={selectedDayForPicker}
              setSelectedDayForPicker={setSelectedDayForPicker}
              searchTerm={searchTerm}
              filteredRecipes={filteredRecipes}
              recipes={allRecipes}
              assignRecipeToDay={assignRecipeToDay}
              isCustomRecipe={isCustomRecipe}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
            />

            <PantryModal
              isOpen={showPantryModal}
              onClose={() => setShowPantryModal(false)}
              pantryStaples={pantryStaples}
              onAddStaple={addPantryStaple}
              onRemoveStaple={removePantryStaple}
            />

            <TemplateModal
              isOpen={showTemplateModal}
              onClose={() => setShowTemplateModal(false)}
              templates={templates}
              onSaveTemplate={saveTemplate}
              onLoadTemplate={loadTemplate}
              onDeleteTemplate={deleteTemplate}
              currentPlanHasRecipes={plan.some(p => p.recipe !== null)}
            />
          </>
        )}

        {/* Shop Tab Content - Mobile only separate view */}
        {activeTab === 'shop' && (
          <>
            <ShoppingList
              plan={plan}
              shoppingList={shoppingListMemo}
              toggleHaveItem={toggleHaveItem}
              onOpenPantry={() => setShowPantryModal(true)}
            />

            <PantryModal
              isOpen={showPantryModal}
              onClose={() => setShowPantryModal(false)}
              pantryStaples={pantryStaples}
              onAddStaple={addPantryStaple}
              onRemoveStaple={removePantryStaple}
            />
          </>
        )}

        {/* Recipes Tab Content */}
        {activeTab === 'recipes' && (
          <ManageRecipes
            recipes={allRecipes}
            onAddRecipe={addRecipe}
            onUpdateRecipe={updateRecipe}
            onDeleteRecipe={deleteRecipeWithUndo}
            onDuplicateRecipe={duplicateRecipe}
            isCustomRecipe={isCustomRecipe}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <button
              onClick={() => setShowPrivacyPolicy(true)}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors touch-manipulation py-2"
            >
              Privacy Policy
            </button>
            <span className="hidden sm:inline">•</span>
            <button
              onClick={handleShowOnboarding}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors touch-manipulation py-2"
            >
              App Tutorial
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        shoppingCount={shoppingNeededCount}
      />

      {/* Undo Toast */}
      <UndoToast action={undoAction} onDismiss={dismissUndo} />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
      />
    </div>
  );
}

export default App;
