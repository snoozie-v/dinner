// src/components/ShoppingList.jsx
import React from 'react';

const ShoppingList = ({ plan, shoppingList, updateShoppingAdjustment, toggleHaveItem, toggleOrdered, copyNeededItems }) => {
  if (plan.length === 0) return null;

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Shopping List</h2>
        <button
          onClick={copyNeededItems}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
        >
          Copy Needed Items
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-md border p-6">
        {shoppingList.length === 0 ? (
          <p className="text-gray-500">No ingredients found in selected recipes.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shoppingList.map((item) => (
              <div
                key={item.key}
                className={`flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100 ${
                  item.haveQty >= item.totalQty ? 'opacity-50 line-through' : ''
                } ${item.ordered ? 'bg-green-100' : ''}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium text-gray-800">
                    {item.displayNeeded} / {item.displayTotal} {item.unit} {item.name}
                  </div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    {item.category}
                  </span>
                </div>
                {item.preparation && (
                  <div className="text-sm text-gray-500 mb-2">{item.preparation}</div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm text-gray-600">Have:</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={item.totalQty}
                    value={item.haveQty}
                    onChange={(e) => updateShoppingAdjustment(item.key, e.target.value)}
                    className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => toggleHaveItem(item.key, item.totalQty)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {item.haveQty >= item.totalQty ? 'Unmark' : 'Mark as Have'}
                  </button>
                </div>
                <button
                  onClick={() => toggleOrdered(item.key)}
                  className={`text-sm ${item.ordered ? 'text-red-600 hover:underline' : 'text-green-600 hover:underline'}`}
                >
                  {item.ordered ? 'Unmark as Ordered' : 'Mark as Ordered'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ShoppingList;
