// src/utils/migration.ts
// Utilities for migrating data between versions

import type {
  PlanItem,
  LegacyPlanItem,
  MealPlanTemplate,
  LegacyMealPlanTemplate,
  MealType,
} from '../types';

// Current data version
export const CURRENT_DATA_VERSION = 2;

/**
 * Check if a plan item is in legacy format (no mealType)
 */
export function isLegacyPlanItem(item: PlanItem | LegacyPlanItem): item is LegacyPlanItem {
  return !('mealType' in item);
}

/**
 * Check if a template is in legacy format (has 'recipes' array instead of 'slots')
 */
export function isLegacyTemplate(
  template: MealPlanTemplate | LegacyMealPlanTemplate
): template is LegacyMealPlanTemplate {
  return 'recipes' in template && !('slots' in template);
}

/**
 * Migrate a legacy plan (single meal per day) to the new format (multiple meal types)
 * Legacy meals are assumed to be "dinner" since that was the primary use case
 */
export function migrateLegacyPlan(
  legacyPlan: LegacyPlanItem[],
  enabledMealTypes: MealType[] = ['breakfast', 'lunch', 'dinner']
): PlanItem[] {
  const newPlan: PlanItem[] = [];

  // Get unique days from legacy plan
  const days = new Set(legacyPlan.map(item => item.day));
  const maxDay = Math.max(...Array.from(days), 0);

  // Create slots for all days and enabled meal types
  for (let day = 1; day <= maxDay; day++) {
    const legacyItem = legacyPlan.find(item => item.day === day);

    for (const mealType of enabledMealTypes) {
      // Put the legacy recipe in the "dinner" slot
      if (mealType === 'dinner' && legacyItem) {
        newPlan.push({
          day,
          mealType,
          id: `day-${day}-${mealType}-${legacyItem.recipe?.id || 'empty'}`,
          recipe: legacyItem.recipe,
          servingsMultiplier: legacyItem.servingsMultiplier,
          notes: legacyItem.notes,
        });
      } else {
        // Create empty slot for other meal types
        newPlan.push({
          day,
          mealType,
          id: `day-${day}-${mealType}-empty`,
          recipe: null,
          servingsMultiplier: 1,
        });
      }
    }
  }

  return newPlan;
}

/**
 * Migrate a legacy template to the new format
 */
export function migrateLegacyTemplate(
  legacyTemplate: LegacyMealPlanTemplate
): MealPlanTemplate {
  const slots: MealPlanTemplate['slots'] = [];

  // Legacy templates had one recipe per day, assume it was dinner
  legacyTemplate.recipes.forEach((recipeId, index) => {
    const day = index + 1;

    // Add slots for all default meal types
    for (const mealType of ['breakfast', 'lunch', 'dinner'] as MealType[]) {
      slots.push({
        day,
        mealType,
        recipeId: mealType === 'dinner' ? recipeId : null,
        servingsMultiplier: 1,
      });
    }
  });

  return {
    id: legacyTemplate.id,
    name: legacyTemplate.name,
    createdAt: legacyTemplate.createdAt,
    days: legacyTemplate.days,
    version: 2,
    enabledMealTypes: ['breakfast', 'lunch', 'dinner'],
    slots,
  };
}

/**
 * Migrate all templates in an array
 */
export function migrateTemplates(
  templates: (MealPlanTemplate | LegacyMealPlanTemplate)[]
): MealPlanTemplate[] {
  return templates.map(template => {
    if (isLegacyTemplate(template)) {
      return migrateLegacyTemplate(template);
    }
    return template;
  });
}

/**
 * Check if migration is needed based on stored version
 */
export function needsMigration(storedVersion: number | null): boolean {
  return storedVersion === null || storedVersion < CURRENT_DATA_VERSION;
}
