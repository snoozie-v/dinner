// src/components/ShoppingList.tsx
import { useState, useMemo } from 'react';
import type { PlanItem, ShoppingItem } from '../types';

interface ShoppingListProps {
  plan: PlanItem[];
  shoppingList: ShoppingItem[];
  toggleHaveItem: (key: string, totalQty: number) => void;
}

// Category display names and order for shopping flow (roughly store layout)
const CATEGORY_ORDER: Record<string, { label: string; order: number }> = {
  'produce': { label: 'Produce', order: 1 },
  'bakery': { label: 'Bakery', order: 2 },
  'dairy': { label: 'Dairy', order: 3 },
  'protein/meat': { label: 'Meat', order: 4 },
  'protein/seafood': { label: 'Seafood', order: 5 },
  'frozen': { label: 'Frozen', order: 6 },
  'canned goods': { label: 'Canned Goods', order: 7 },
  'pasta/grains': { label: 'Pasta & Grains', order: 8 },
  'spices': { label: 'Spices & Seasonings', order: 9 },
  'pantry': { label: 'Pantry', order: 10 },
  'other': { label: 'Other', order: 99 },
};

const getCategoryInfo = (category: string) => {
  return CATEGORY_ORDER[category] || { label: category, order: 50 };
};

// Format quantity for display - round to practical shopping amounts
const formatQuantity = (qty: number, unit: string): string => {
  if (qty === 0) return '';

  // Round to reasonable amounts
  let displayQty: string;
  if (qty < 1) {
    // Show fractions for small amounts
    if (qty <= 0.25) displayQty = '¼';
    else if (qty <= 0.33) displayQty = '⅓';
    else if (qty <= 0.5) displayQty = '½';
    else if (qty <= 0.67) displayQty = '⅔';
    else if (qty <= 0.75) displayQty = '¾';
    else displayQty = '1';
  } else if (qty % 1 === 0) {
    displayQty = String(qty);
  } else {
    // Round to nearest 0.5 for larger quantities
    displayQty = String(Math.ceil(qty * 2) / 2);
  }

  return `${displayQty} ${unit}`.trim();
};

const ShoppingList = ({
  plan,
  shoppingList,
  toggleHaveItem,
}: ShoppingListProps) => {
  const [hideCompleted, setHideCompleted] = useState(false);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = new Map<string, ShoppingItem[]>();

    shoppingList.forEach(item => {
      const category = item.category || 'other';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(item);
    });

    // Sort groups by category order
    return Array.from(groups.entries())
      .sort(([a], [b]) => getCategoryInfo(a).order - getCategoryInfo(b).order)
      .map(([category, items]) => ({
        category,
        label: getCategoryInfo(category).label,
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [shoppingList]);

  // Stats
  const stats = useMemo(() => {
    const total = shoppingList.length;
    const completed = shoppingList.filter(item => item.haveQty >= item.totalQty).length;
    const needed = total - completed;
    return { total, completed, needed };
  }, [shoppingList]);

  // Generate copy text grouped by category
  const generateCopyText = (): string => {
    const lines: string[] = [];

    groupedItems.forEach(({ label, items }) => {
      const neededItems = items.filter(item => item.haveQty < item.totalQty);
      if (neededItems.length === 0) return;

      lines.push(`## ${label}`);
      neededItems.forEach(item => {
        const qty = formatQuantity(item.totalQty, item.unit);
        const prep = item.preparation ? ` (${item.preparation})` : '';
        lines.push(`- [ ] ${item.name}${qty ? ` - ${qty}` : ''}${prep}`);
      });
      lines.push('');
    });

    return lines.join('\n').trim() || 'All items collected!';
  };

  const handleCopy = () => {
    const text = generateCopyText();
    navigator.clipboard.writeText(text)
      .then(() => alert('Shopping list copied!'))
      .catch(() => alert('Failed to copy. Please try manually.'));
  };

  if (plan.length === 0) return null;

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Shopping List</h2>
          <p className="text-sm text-gray-500 mt-1">
            {stats.needed} item{stats.needed !== 1 ? 's' : ''} to get
            {stats.completed > 0 && ` • ${stats.completed} collected`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            Hide collected
          </label>
          <button
            onClick={handleCopy}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy List
          </button>
        </div>
      </div>

      {shoppingList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <p className="text-gray-500">No ingredients in your meal plan yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedItems.map(({ category, label, items }) => {
            const visibleItems = hideCompleted
              ? items.filter(item => item.haveQty < item.totalQty)
              : items;

            if (visibleItems.length === 0) return null;

            const categoryCompleted = items.filter(item => item.haveQty >= item.totalQty).length;

            return (
              <div key={category} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">{label}</h3>
                  <span className="text-xs text-gray-500">
                    {categoryCompleted}/{items.length} collected
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {visibleItems.map((item) => {
                    const isCompleted = item.haveQty >= item.totalQty;
                    return (
                      <li
                        key={item.key}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                          isCompleted ? 'bg-green-50' : ''
                        }`}
                      >
                        <button
                          onClick={() => toggleHaveItem(item.key, item.totalQty)}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isCompleted
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-400'
                          }`}
                          aria-label={isCompleted ? 'Mark as needed' : 'Mark as collected'}
                        >
                          {isCompleted && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <div className={`flex-1 min-w-0 ${isCompleted ? 'opacity-60' : ''}`}>
                          <div className="flex items-baseline gap-2">
                            <span className={`font-medium text-gray-900 ${isCompleted ? 'line-through' : ''}`}>
                              {item.name}
                            </span>
                            {item.preparation && (
                              <span className="text-sm text-gray-500">
                                ({item.preparation})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatQuantity(item.totalQty, item.unit)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Shopping progress</span>
            <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(stats.completed / stats.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default ShoppingList;
