// src/utils/recipeValidation.ts
import type {
  Recipe,
  Ingredient,
  InstructionSection,
  RecipeValidationResult,
  DifficultyOption
} from '../types';

/**
 * Check if a recipe is a custom (user-created) recipe
 */
export const isCustomRecipe = (recipe: Recipe | null | undefined): boolean => {
  if (!recipe) return false;
  return recipe.isCustom === true || (recipe.id?.startsWith('custom-') ?? false);
};

/**
 * Generate a unique ID for custom recipes
 */
export const generateRecipeId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `custom-${timestamp}-${randomStr}`;
};

/**
 * Parse ISO 8601 duration to minutes
 */
export const parseDurationToMinutes = (duration: string | undefined): number => {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);

  return hours * 60 + minutes;
};

/**
 * Convert minutes to ISO 8601 duration
 */
export const minutesToDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `PT${hours}H${mins}M`;
  } else if (hours > 0) {
    return `PT${hours}H`;
  } else {
    return `PT${mins}M`;
  }
};

/**
 * Format duration for display
 */
export const formatDuration = (duration: string | undefined): string => {
  if (!duration) return '—';

  const minutes = parseDurationToMinutes(duration);
  if (minutes === 0) return '—';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins} min`;
  }
};

/**
 * Validate recipe data
 */
export const validateRecipe = (recipe: Recipe): RecipeValidationResult => {
  const errors: string[] = [];

  // Name is required
  if (!recipe.name || !recipe.name.trim()) {
    errors.push('Recipe name is required');
  }

  // Validate ingredients if present
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    recipe.ingredients.forEach((ing, index) => {
      if (!ing.name || !ing.name.trim()) {
        errors.push(`Ingredient ${index + 1}: name is required`);
      }
    });
  }

  // Validate instructions if present
  if (recipe.instructions && recipe.instructions.length > 0) {
    recipe.instructions.forEach((section, index) => {
      if (!section.section || !section.section.trim()) {
        errors.push(`Instruction section ${index + 1}: section name is required`);
      }
      if (!section.steps || section.steps.length === 0) {
        errors.push(`Instruction section "${section.section || index + 1}": at least one step is required`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Create a blank recipe template
 */
export const createBlankRecipe = (): Recipe => {
  return {
    id: generateRecipeId(),
    isCustom: true,
    name: '',
    description: '',
    author: '',
    sourceUrl: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    tags: [],
    cuisine: '',
    mealTypes: [],
    dietary: [],
    allergiesToAvoid: [],

    prepTime: '',
    cookTime: '',
    totalTime: '',
    difficulty: 'easy',

    servings: {
      default: 4,
      unit: 'servings'
    },

    ingredients: [],
    instructions: [],

    nutrition: null,
    costEstimate: null,
    equipment: [],
    notes: '',
    imageUrl: '',
    videoUrl: '',
    rating: null,
    timesUsed: 0
  };
};

/**
 * Create a blank ingredient
 */
export const createBlankIngredient = (): Ingredient => ({
  name: '',
  quantity: null,
  unit: '',
  preparation: '',
  category: 'other',
  optional: false
});

/**
 * Create a blank instruction section
 */
export const createBlankInstructionSection = (): InstructionSection => ({
  section: '',
  steps: ['']
});

/**
 * Difficulty options for select
 */
export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'easy-medium', label: 'Easy-Medium' },
  { value: 'medium', label: 'Medium' },
  { value: 'medium-hard', label: 'Medium-Hard' },
  { value: 'hard', label: 'Hard' }
];

/**
 * Common ingredient categories
 */
export const INGREDIENT_CATEGORIES: string[] = [
  'produce',
  'protein/meat',
  'protein/seafood',
  'dairy',
  'pantry',
  'bakery',
  'canned goods',
  'pasta/grains',
  'spices',
  'frozen',
  'other'
];

/**
 * Common meal types
 */
export const MEAL_TYPES: string[] = [
  'breakfast',
  'brunch',
  'lunch',
  'dinner',
  'snack',
  'dessert'
];

/**
 * Common dietary options
 */
export const DIETARY_OPTIONS: string[] = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'dairy-optional',
  'nut-free',
  'low-carb',
  'keto',
  'paleo'
];

/**
 * Common allergens
 */
export const ALLERGEN_OPTIONS: string[] = [
  'dairy',
  'eggs',
  'fish',
  'shellfish',
  'tree nuts',
  'peanuts',
  'wheat',
  'soy',
  'sesame'
];
