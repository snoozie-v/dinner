import { useState, useMemo, useEffect } from 'react';
import type { PlanItem, ShoppingItem, ShoppingAdjustments, PantryStaple } from '../types';
import { STORAGE_KEYS, storage } from '../utils/storage';
import { usePersistedState } from './usePersistedState';

// Ingredient families: any pantry member covers any other member in the same group.
// Keep groups to truly interchangeable ingredients to avoid false positives.
const INGREDIENT_FAMILIES: string[][] = [
  // Cooking oils
  ['oil', 'cooking oil', 'vegetable oil', 'canola oil', 'sunflower oil', 'corn oil',
   'olive oil', 'extra virgin olive oil', 'light olive oil', 'avocado oil',
   'coconut oil', 'grapeseed oil'],
  // Butter
  ['butter', 'unsalted butter', 'salted butter'],
  // All-purpose flour
  ['flour', 'all-purpose flour', 'plain flour'],
  // White/granulated sugar
  ['sugar', 'white sugar', 'granulated sugar', 'cane sugar'],
  // Dairy milk
  ['milk', 'whole milk', 'full-fat milk', '2% milk', 'skim milk', 'dairy milk'],
  // Salt
  ['salt', 'sea salt', 'table salt', 'kosher salt', 'rock salt', 'fine salt'],
  // Black pepper
  ['pepper', 'black pepper', 'ground pepper', 'ground black pepper', 'white pepper'],
  // Garlic
  ['garlic', 'garlic cloves', 'fresh garlic'],
  // Yellow/white/brown onion (not red, which has a distinct flavour)
  ['onion', 'yellow onion', 'white onion', 'brown onion', 'sweet onion'],
  // Generic broth / stock (generic terms only — chicken vs vegetable are distinct)
  ['broth', 'stock'],
  // Soy sauce
  ['soy sauce', 'light soy sauce'],
  // Vinegar (generic / white)
  ['vinegar', 'white vinegar'],
];

// Pre-build a lookup: lowercase name → Set of all family members
const FAMILY_LOOKUP = new Map<string, Set<string>>();
for (const family of INGREDIENT_FAMILIES) {
  const familySet = new Set(family);
  for (const member of family) {
    FAMILY_LOOKUP.set(member, familySet);
  }
}

// Strip parenthetical annotations baked into ingredient names, e.g.
// "cayenne pepper (adjust spiciness to taste)" → "cayenne pepper"
function stripParenthetical(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
}

function isCoveredByPantry(itemName: string, pantryNames: Set<string>): boolean {
  const lower = stripParenthetical(itemName);
  if (pantryNames.has(lower)) return true;
  const family = FAMILY_LOOKUP.get(lower);
  if (!family) return false;
  for (const member of family) {
    if (pantryNames.has(member)) return true;
  }
  return false;
}

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
        // Skip "Other: ..." annotation lines — these are recipe notes, not real ingredients
        if (ing.name.trim().toLowerCase().startsWith('other:')) return;
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

    const pantryNames = new Set(pantryStaples.map(s => stripParenthetical(s.name)));

    return Array.from(map.values())
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      })
      .map((item) => {
        const adj = shoppingAdjustments[item.key] || { haveQty: 0 };
        const isPantryStaple = isCoveredByPantry(item.name, pantryNames);
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
