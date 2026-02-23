// src/components/ShoppingList.tsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { PlanItem, Recipe, ShoppingItem } from '../types';
import SwipeableShoppingItem from './SwipeableShoppingItem';
import { openExternalUrl, copyToClipboard, shareText, canNativeShare } from '../utils/platform';
import { PROXY_URL } from '../config';
import { usePersistedState } from '../hooks/usePersistedState';
import { STORAGE_KEYS } from '../utils/storage';

interface ShoppingListProps {
  plan: PlanItem[];
  allRecipes: Recipe[];
  shoppingList: ShoppingItem[];
  toggleHaveItem: (key: string, totalQty: number) => void;
  onOpenPantry: () => void;
  onViewRecipe: (recipe: Recipe) => void;
  totalDays: number;
  selectedDays: Set<number>;
  onSelectedDaysChange: (days: Set<number>) => void;
}

// Category display names and order for shopping flow (roughly store layout)
const CATEGORY_ORDER: Record<string, { label: string; order: number }> = {
  'produce': { label: 'Produce', order: 1 },
  'bakery': { label: 'Bakery', order: 2 },
  'dairy': { label: 'Dairy', order: 3 },
  'protein/meat': { label: 'Meat', order: 4 },
  'meat': { label: 'Meat', order: 4 },            // alias for non-standard category value
  'protein/seafood': { label: 'Seafood', order: 5 },
  'seafood': { label: 'Seafood', order: 5 },       // alias for non-standard category value
  'frozen': { label: 'Frozen', order: 6 },
  'canned goods': { label: 'Canned Goods', order: 7 },
  'pasta/grains': { label: 'Pasta & Grains', order: 8 },
  'spices': { label: 'Spices & Seasonings', order: 9 },
  'pantry': { label: 'Pantry', order: 10 },
  'condiments': { label: 'Condiments', order: 11 },
  'other': { label: 'Other', order: 99 },
};

const getCategoryInfo = (category: string) => {
  return CATEGORY_ORDER[category] || { label: category, order: 50 };
};

// Format a raw quantity number as a readable fraction or decimal string.
const formatQtyNumber = (qty: number): string => {
  if (qty < 1) {
    if (qty <= 0.125) return '⅛';
    if (qty <= 0.25)  return '¼';
    if (qty <= 0.33)  return '⅓';
    if (qty <= 0.5)   return '½';
    if (qty <= 0.67)  return '⅔';
    if (qty <= 0.75)  return '¾';
    return '1';
  }
  if (qty % 1 === 0) return String(qty);
  // Try mixed-number fractions for common cases (e.g. 1.5 → "1½")
  const whole = Math.floor(qty);
  const frac = qty - whole;
  const fracStr = frac <= 0.125 ? '⅛' : frac <= 0.25 ? '¼' : frac <= 0.33 ? '⅓'
    : frac <= 0.5 ? '½' : frac <= 0.67 ? '⅔' : frac <= 0.75 ? '¾' : null;
  if (whole >= 1 && fracStr) return `${whole}${fracStr}`;
  // Fall back to nearest 0.5
  return String(Math.ceil(qty * 2) / 2);
};

// Format quantity for display - round to practical shopping amounts
const formatQuantity = (qty: number, unit: string): string => {
  if (qty === 0) return 'as needed';

  // Suppress the "unit" label — show bare count for countable items
  if (unit === 'unit' || unit === '') return formatQtyNumber(qty);

  // Convert large tablespoon quantities to cups for readability
  // 16 tablespoons = 1 cup;  butter - 17 tablespoon → "1 cup + 1 tablespoon"
  if (unit === 'tablespoon' && qty >= 4) {
    const cups = Math.floor(qty / 16);
    const remTbsp = Math.round(qty % 16);
    if (cups >= 1) {
      const cupStr = formatQtyNumber(cups);
      if (remTbsp === 0) return `${cupStr} cup`;
      return `${cupStr} cup + ${remTbsp} tablespoon`;
    }
  }

  return `${formatQtyNumber(qty)} ${unit}`.trim();
};

// For canned pantry items measured in ounces, show an approximate can count hint.
// Assumes a standard 15oz can; skips when qty < 14 (less than one can).
const canHint = (qty: number, unit: string, name: string): string | null => {
  if (unit !== 'ounce') return null;
  if (qty < 14) return null;
  const CANNED_WORDS = /bean|tomato|corn|pea|pumpkin|lentil|chickpea|artichoke|coconut milk/i;
  if (!CANNED_WORDS.test(name)) return null;
  const cans = Math.round(qty / 15);
  return cans >= 1 ? `≈ ${cans} can${cans !== 1 ? 's' : ''}` : null;
};

const ShoppingList = ({
  plan,
  allRecipes,
  shoppingList,
  toggleHaveItem,
  onOpenPantry,
  onViewRecipe,
  totalDays,
  selectedDays,
  onSelectedDaysChange,
}: ShoppingListProps) => {
  const [hideCompleted, setHideCompleted] = usePersistedState<boolean>(STORAGE_KEYS.HIDE_COMPLETED_SHOPPING, false);
  const [swipeHintSeen, setSwipeHintSeen] = usePersistedState<boolean>(STORAGE_KEYS.SWIPE_HINT_SEEN, false);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setCopyToast(msg);
    setTimeout(() => setCopyToast(null), 3000);
  }, []);

  // Build name → recipe lookup for breakdown navigation
  const recipeByName = useMemo(() => {
    const map = new Map<string, Recipe>();
    for (const r of allRecipes) {
      if (r.name) map.set(r.name, r);
    }
    return map;
  }, [allRecipes]);

  const [instacartEnabled, setInstacartEnabled] = useState(false);
  const [isLoadingInstacart, setIsLoadingInstacart] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Check if Instacart integration is enabled
  useEffect(() => {
    const checkInstacartStatus = async () => {
      try {
        const response = await fetch(`${PROXY_URL}/api/instacart/status`);
        const data = await response.json();
        setInstacartEnabled(data.enabled);
      } catch {
        setInstacartEnabled(false);
      }
    };
    checkInstacartStatus();
  }, []);

  // Handle Instacart button click
  const handleInstacart = async () => {
    setIsLoadingInstacart(true);

    // Get items that still need to be purchased
    // For 0-quantity items (e.g., "to taste"), include with quantity 1 if not marked as have
    const neededItems = shoppingList
      .filter(item => item.totalQty > 0 ? item.haveQty < item.totalQty : item.haveQty === 0)
      .map(item => ({
        name: item.name,
        quantity: item.totalQty > 0 ? item.totalQty - item.haveQty : 1,
        unit: item.unit || ''
      }));

    if (neededItems.length === 0) {
      showToast('All items are already collected!');
      setIsLoadingInstacart(false);
      return;
    }

    try {
      const response = await fetch(`${PROXY_URL}/api/instacart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Meal Plan - ${new Date().toLocaleDateString()}`,
          ingredients: neededItems,
          linkbackUrl: window.location.origin
        })
      });

      const data = await response.json();

      if (data.success && data.instacartUrl) {
        openExternalUrl(data.instacartUrl);
      } else {
        showToast(data.error || 'Failed to create Instacart list. Please try again.');
      }
    } catch (error) {
      console.error('Instacart error:', error);
      showToast('Failed to connect to Instacart. Please try again.');
    } finally {
      setIsLoadingInstacart(false);
    }
  };

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
    // Items with 0 total quantity (e.g., "to taste") should not count as auto-completed
    const completed = shoppingList.filter(item => item.totalQty > 0 ? item.haveQty >= item.totalQty : item.haveQty > 0).length;
    const pantryCount = shoppingList.filter(item => item.isPantryStaple).length;
    const needed = total - completed;
    return { total, completed, needed, pantryCount };
  }, [shoppingList]);

  // Generate copy text grouped by category
  const generateCopyText = (): string => {
    const lines: string[] = [];

    groupedItems.forEach(({ label, items }) => {
      const neededItems = items.filter(item => item.totalQty > 0 ? item.haveQty < item.totalQty : item.haveQty === 0);
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

  const handleCopy = async () => {
    const text = generateCopyText();
    const success = await copyToClipboard(text);
    showToast(success ? 'Shopping list copied!' : 'Failed to copy. Please try manually.');
  };

  const handleShare = async () => {
    const text = generateCopyText();
    const result = await shareText('Shopping List', text);
    if (result === 'copied') {
      showToast('Shopping list copied!');
    }
  };

  const canShare = canNativeShare();

  if (plan.length === 0) return null;

  // Get current range from selected days
  const selectedArray = Array.from(selectedDays).sort((a, b) => a - b);
  const rangeStart = selectedArray.length > 0 ? selectedArray[0] : 1;
  const rangeEnd = selectedArray.length > 0 ? selectedArray[selectedArray.length - 1] : totalDays;

  // Check if selection is a contiguous range
  const isContiguousRange = selectedArray.length === (rangeEnd - rangeStart + 1) &&
    selectedArray.every((day, idx) => day === rangeStart + idx);

  // Set a range of days
  const setDayRange = (start: number, end: number) => {
    const newSet = new Set<number>();
    for (let i = start; i <= end; i++) {
      newSet.add(i);
    }
    onSelectedDaysChange(newSet);
  };

  // Select all days
  const selectAllDays = () => {
    setDayRange(1, totalDays);
  };

  const allDaysSelected = selectedDays.size === totalDays;

  // Calculate weeks for quick selection
  const numWeeks = Math.ceil(totalDays / 7);

  return (
    <section>
      {/* Copy/action toast */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-full shadow-lg pointer-events-none animate-fade-in">
          {copyToast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Shopping List</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {stats.needed} item{stats.needed !== 1 ? 's' : ''} to get
            {stats.completed > 0 && ` • ${stats.completed} collected`}
            {stats.pantryCount > 0 && (
              <span className="text-green-600 dark:text-green-400"> • {stats.pantryCount} from pantry</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition touch-manipulation min-h-[44px]">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
            />
            Hide collected
          </label>
          <button
            onClick={onOpenPantry}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded-lg transition flex items-center gap-2 touch-manipulation min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Pantry
          </button>
          <button
            onClick={handleCopy}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition text-sm font-medium flex items-center gap-2 touch-manipulation min-h-[44px]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
          {canShare && (
            <button
              onClick={handleShare}
              className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 active:bg-green-800 transition text-sm font-medium flex items-center gap-2 touch-manipulation min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}
          {instacartEnabled && (
            <button
              onClick={handleInstacart}
              disabled={isLoadingInstacart || stats.needed === 0}
              className="bg-[#003D29] text-white px-4 py-2.5 rounded-lg hover:bg-[#004D35] active:bg-[#002D1F] transition text-sm font-medium flex items-center gap-2 touch-manipulation min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Shop with Instacart"
            >
              {isLoadingInstacart ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-3l1.1-2h7.5c.7 0 1.4-.4 1.7-1l3.9-7-1.7-1-3.9 7h-7L4.3 2H1v2h2l3.6 7.6L5.2 14c-.1.3-.2.6-.2 1 0 1.1.9 2 2 2h12v-2H7.4c-.1 0-.2-.1-.2-.2v-.1z"/>
                </svg>
              )}
              {isLoadingInstacart ? 'Loading...' : 'Instacart'}
            </button>
          )}
        </div>
      </div>

      {/* Day range selector for filtering shopping list */}
      {totalDays > 1 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Range selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Shop for days
              </span>
              <select
                value={rangeStart}
                onChange={(e) => {
                  const newStart = Number(e.target.value);
                  setDayRange(newStart, Math.max(newStart, rangeEnd));
                }}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm min-h-[44px] touch-manipulation"
              >
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">to</span>
              <select
                value={rangeEnd}
                onChange={(e) => {
                  const newEnd = Number(e.target.value);
                  setDayRange(Math.min(rangeStart, newEnd), newEnd);
                }}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm min-h-[44px] touch-manipulation"
              >
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick presets */}
            <div className="flex items-center gap-2 flex-wrap">
              {numWeeks > 1 && Array.from({ length: Math.min(numWeeks, 4) }, (_, i) => {
                const weekStart = i * 7 + 1;
                const weekEnd = Math.min((i + 1) * 7, totalDays);
                const isActive = rangeStart === weekStart && rangeEnd === weekEnd && isContiguousRange;
                return (
                  <button
                    key={i}
                    onClick={() => setDayRange(weekStart, weekEnd)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors touch-manipulation ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Week {i + 1}
                  </button>
                );
              })}
              {!allDaysSelected && (
                <button
                  onClick={selectAllDays}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors touch-manipulation"
                >
                  All {totalDays} days
                </button>
              )}
            </div>
          </div>

          {/* Selection summary */}
          {!allDaysSelected && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Showing ingredients for {isContiguousRange ? `days ${rangeStart}-${rangeEnd}` : `${selectedDays.size} selected days`} ({selectedDays.size} of {totalDays} days)
            </p>
          )}
        </div>
      )}

      {/* One-time swipe discovery hint */}
      {!swipeHintSeen && shoppingList.length > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <span className="text-blue-500 dark:text-blue-400 text-lg">👆</span>
          <p className="flex-1 text-sm text-blue-700 dark:text-blue-300">
            <span className="font-medium">Tip:</span> Swipe an item right to mark it collected
          </p>
          <button
            onClick={() => setSwipeHintSeen(true)}
            className="text-blue-400 dark:text-blue-500 hover:text-blue-600 dark:hover:text-blue-300 p-1"
            aria-label="Dismiss tip"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {shoppingList.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No ingredients in your meal plan yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedItems.map(({ category, label, items }) => {
            const visibleItems = hideCompleted
              ? items.filter(item => item.totalQty > 0 ? item.haveQty < item.totalQty : item.haveQty === 0)
              : items;

            if (visibleItems.length === 0) return null;

            const categoryCompleted = items.filter(item => item.totalQty > 0 ? item.haveQty >= item.totalQty : item.haveQty > 0).length;

            return (
              <div key={category} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">{label}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {categoryCompleted}/{items.length} collected
                  </span>
                </div>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {visibleItems.map((item) => {
                    const isCompleted = item.totalQty > 0 ? item.haveQty >= item.totalQty : item.haveQty > 0;
                    return (
                      <li
                        key={item.key}
                        onMouseEnter={() => setHoveredKey(item.key)}
                        onMouseLeave={() => setHoveredKey(null)}
                      >
                        <SwipeableShoppingItem
                          onSwipeComplete={() => toggleHaveItem(item.key, item.totalQty)}
                          isCompleted={isCompleted}
                        >
                          <div
                            className={`flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                              isCompleted ? 'bg-green-50 dark:bg-green-900/20' : ''
                            }`}
                            onClick={() => setExpandedKey(prev => prev === item.key ? null : item.key)}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleHaveItem(item.key, item.totalQty); }}
                              className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors touch-manipulation ${
                                isCompleted
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-green-400 active:border-green-500'
                              }`}
                              aria-label={isCompleted ? 'Mark as needed' : 'Mark as collected'}
                            >
                              {isCompleted && (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                            <div className={`flex-1 min-w-0 ${isCompleted ? 'opacity-60' : ''}`}>
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className={`font-medium text-gray-900 dark:text-gray-100 ${isCompleted ? 'line-through' : ''}`}>
                                  {item.name}
                                </span>
                                {item.preparation && (
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    ({item.preparation})
                                  </span>
                                )}
                                {item.isPantryStaple && (
                                  <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                    pantry
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-baseline gap-2 flex-wrap">
                                <span>{formatQuantity(item.totalQty, item.unit)}</span>
                                {canHint(item.totalQty, item.unit, item.name) && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {canHint(item.totalQty, item.unit, item.name)}
                                  </span>
                                )}
                                {item.recipeBreakdown.length > 1 && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    used in {item.recipeBreakdown.length} recipes
                                  </span>
                                )}
                              </div>
                              {/^[\d\/]/.test(item.name) && item.sources.length > 0 && (
                                <div className="text-xs text-amber-500 dark:text-amber-400 mt-0.5">
                                  from: {item.sources.join(' · ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </SwipeableShoppingItem>
                        {(hoveredKey === item.key || expandedKey === item.key) &&
                          item.recipeBreakdown.length > 0 && (
                          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Used in:</p>
                            <ul className="space-y-1">
                              {[...item.recipeBreakdown]
                                .sort((a, b) => b.qty - a.qty)
                                .map((entry, i) => {
                                  const recipe = recipeByName.get(entry.recipeName);
                                  return (
                                    <li key={i} className="flex items-center justify-between text-xs">
                                      {recipe ? (
                                        <button
                                          className="text-blue-700 dark:text-blue-300 truncate mr-3 underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-100 text-left"
                                          onClick={(e) => { e.stopPropagation(); onViewRecipe(recipe); }}
                                        >
                                          {entry.recipeName}
                                        </button>
                                      ) : (
                                        <span className="text-blue-800 dark:text-blue-200 truncate mr-3">
                                          {entry.recipeName}
                                        </span>
                                      )}
                                      <span className="text-blue-600 dark:text-blue-400 whitespace-nowrap tabular-nums">
                                        {entry.qty > 0 ? formatQuantity(entry.qty, entry.unit) : 'as needed'}
                                      </span>
                                    </li>
                                  );
                                })}
                            </ul>
                          </div>
                        )}
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
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Shopping progress</span>
            <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
