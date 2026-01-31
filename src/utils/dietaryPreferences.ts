// src/utils/dietaryPreferences.ts
import type {
  Recipe,
  PlanItem,
  IngredientExclusion,
  IngredientFrequencyLimit,
  MealSlotTheme,
  MealType
} from '../types';
import { PREDEFINED_THEMES } from '../types';

/**
 * Check if a recipe contains any excluded ingredients
 */
export function recipeHasExcludedIngredient(
  recipe: Recipe,
  exclusions: IngredientExclusion[]
): boolean {
  if (!exclusions.length || !recipe.ingredients?.length) return false;

  const excludedNames = new Set(exclusions.map(e => e.ingredientName.toLowerCase()));

  return recipe.ingredients.some(ing => {
    const name = ing.name?.toLowerCase() || '';
    // Check exact match and partial match (e.g., "pork" matches "pork chops")
    return excludedNames.has(name) ||
      Array.from(excludedNames).some(excluded => name.includes(excluded));
  });
}

/**
 * Filter out recipes that contain excluded ingredients
 */
export function filterExcludedRecipes(
  recipes: Recipe[],
  exclusions: IngredientExclusion[]
): Recipe[] {
  if (!exclusions.length) return recipes;
  return recipes.filter(r => !recipeHasExcludedIngredient(r, exclusions));
}

/**
 * Count how many times an ingredient appears in the current plan
 */
export function countIngredientInPlan(
  ingredientName: string,
  plan: PlanItem[]
): number {
  const normalized = ingredientName.toLowerCase();
  let count = 0;

  plan.forEach(item => {
    if (!item.recipe?.ingredients) return;

    const hasIngredient = item.recipe.ingredients.some(ing => {
      const name = ing.name?.toLowerCase() || '';
      return name === normalized || name.includes(normalized);
    });

    if (hasIngredient) count++;
  });

  return count;
}

/**
 * Get set of recipe IDs that would exceed frequency limits if added
 */
export function getRecipesExceedingLimits(
  recipes: Recipe[],
  plan: PlanItem[],
  limits: IngredientFrequencyLimit[]
): Set<string> {
  if (!limits.length) return new Set();

  const exceeding = new Set<string>();

  // Pre-calculate current counts for all limited ingredients
  const currentCounts = new Map<string, number>();
  limits.forEach(limit => {
    currentCounts.set(
      limit.ingredientName.toLowerCase(),
      countIngredientInPlan(limit.ingredientName, plan)
    );
  });

  recipes.forEach(recipe => {
    if (!recipe.ingredients?.length) return;

    // Check if adding this recipe would exceed any limit
    for (const limit of limits) {
      const normalized = limit.ingredientName.toLowerCase();
      const currentCount = currentCounts.get(normalized) || 0;

      const recipeHasIngredient = recipe.ingredients.some(ing => {
        const name = ing.name?.toLowerCase() || '';
        return name === normalized || name.includes(normalized);
      });

      if (recipeHasIngredient && currentCount >= limit.maxPerWeek) {
        exceeding.add(recipe.id);
        break;
      }
    }
  });

  return exceeding;
}

/**
 * Check if a recipe matches a theme via tags or cuisine
 */
export function recipeMatchesTheme(recipe: Recipe, themeId: string): boolean {
  const theme = PREDEFINED_THEMES.find(t => t.id === themeId);
  if (!theme) return false;

  // Check tags
  const recipeTags = recipe.tags?.map(t => t.toLowerCase()) || [];
  if (theme.matchTags.some(tag => recipeTags.includes(tag.toLowerCase()))) {
    return true;
  }

  // Check cuisine
  if (recipe.cuisine && theme.matchCuisines?.length) {
    const cuisineLower = recipe.cuisine.toLowerCase();
    if (theme.matchCuisines.some(c => c.toLowerCase() === cuisineLower)) {
      return true;
    }
  }

  return false;
}

/**
 * Get the theme for a specific meal slot, if any
 */
export function getThemeForSlot(
  day: number,
  mealType: MealType,
  themes: MealSlotTheme[]
): string | null {
  const slotTheme = themes.find(t => t.day === day && t.mealType === mealType);
  return slotTheme?.theme || null;
}

/**
 * Sort recipes: themed matches first, then others
 */
export function sortRecipesByTheme(
  recipes: Recipe[],
  themeId: string | null
): { themed: Recipe[]; other: Recipe[] } {
  if (!themeId) {
    return { themed: [], other: recipes };
  }

  const themed: Recipe[] = [];
  const other: Recipe[] = [];

  recipes.forEach(recipe => {
    if (recipeMatchesTheme(recipe, themeId)) {
      themed.push(recipe);
    } else {
      other.push(recipe);
    }
  });

  return { themed, other };
}

/**
 * Get summary of ingredient usage for display in settings
 */
export function getIngredientUsageSummary(
  plan: PlanItem[],
  limits: IngredientFrequencyLimit[]
): Array<{ ingredient: string; displayName: string; current: number; max: number; percentage: number }> {
  return limits.map(limit => {
    const current = countIngredientInPlan(limit.ingredientName, plan);
    return {
      ingredient: limit.ingredientName,
      displayName: limit.displayName,
      current,
      max: limit.maxPerWeek,
      percentage: Math.min(100, (current / limit.maxPerWeek) * 100),
    };
  });
}

/**
 * Common ingredients for quick-add exclusions
 */
export const COMMON_EXCLUSIONS = [
  { ingredientName: 'pork', displayName: 'Pork' },
  { ingredientName: 'bacon', displayName: 'Bacon' },
  { ingredientName: 'shellfish', displayName: 'Shellfish' },
  { ingredientName: 'shrimp', displayName: 'Shrimp' },
  { ingredientName: 'beef', displayName: 'Beef' },
  { ingredientName: 'chicken', displayName: 'Chicken' },
  { ingredientName: 'fish', displayName: 'Fish' },
  { ingredientName: 'dairy', displayName: 'Dairy' },
  { ingredientName: 'milk', displayName: 'Milk' },
  { ingredientName: 'cheese', displayName: 'Cheese' },
  { ingredientName: 'eggs', displayName: 'Eggs' },
  { ingredientName: 'gluten', displayName: 'Gluten' },
  { ingredientName: 'wheat', displayName: 'Wheat' },
  { ingredientName: 'nuts', displayName: 'Nuts' },
  { ingredientName: 'peanuts', displayName: 'Peanuts' },
  { ingredientName: 'soy', displayName: 'Soy' },
];
