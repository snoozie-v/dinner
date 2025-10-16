import React, { useState } from 'react';
import recipes from './recipes.json'; // Assuming recipes.json is in the same directory as App.jsx; adjust the path if needed

function App() {
  const [days, setDays] = useState(30);
  // const [preferredIngredients, setPreferredIngredients] = useState('');
  const [plan, setPlan] = useState([]);
  // const [shoppingList, setShoppingList] = useState({});

  const generatePlan = () => {
    // For now, ignore preferredIngredients since recipes don't have ingredient data yet
    // Randomly select recipes for each day (with replacement)
    const selectedPlan = [];
    for (let i = 0; i < days; i++) {
      const randomIndex = Math.floor(Math.random() * recipes.length);
      selectedPlan.push(recipes[randomIndex]);
    }
    setPlan(selectedPlan);

    // Shopping list is empty for now since no ingredients are defined
    // setShoppingList({});
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Dinner Planner</h1>
      
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8 w-full max-w-md">
        <label className="flex items-center gap-2 text-gray-700">
          Days:
          <input
            type="number"
            value={days}
            onChange={e => setDays(e.target.value)}
            className="border border-gray-300 rounded-md p-2 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        {/* <label className="flex items-center gap-2 text-gray-700">
          Preferred Ingredients (comma-separated):
          <input
            value={preferredIngredients}
            onChange={e => setPreferredIngredients(e.target.value)}
            className="border border-gray-300 rounded-md p-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label> */}
        <button
          onClick={generatePlan}
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition duration-200"
        >
          Generate Plan
        </button>
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Plan:</h2>
      <div className="w-full max-w-2xl space-y-4">
        {plan.map((recipe, index) => (
          <div
            key={index}
            className="bg-white shadow-md rounded-lg p-4 border border-gray-200"
          >
            <h3 className="text-xl font-medium text-gray-900">
              Day {index + 1}: {recipe.name}
            </h3>
            {/* Ingredients, steps, and image are commented out for now since they're not in the JSON */}
            {/* <p className="text-gray-600 mt-2">Ingredients: {recipe.ingredients ? recipe.ingredients.join(', ') : 'N/A'}</p> */}
            {/* <p className="text-gray-600 mt-2">Steps: {recipe.steps ? recipe.steps.join(' ') : 'N/A'}</p> */}
            {/* {recipe.image_url && <img src={recipe.image_url} alt={recipe.name} className="mt-4 rounded-md w-full max-w-xs" />} */}
          </div>
        ))}
        {plan.length === 0 && (
          <p className="text-gray-500 italic">Click "Generate Plan" to create your meal plan!</p>
        )}
      </div>
      
      {/* <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Shopping List:</h2>
      <ul className="w-full max-w-2xl bg-white shadow-md rounded-lg p-4 space-y-2">
        {Object.entries(shoppingList).map(([item, count]) => (
          <li key={item} className="text-gray-700">{item} (x{count})</li>
        ))}
        {Object.keys(shoppingList).length === 0 && <li className="text-gray-500">No items yet (add ingredients to recipes for shopping list)</li>}
      </ul> */}
    </div>
  );
}

export default App;
