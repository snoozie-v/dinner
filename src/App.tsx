// src/App.tsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import defaultRecipes from './recipes.json';
import type { Recipe, PlanItem, ShoppingItem, ShoppingAdjustments, ShoppingOrders, ActiveTab } from './types';

import Controls from './components/Controls';
import SearchBar from './components/SearchBar';
import RecipePickerModal from './components/RecipePickerModal';
import MealPlan from './components/MealPlan';
import ShoppingList from './components/ShoppingList';
import ManageRecipes from './components/recipes/ManageRecipes';

import { useRecipes } from './hooks/useRecipes';

// localStorage keys
const STORAGE_KEYS = {
  DAYS: 'dinner-planner-days',
  PLAN: 'dinner-planner-plan',
  SHOPPING_ADJUSTMENTS: 'dinner-planner-shopping-adjustments',
  SHOPPING_ORDERS: 'dinner-planner-shopping-orders',
} as const;

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
  const [shoppingOrders, setShoppingOrders] = useState<ShoppingOrders>(() =>
    getStoredValue(STORAGE_KEYS.SHOPPING_ORDERS, {})
  );

  // Tab state: 'planner' or 'recipes'
  const [activeTab, setActiveTab] = useState<ActiveTab>('planner');

  // Recipe CRUD operations
  const {
    allRecipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    duplicateRecipe,
    isCustomRecipe
  } = useRecipes(defaultRecipes as Recipe[]);

  const filteredRecipes = useMemo<Recipe[]>(() => {
    if (!searchTerm.trim()) return allRecipes;

    const term = searchTerm.toLowerCase().trim();
    return allRecipes.filter((recipe) =>
      recipe?.ingredients?.some((ing) =>
        ing?.name?.toLowerCase().includes(term)
      )
    );
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
    localStorage.setItem(STORAGE_KEYS.SHOPPING_ORDERS, JSON.stringify(shoppingOrders));
  }, [shoppingOrders]);

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
    setShoppingOrders({});
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
    setShoppingOrders({});
  };

  const assignRecipeToDay = (dayIndex: number, newRecipe: Recipe | null): void => {
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

    return Array.from(map.values())
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      })
      .map((item) => {
        const adj = shoppingAdjustments[item.key] || { haveQty: 0 };
        const order = shoppingOrders[item.key] || { ordered: false };
        const neededQty = Math.max(0, item.totalQty - adj.haveQty);
        return {
          ...item,
          haveQty: adj.haveQty,
          ordered: order.ordered,
          neededQty,
          displayNeeded: neededQty % 1 === 0 ? neededQty : neededQty.toFixed(1),
          displayTotal: item.totalQty % 1 === 0 ? item.totalQty : item.totalQty.toFixed(1),
        };
      });
  }, [plan, shoppingAdjustments, shoppingOrders]);

  const updateShoppingAdjustment = (key: string, haveQty: string | number): void => {
    setShoppingAdjustments((prev) => ({
      ...prev,
      [key]: { haveQty: parseFloat(String(haveQty)) || 0 },
    }));
  };

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

  const toggleOrdered = (key: string): void => {
    setShoppingOrders((prev) => {
      const current = prev[key] || { ordered: false };
      return {
        ...prev,
        [key]: { ordered: !current.ordered },
      };
    });
  };

  const copyNeededItems = (): void => {
    const needed = shoppingListMemo
      .filter((item) => item.neededQty > 0 && !item.ordered)
      .map((item) => `- ${item.displayNeeded} ${item.unit} ${item.name}${item.preparation ? ` (${item.preparation})` : ''}`)
      .join('\n');

    navigator.clipboard.writeText(needed)
      .then(() => alert('Needed items copied to clipboard!'))
      .catch(() => alert('Failed to copy. Please try manually.'));
  };

  const clearAllData = (): void => {
    if (window.confirm('Clear all saved data? This will reset your meal plan and shopping list.')) {
      Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
      setDays(3);
      setPlan([]);
      setShoppingAdjustments({});
      setShoppingOrders({});
      setSearchTerm('');
      setSelectedDayForPicker(null);
    }
  };

  const handleAssign = (recipe: Recipe, dayIndex: number): void => {
    assignRecipeToDay(dayIndex, recipe);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-6">
          Weekly Dinner Planner
        </h1>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('planner')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'planner'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Meal Planner
            </button>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'recipes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Manage Recipes
            </button>
          </div>
        </div>

        {activeTab === 'planner' ? (
          <>
            <Controls
              days={days}
              setDays={setDays}
              generateRandomPlan={generateRandomPlan}
              initManualPlan={initManualPlan}
              clearAllData={clearAllData}
            />

            <SearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredRecipes={filteredRecipes}
              onAssign={handleAssign}
              days={days}
            />

            <MealPlan
              plan={plan}
              setSelectedDayForPicker={setSelectedDayForPicker}
              updateServings={updateServings}
              onReorderDays={handleReorderDays}
            />

            <ShoppingList
              plan={plan}
              shoppingList={shoppingListMemo}
              updateShoppingAdjustment={updateShoppingAdjustment}
              toggleHaveItem={toggleHaveItem}
              toggleOrdered={toggleOrdered}
              copyNeededItems={copyNeededItems}
            />

            <RecipePickerModal
              selectedDayForPicker={selectedDayForPicker}
              setSelectedDayForPicker={setSelectedDayForPicker}
              searchTerm={searchTerm}
              filteredRecipes={filteredRecipes}
              recipes={allRecipes}
              assignRecipeToDay={assignRecipeToDay}
              isCustomRecipe={isCustomRecipe}
            />
          </>
        ) : (
          <ManageRecipes
            recipes={allRecipes}
            onAddRecipe={addRecipe}
            onUpdateRecipe={updateRecipe}
            onDeleteRecipe={deleteRecipe}
            onDuplicateRecipe={duplicateRecipe}
            isCustomRecipe={isCustomRecipe}
          />
        )}
      </div>
    </div>
  );
}

export default App;
