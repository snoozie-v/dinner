import { useState, useMemo, useEffect } from 'react';
import type { PlanItem, ShoppingItem, ShoppingAdjustments, PantryStaple } from '../types';
import { STORAGE_KEYS, storage } from '../utils/storage';
import { usePersistedState } from './usePersistedState';

interface UseShoppingListParams {
  plan: PlanItem[];
  pantryStaples: PantryStaple[];
  days: number;
}

export const useShoppingList = ({ plan, pantryStaples, days }: UseShoppingListParams) => {
  const [shoppingAdjustments, setShoppingAdjustments] = usePersistedState<ShoppingAdjustments>(
    STORAGE_KEYS.SHOPPING_ADJUSTMENTS, {}
  );

  const [selectedShoppingDays, setSelectedShoppingDays] = useState<Set<number>>(() => {
    const storedDays = storage.get<number>(STORAGE_KEYS.DAYS, 3);
    return new Set(Array.from({ length: storedDays }, (_, i) => i + 1));
  });

  // Update selected shopping days when total days changes
  useEffect(() => {
    setSelectedShoppingDays(prev => {
      const newSet = new Set<number>();
      for (let i = 1; i <= days; i++) {
        if (prev.has(i) || i > prev.size) {
          newSet.add(i);
        }
      }
      if (newSet.size === 0) {
        for (let i = 1; i <= days; i++) {
          newSet.add(i);
        }
      }
      return newSet;
    });
  }, [days]);

  const shoppingList = useMemo<ShoppingItem[]>(() => {
    const map = new Map<string, {
      name: string;
      unit: string;
      totalQty: number;
      count: number;
      preparation: string;
      category: string;
      key: string;
    }>();

    const filteredPlan = plan.filter(item => selectedShoppingDays.has(item.day));

    filteredPlan.forEach(({ recipe, servingsMultiplier }) => {
      if (!recipe) return;

      recipe?.ingredients?.forEach((ing) => {
        if (!ing?.name) return;
        const key = `${ing.name.toLowerCase()}|${(ing.unit || '').toLowerCase()}`;
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

    const pantryNames = new Set(pantryStaples.map(s => s.name.toLowerCase()));

    return Array.from(map.values())
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      })
      .map((item) => {
        const adj = shoppingAdjustments[item.key] || { haveQty: 0 };
        const isPantryStaple = pantryNames.has(item.name.toLowerCase());
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
  }, [plan, shoppingAdjustments, pantryStaples, selectedShoppingDays]);

  const shoppingNeededCount = shoppingList.filter(item =>
    item.totalQty > 0 ? item.haveQty < item.totalQty : item.haveQty === 0
  ).length;

  const toggleHaveItem = (key: string, totalQty: number): void => {
    setShoppingAdjustments((prev) => {
      const current = prev[key] || { haveQty: 0 };
      const targetQty = totalQty > 0 ? totalQty : 1;
      const newHave = current.haveQty > 0 ? 0 : targetQty;
      return {
        ...prev,
        [key]: { haveQty: newHave },
      };
    });
  };

  const resetAdjustments = (): void => {
    setShoppingAdjustments({});
  };

  const importAdjustments = (adj: ShoppingAdjustments): void => {
    setShoppingAdjustments(adj);
  };

  return {
    shoppingAdjustments,
    selectedShoppingDays, setSelectedShoppingDays,
    shoppingList, shoppingNeededCount,
    toggleHaveItem, resetAdjustments, importAdjustments,
  };
};
