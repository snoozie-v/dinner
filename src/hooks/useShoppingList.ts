import { useState, useMemo, useEffect } from 'react';
import type { PlanItem, ShoppingItem, ShoppingAdjustments, PantryStaple } from '../types';
import { STORAGE_KEYS, storage } from '../utils/storage';
import { usePersistedState } from './usePersistedState';
import { parseIngredientLine } from '../utils/recipeValidation';

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

const SHOPPING_NAME_ALIASES: Record<string, string> = {
  // Black pepper
  'ground black pepper': 'black pepper',
  'freshly ground black pepper': 'black pepper',
  'fresh ground black pepper': 'black pepper',
  'cracked black pepper': 'black pepper',
  'fresh cracked pepper': 'black pepper',
  'freshly cracked black pepper': 'black pepper',
  'freshly cracked pepper': 'black pepper',
  'ground pepper': 'black pepper',

  // Salt
  'sea salt': 'salt',
  'kosher salt': 'salt',
  'table salt': 'salt',
  'fine salt': 'salt',
  'coarse salt': 'salt',
  'rock salt': 'salt',

  // Garlic (whole/cloves only — not pre-minced, which has a different form)
  'garlic cloves': 'garlic',
  'garlic clove': 'garlic',
  'fresh garlic': 'garlic',

  // Butter
  'unsalted butter': 'butter',
  'salted butter': 'butter',

  // Flour
  'all purpose flour': 'all-purpose flour',
  'plain flour': 'all-purpose flour',

  // Sugar
  'white sugar': 'sugar',
  'granulated sugar': 'sugar',
  'cane sugar': 'sugar',

  // Milk (generic dairy)
  'whole milk': 'milk',
  '2% milk': 'milk',
  'skim milk': 'milk',
  'full-fat milk': 'milk',
  'dairy milk': 'milk',

  // Onion (not red onion, which has distinct flavour)
  'yellow onion': 'onion',
  'white onion': 'onion',
  'brown onion': 'onion',
  'sweet onion': 'onion',

  // Olive oil
  'extra virgin olive oil': 'olive oil',
  'light olive oil': 'olive oil',

  // Broth / stock
  'chicken stock': 'chicken broth',
  'beef stock': 'beef broth',
  'vegetable stock': 'vegetable broth',

  // Soy sauce
  'light soy sauce': 'soy sauce',

  // Vinegar
  'white vinegar': 'vinegar',

  // Celery (unit descriptor words often baked into name by recipe parsers)
  'celery stalk': 'celery',
  'celery rib': 'celery',
  'celery stick': 'celery',
  'stalk celery': 'celery',
  'rib celery': 'celery',
  'stick celery': 'celery',
};

const UNIT_ALIASES: Record<string, string> = {
  'tsp': 'teaspoon',
  'tsps': 'teaspoon',
  'teaspoons': 'teaspoon',
  'tbsp': 'tablespoon',
  'tbsps': 'tablespoon',
  'tablespoons': 'tablespoon',
  'oz': 'ounce',
  'ozs': 'ounce',
  'ounces': 'ounce',
  'lb': 'pound',
  'lbs': 'pound',
  'pounds': 'pound',
  'grams': 'gram',
  'kilograms': 'kilogram',
  'milliliters': 'milliliter',
  'millilitres': 'milliliter',
  'liters': 'liter',
  'litres': 'liter',
  'cups': 'cup',
  'pints': 'pint',
  'quarts': 'quart',
  'gallons': 'gallon',
  // Container/count units — normalize to '' so they share a count key
  'can': '',
  'cans': '',
  'jar': '',
  'jars': '',
  'bag': '',
  'bags': '',
  'box': '',
  'boxes': '',
  'bottle': '',
  'bottles': '',
  'package': '',
  'packages': '',
  'pkg': '',
  'pkgs': '',
  // Size qualifiers and "unit" — all mean "whole item / count", use '' so they share a key
  'unit': '',
  'whole': '',
  'medium': '',
  'large': '',
  'small': '',
  'extra large': '',
  'xl': '',
};

const WEIGHT_UNITS = new Set(['gram', 'kilogram', 'ounce', 'pound']);

// Volume unit conversion: teaspoon as the common base
const VOLUME_TO_TSP: Record<string, number> = {
  'teaspoon': 1,
  'tablespoon': 3,
  'fluid ounce': 6,
  'cup': 48,
  'pint': 96,
  'quart': 192,
  'gallon': 768,
};

// Convert a teaspoon total back to the cleanest display unit.
// Prefers exact tablespoon counts; stays in teaspoons for small non-divisible amounts.
function tspToUnit(tsp: number): { qty: number; unit: string } {
  if (tsp >= 48) return { qty: tsp / 48, unit: 'cup' };
  if (tsp >= 3 && Math.round(tsp) % 3 === 0) return { qty: Math.round(tsp) / 3, unit: 'tablespoon' };
  if (tsp >= 12) return { qty: tsp / 3, unit: 'tablespoon' };
  return { qty: tsp, unit: 'teaspoon' };
}

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
// Also handles unclosed parens: "cayenne pepper (adjust spiciness to taste"
function stripParenthetical(name: string): string {
  return name.replace(/\s*\([^)]*\)?/g, '').trim().toLowerCase();
}

// Conservative whole-string depluralization for ingredient names.
// Handles: carrots→carrot, tomatoes→tomato, berries→berry, mushrooms→mushroom.
// Skips words ending in -ss/-us/-is to avoid mangling (bass, asparagus, hummus).
function depluralizeName(name: string): string {
  if (name.endsWith('ss') || name.endsWith('us') || name.endsWith('is')) return name;
  if (name.endsWith('ies') && name.length > 4) return name.slice(0, -3) + 'y';
  if (name.endsWith('oes') && name.length > 4) return name.slice(0, -2); // tomatoes→tomato
  if (name.endsWith('s') && name.length > 3) return name.slice(0, -1);
  return name;
}

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

function normalizeShoppingName(name: string): string {
  let n = stripParenthetical(name);
  n = n.replace(/\s+/g, ' ');
  if (SHOPPING_NAME_ALIASES[n]) return SHOPPING_NAME_ALIASES[n];
  // Try depluralized form (carrots→carrot, celery stalks→celery stalk→alias)
  const dep = depluralizeName(n);
  return SHOPPING_NAME_ALIASES[dep] ?? dep;
}

function isCoveredByPantry(itemName: string, pantryNames: Set<string>): boolean {
  const lower = normalizeShoppingName(itemName);
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
      sources: string[];
    }>();

    const filteredPlan = plan.filter(item => selectedShoppingDays.has(item.day));

    filteredPlan.forEach(({ recipe, servingsMultiplier }) => {
      if (!recipe) return;

      recipe?.ingredients?.forEach((ing) => {
        if (!ing?.name) return;
        // Skip "Other: ..." annotation lines — these are recipe notes, not real ingredients
        if (ing.name.trim().toLowerCase().startsWith('other:')) return;

        // Recover quantity/unit embedded in the name when the recipe data has none
        let ingName = ing.name;
        let ingQty = ing.quantity || 0;
        let ingUnit = ing.unit || '';
        if (!ingQty || ingUnit.toLowerCase() === 'as needed') {
          const parsed = parseIngredientLine(ingName);
          if (parsed && parsed.quantity != null && parsed.name !== ingName && parsed.name) {
            ingName = parsed.name;
            ingQty = parsed.quantity;
            ingUnit = parsed.unit || '';
          }
        } else if (/^\//.test(ingName)) {
          // Name has a spurious leading slash (import artifact) even though quantity/unit are set.
          // Try to strip it by re-parsing; keep existing qty/unit if parse produces none.
          const parsed = parseIngredientLine(ingName);
          if (parsed && parsed.name && parsed.name !== ingName) {
            ingName = parsed.name;
            if (parsed.quantity != null) { ingQty = parsed.quantity; ingUnit = parsed.unit || ''; }
          }
        }

        // Strip leading container/count descriptor words baked into names by importers,
        // e.g. "can tomato paste" → name="tomato paste", qty implied 1
        // "cans canned tomato sauce" → name="canned tomato sauce"
        // Note: "canned" is intentionally NOT stripped — it's an adjective, not a unit.
        const COUNT_PREFIX_RE = /^(cans?|jars?|bags?|bottles?|boxes?|packages?|pkgs?)\s+/i;
        const countPrefix = ingName.match(COUNT_PREFIX_RE);
        if (countPrefix) {
          if (!ingQty) ingQty = 1;
          ingName = ingName.slice(countPrefix[0].length).trim();
        }

        const normalizedName = normalizeShoppingName(ingName);
        const normalizedUnit = normalizeUnit(ingUnit);
        const key = `${normalizedName}|${normalizedUnit}`;
        const qty = ingQty * (servingsMultiplier || 1);

        if (!map.has(key)) {
          map.set(key, {
            name: normalizedName,
            unit: normalizedUnit || 'unit',
            totalQty: 0,
            count: 0,
            preparation: ing.preparation || '',
            category: ing.category || 'other',
            key,
            sources: [],
          });
        }

        const item = map.get(key)!;
        item.totalQty += qty;
        item.count += 1;
        if (recipe.name && !item.sources.includes(recipe.name)) {
          item.sources.push(recipe.name);
        }
      });
    });

    // Second pass: for each ingredient that appears with multiple volume units
    // (e.g. "salt|tablespoon" + "salt|teaspoon"), convert all to teaspoons, sum,
    // then convert back to the cleanest display unit.
    const byName = new Map<string, string[]>();
    for (const key of map.keys()) {
      const name = map.get(key)!.name;
      const existing = byName.get(name);
      if (existing) existing.push(key);
      else byName.set(name, [key]);
    }
    for (const keys of byName.values()) {
      if (keys.length <= 1) continue;
      const volKeys = keys.filter(k => VOLUME_TO_TSP[map.get(k)!.unit] !== undefined);
      if (volKeys.length <= 1) continue;

      let totalTsp = 0;
      let totalCount = 0;
      for (const k of volKeys) {
        const item = map.get(k)!;
        totalTsp += item.totalQty * VOLUME_TO_TSP[item.unit];
        totalCount += item.count;
      }

      // Keep only the first volume entry, merge sources, delete the rest
      const primaryKey = volKeys[0];
      const mergedSources = new Set(map.get(primaryKey)!.sources);
      for (const k of volKeys.slice(1)) {
        map.get(k)?.sources.forEach(s => mergedSources.add(s));
      }
      map.get(primaryKey)!.sources = Array.from(mergedSources);
      for (const k of volKeys.slice(1)) map.delete(k);

      const { qty, unit } = tspToUnit(totalTsp);
      const primary = map.get(primaryKey)!;
      primary.totalQty = qty;
      primary.unit = unit;
      primary.count = totalCount;

      // Re-key if the canonical unit changed (e.g. tablespoon → teaspoon)
      const newKey = `${primary.name}|${unit}`;
      if (newKey !== primaryKey) {
        primary.key = newKey;
        map.delete(primaryKey);
        map.set(newKey, primary);
      }
    }

    // Third pass: collapse any remaining same-ingredient entries that have
    // incompatible units (e.g. "carrot|pound" + "carrot|" count).
    // Keep the most informative unit: weight > volume > count/whole.
    const unitPriority = (unit: string) =>
      WEIGHT_UNITS.has(unit) ? 2 : VOLUME_TO_TSP[unit] !== undefined ? 1 : 0;

    const byName2 = new Map<string, string[]>();
    for (const key of map.keys()) {
      const name = map.get(key)!.name;
      const existing = byName2.get(name);
      if (existing) existing.push(key);
      else byName2.set(name, [key]);
    }
    for (const keys of byName2.values()) {
      if (keys.length <= 1) continue;
      keys.sort((a, b) => unitPriority(map.get(b)!.unit) - unitPriority(map.get(a)!.unit));
      const primaryKey = keys[0];
      const primary = map.get(primaryKey)!;
      for (const k of keys.slice(1)) {
        const sec = map.get(k)!;
        primary.count += sec.count;
        sec.sources.forEach(s => { if (!primary.sources.includes(s)) primary.sources.push(s); });
        map.delete(k);
      }
    }

    const pantryNames = new Set(pantryStaples.map(s => normalizeShoppingName(s.name)));

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
