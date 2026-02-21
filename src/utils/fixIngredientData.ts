import type { Recipe, Ingredient, PlanItem } from '../types';
import { parseIngredientLine } from './recipeValidation';

function fixIngredient(ing: Ingredient): { ingredient: Ingredient; fixed: boolean } {
  // Only process ingredients that lack structured quantity data
  if ((ing.quantity ?? 0) > 0 && ing.unit?.toLowerCase() !== 'as needed') {
    return { ingredient: ing, fixed: false };
  }

  const parsed = parseIngredientLine(ing.name);
  // Require: parser found a quantity AND produced a different (shorter) name
  if (!parsed || parsed.quantity == null || parsed.name === ing.name) {
    return { ingredient: ing, fixed: false };
  }

  return {
    ingredient: {
      ...ing,
      name: parsed.name,
      quantity: parsed.quantity,
      unit: parsed.unit || '',
      preparation: parsed.preparation || ing.preparation || '',
    },
    fixed: true,
  };
}

function fixRecipeIngredients(recipe: Recipe): { recipe: Recipe; fixedCount: number } {
  if (!recipe.ingredients?.length) return { recipe, fixedCount: 0 };

  let fixedCount = 0;
  const ingredients = recipe.ingredients.map(ing => {
    const result = fixIngredient(ing);
    if (result.fixed) fixedCount++;
    return result.ingredient;
  });

  if (fixedCount === 0) return { recipe, fixedCount: 0 };
  return {
    recipe: { ...recipe, ingredients, updatedAt: new Date().toISOString() },
    fixedCount,
  };
}

/**
 * Scan all custom recipes and plan item snapshots for ingredients where the
 * quantity/unit was embedded in the ingredient name by the recipe importer
 * (e.g. name="1/2 teaspoon black pepper", quantity=0, unit="as needed").
 * Returns fixed copies of both arrays plus a count of repaired ingredients.
 */
export function fixIngredientData(
  customRecipes: Recipe[],
  plan: PlanItem[],
): { fixedRecipes: Recipe[]; fixedPlan: PlanItem[]; ingredientsFixed: number } {
  let ingredientsFixed = 0;

  const fixedRecipes = customRecipes.map(recipe => {
    const result = fixRecipeIngredients(recipe);
    ingredientsFixed += result.fixedCount;
    return result.recipe;
  });

  const fixedPlan = plan.map(item => {
    if (!item.recipe) return item;
    const result = fixRecipeIngredients(item.recipe);
    ingredientsFixed += result.fixedCount;
    return result.fixedCount > 0 ? { ...item, recipe: result.recipe } : item;
  });

  return { fixedRecipes, fixedPlan, ingredientsFixed };
}
