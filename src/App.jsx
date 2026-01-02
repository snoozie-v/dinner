// src/App.jsx
import React, { useState, useMemo, useEffect } from 'react';
import recipes from './recipes.json';

import Controls from './components/Controls';
import SearchBar from './components/SearchBar';
import RecipePickerModal from './components/RecipePickerModal';
import MealPlan from './components/MealPlan';
import ShoppingList from './components/ShoppingList';
import DebugPlan from './components/DebugPlan';

function App() {
  const [days, setDays] = useState(3);
  const [plan, setPlan] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDayForPicker, setSelectedDayForPicker] = useState(null);
  const [shoppingAdjustments, setShoppingAdjustments] = useState({}); // { key: { haveQty: number } }
  const [shoppingOrders, setShoppingOrders] = useState({}); // New: { key: { ordered: boolean } }

  const filteredRecipes = useMemo(() => {
    if (!searchTerm.trim()) return recipes;

    const term = searchTerm.toLowerCase().trim();
    return recipes.filter((recipe) =>
      recipe?.ingredients?.some((ing) =>
        ing?.name?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm]);

  const generateRandomPlan = () => {
    const newPlan = [];
    for (let i = 0; i < days; i++) {
      const randomIndex = Math.floor(Math.random() * recipes.length);
      const recipe = recipes[randomIndex];
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
    setShoppingOrders({}); // Clear on new plan
  };

  const initManualPlan = () => {
    const newPlan = [];
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

  const assignRecipeToDay = (dayIndex, newRecipe) => {
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

  const updateServings = (planItemId, multiplier) => {
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

  const shoppingListMemo = useMemo(() => {
    const map = new Map();

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

        const item = map.get(key);
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

  const updateShoppingAdjustment = (key, haveQty) => {
    setShoppingAdjustments((prev) => ({
      ...prev,
      [key]: { haveQty: parseFloat(haveQty) || 0 },
    }));
  };

  const toggleHaveItem = (key, totalQty) => {
    setShoppingAdjustments((prev) => {
      const current = prev[key] || { haveQty: 0 };
      const newHave = current.haveQty > 0 ? 0 : totalQty;
      return {
        ...prev,
        [key]: { haveQty: newHave },
      };
    });
  };

  const toggleOrdered = (key) => {
    setShoppingOrders((prev) => {
      const current = prev[key] || { ordered: false };
      return {
        ...prev,
        [key]: { ordered: !current.ordered },
      };
    });
  };

  const copyNeededItems = () => {
    const needed = shoppingListMemo
      .filter((item) => item.neededQty > 0 && !item.ordered)
      .map((item) => `- ${item.displayNeeded} ${item.unit} ${item.name}${item.preparation ? ` (${item.preparation})` : ''}`)
      .join('\n');

    navigator.clipboard.writeText(needed)
      .then(() => alert('Needed items copied to clipboard!'))
      .catch(() => alert('Failed to copy. Please try manually.'));
  };

  const planDebug = plan.map((p) => ({
    day: p.day,
    recipeName: p.recipe?.name || '(placeholder or missing)',
    hasIngredients: !!p.recipe?.ingredients?.length,
    hasInstructions: !!p.recipe?.instructions?.length,
    servingsMultiplier: p.servingsMultiplier,
  }));

  const handleAssign = (recipe, dayIndex) => {
    assignRecipeToDay(dayIndex, recipe);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-10">
          Weekly Dinner Planner
        </h1>

        <Controls
          days={days}
          setDays={setDays}
          generateRandomPlan={generateRandomPlan}
          initManualPlan={initManualPlan}
        />

        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredRecipes={filteredRecipes}
          onAssign={handleAssign}
          days={days}
        />

        <DebugPlan planDebug={planDebug} />

        <MealPlan
          plan={plan}
          setSelectedDayForPicker={setSelectedDayForPicker}
          updateServings={updateServings}
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
          recipes={recipes}
          assignRecipeToDay={assignRecipeToDay}
        />
      </div>
    </div>
  );
}

export default App;
