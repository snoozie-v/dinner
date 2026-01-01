// App.jsx
import React, { useState, useMemo } from 'react';
import recipes from './recipes.json'; // your array of recipe objects

function App() {
  const [days, setDays] = useState(7); // default to a week — more realistic than 30
  const [plan, setPlan] = useState([]); // array of { recipe, servingsMultiplier }
  const [servingsOverrides, setServingsOverrides] = useState({}); // recipe.id → custom multiplier

  const generatePlan = () => {
    const newPlan = [];
    for (let i = 0; i < days; i++) {
      const randomIndex = Math.floor(Math.random() * recipes.length);
      const recipe = recipes[randomIndex];
      newPlan.push({
        id: `${i}-${recipe.id}`, // unique key for list
        recipe,
        servingsMultiplier: 1,
      });
    }
    setPlan(newPlan);
    setServingsOverrides({});
  };

  // Shopping list aggregation
  const shoppingList = useMemo(() => {
    const map = new Map(); // key: "name|unit" → {name, unit, totalQty, items: [...]}

    plan.forEach(({ recipe, servingsMultiplier }) => {
      recipe.ingredients?.forEach((ing) => {
        if (!ing || !ing.name) return;
        const key = `${ing.name}|${ing.unit || 'unit'}`;
        const qty = (ing.quantity || 0) * servingsMultiplier;

        if (!map.has(key)) {
          map.set(key, {
            name: ing.name,
            unit: ing.unit || 'unit',
            totalQty: 0,
            count: 0,
            preparation: ing.preparation || '',
            category: ing.category || 'other',
          });
        }

        const item = map.get(key);
        item.totalQty += qty;
        item.count += 1;
      });
    });

    // Sort by category then name
    return Array.from(map.values())
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      })
      .map((item) => ({
        ...item,
        displayQty: item.totalQty % 1 === 0 ? item.totalQty : item.totalQty.toFixed(1),
      }));
  }, [plan]);

  const updateServings = (planItemId, multiplier) => {
    setPlan((prev) =>
      prev.map((item) =>
        item.id === planItemId ? { ...item, servingsMultiplier: multiplier } : item
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-10">
          Weekly Dinner Planner
        </h1>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12 bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center gap-3">
            <label className="text-gray-700 font-medium">Plan for</label>
            <input
              type="number"
              min="1"
              max="30"
              value={days}
              onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-700 font-medium">days</span>
          </div>

          <button
            onClick={generatePlan}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
          >
            Generate Plan
          </button>
        </div>

        {/* Plan */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Meal Plan</h2>

          {plan.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
              <p className="text-gray-500 text-lg">
                Click "Generate Plan" to start planning your meals!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {plan.map((planItem) => {
                const { recipe, servingsMultiplier } = planItem;
                const effectiveServings = Math.round(recipe.servings?.default * servingsMultiplier);

                return (
                  <div
                    key={planItem.id}
                    className="bg-white rounded-xl shadow-md border overflow-hidden"
                  >
                    <div className="p-5 border-b bg-gray-50">
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            Day {plan.indexOf(planItem) + 1}: {recipe.name}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                              {effectiveServings} {recipe.servings?.unit || 'servings'}
                            </span>
                            {recipe.tags?.slice(0, 4).map((tag) => (
                              <span
                                key={tag}
                                className="px-2.5 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Quick servings adjust */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-600">Servings:</span>
                          {[0.5, 1, 1.5, 2].map((m) => (
                            <button
                              key={m}
                              onClick={() => updateServings(planItem.id, m)}
                              className={`px-3 py-1.5 text-sm rounded-md border ${
                                servingsMultiplier === m
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 hover:bg-gray-100'
                              }`}
                            >
                              ×{m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
                        {recipe.prepTime && <div>Prep: {recipe.prepTime.replace('PT', '').replace('M', ' min')}</div>}
                        {recipe.cookTime && <div>Cook: {recipe.cookTime.replace('PT', '').replace('M', ' min')}</div>}
                        {recipe.totalTime && <div>Total: {recipe.totalTime.replace('PT', '').replace('M', ' min')}</div>}
                        {recipe.difficulty && <div>Difficulty: {recipe.difficulty}</div>}
                      </div>
                    </div>

                    {/* Ingredients & Instructions */}
                    <div className="p-5 grid md:grid-cols-2 gap-6">
                      {/* Ingredients */}
                      <div>
                        <h4 className="font-medium text-gray-800 mb-3">Ingredients</h4>
                        <ul className="space-y-2 text-gray-700">
                          {recipe.ingredients?.map((ing, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>
                                <strong>
                                  {ing.quantity * servingsMultiplier} {ing.unit || ''}
                                </strong>{' '}
                                {ing.name}
                                {ing.preparation && ` (${ing.preparation})`}
                              </span>
                            </li>
                          )) || <li className="text-gray-400">No ingredients listed</li>}
                        </ul>
                      </div>

                      {/* Instructions */}
                      <div>
                        <h4 className="font-medium text-gray-800 mb-3">Instructions</h4>
                        {recipe.instructions?.length > 0 ? (
                          <div className="space-y-4">
                            {recipe.instructions.map((section, sIdx) => (
                              <div key={sIdx}>
                                {section.section && (
                                  <h5 className="font-medium text-gray-700 mb-2">{section.section}</h5>
                                )}
                                <ol className="list-decimal pl-5 space-y-1.5 text-gray-700">
                                  {section.steps.map((step, stepIdx) => (
                                    <li key={stepIdx}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400">No instructions available</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Shopping List */}
        {plan.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Shopping List</h2>
            <div className="bg-white rounded-xl shadow-md border p-6">
              {shoppingList.length === 0 ? (
                <p className="text-gray-500">No ingredients found in selected recipes.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {shoppingList.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div>
                        <div className="font-medium text-gray-800">
                          {item.displayQty} {item.unit} {item.name}
                        </div>
                        {item.preparation && (
                          <div className="text-sm text-gray-500">{item.preparation}</div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        {item.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
