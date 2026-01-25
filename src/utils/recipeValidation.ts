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

  // Servings must be at least 1
  if (!recipe.servings?.default || recipe.servings.default < 1) {
    errors.push('Number of servings must be at least 1');
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
  'condiments',
  'spices',
  'frozen',
  'other'
];

/**
 * Parse a fraction string like "1/2" or "1 1/2" to a decimal
 */
export const parseFraction = (str: string): number | null => {
  if (!str || !str.trim()) return null;

  const cleaned = str.trim();

  // Handle pure decimal
  if (/^\d+\.?\d*$/.test(cleaned)) {
    return parseFloat(cleaned);
  }

  // Handle mixed number like "1 1/2"
  const mixedMatch = cleaned.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const denom = parseInt(mixedMatch[3], 10);
    return denom !== 0 ? whole + num / denom : null;
  }

  // Handle simple fraction like "1/2"
  const fractionMatch = cleaned.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1], 10);
    const denom = parseInt(fractionMatch[2], 10);
    return denom !== 0 ? num / denom : null;
  }

  // Handle range like "2-3" - take the average or first number
  const rangeMatch = cleaned.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    return (low + high) / 2; // Use average for scaling purposes
  }

  return null;
};

/**
 * Format a decimal as a nice fraction string for display
 */
export const formatQuantity = (num: number | null): string => {
  if (num === null || num === undefined) return '';

  // Common fractions to check
  const fractions: [number, string][] = [
    [0.125, '1/8'],
    [0.25, '1/4'],
    [0.333, '1/3'],
    [0.375, '3/8'],
    [0.5, '1/2'],
    [0.625, '5/8'],
    [0.666, '2/3'],
    [0.75, '3/4'],
    [0.875, '7/8'],
  ];

  const whole = Math.floor(num);
  const decimal = num - whole;

  // Check if decimal part matches a common fraction
  for (const [val, str] of fractions) {
    if (Math.abs(decimal - val) < 0.02) {
      return whole > 0 ? `${whole} ${str}` : str;
    }
  }

  // Otherwise return as number
  if (whole === num) return String(whole);
  return num.toFixed(2).replace(/\.?0+$/, '');
};

/**
 * Parse a single ingredient line like "2 cups flour, sifted"
 */
export const parseIngredientLine = (line: string): Partial<Ingredient> | null => {
  if (!line || !line.trim()) return null;

  const cleaned = line.trim()
    // Remove leading bullet points, dashes, asterisks
    .replace(/^[\-\*\•]\s*/, '')
    // Remove leading numbers with periods (1. 2. etc)
    .replace(/^\d+\.\s*/, '');

  if (!cleaned) return null;

  // Common units - longer/specific ones first to match before shorter ones
  // Each unit must be followed by a space to avoid matching part of ingredient name
  const units = [
    'tablespoons?', 'tbsp\\.?', 'tbs\\.?',
    'teaspoons?', 'tsp\\.?',
    'ounces?', 'oz\\.?',
    'pounds?', 'lbs?\\.?', 'lb\\.?',
    'cups?',
    'grams?',
    'kilograms?', 'kg\\.?',
    'milliliters?', 'ml\\.?',
    'liters?',
    'quarts?', 'qt\\.?',
    'pints?', 'pt\\.?',
    'gallons?', 'gal\\.?',
    'pinch(?:es)?',
    'dash(?:es)?',
    'cloves?',
    'cans?',
    'packages?', 'pkg\\.?',
    'bunche?s?',
    'stalks?',
    'slices?',
    'pieces?',
    'heads?',
    'sprigs?',
    'leaves?',
    'whole',
    'large',
    'medium',
    'small',
  ];

  // Build pattern requiring unit to be followed by space (word boundary)
  const unitPattern = units.join('|');

  // Pattern: quantity unit name, preparation
  // The unit MUST be followed by a space to avoid matching "c" from "cabbage"
  // Examples: "2 cups flour, sifted" or "1/2 tsp salt" or "3-4 cloves garlic, minced"
  const patternWithUnit = new RegExp(
    `^([\\d\\s\\/\\-\\.]+)\\s+(${unitPattern})\\s+(.+)$`,
    'i'
  );

  // Helper to extract name and preparation from rest of string
  // Handles both comma separation and parentheses: "chicken, diced" or "cabbage (shredded)"
  const extractNameAndPrep = (rest: string): { name: string; preparation: string } => {
    // Check for parentheses first: "cabbage (shredded)"
    const parenMatch = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (parenMatch) {
      return {
        name: parenMatch[1].trim(),
        preparation: parenMatch[2].trim(),
      };
    }

    // Otherwise split on comma: "chicken breast, diced"
    const parts = rest.split(',').map(p => p.trim());
    return {
      name: parts[0] || '',
      preparation: parts.slice(1).join(', ') || '',
    };
  };

  // Try matching with a unit first
  let match = cleaned.match(patternWithUnit);
  if (match) {
    const [, qtyStr, unit, rest] = match;
    const quantity = parseFraction(qtyStr.trim());
    const { name, preparation } = extractNameAndPrep(rest);

    return {
      name,
      quantity,
      unit: unit?.toLowerCase().replace(/\.$/, '') || '',
      preparation,
      category: 'other',
    };
  }

  // Try matching without a unit: "1 cabbage" or "2 onions, diced"
  const patternNoUnit = new RegExp(
    `^([\\d\\s\\/\\-\\.]+)\\s+(.+)$`,
    'i'
  );

  match = cleaned.match(patternNoUnit);
  if (match) {
    const [, qtyStr, rest] = match;
    const quantity = parseFraction(qtyStr.trim());
    const { name, preparation } = extractNameAndPrep(rest);

    return {
      name,
      quantity,
      unit: '',
      preparation,
      category: 'other',
    };
  }

  // No quantity found - just return the whole thing as the name
  const { name, preparation } = extractNameAndPrep(cleaned);

  return {
    name,
    quantity: null,
    unit: '',
    preparation,
    category: 'other',
  };
};

/**
 * Parse multiple ingredient lines (one per line)
 */
export const parseIngredientLines = (text: string): Ingredient[] => {
  return text
    .split('\n')
    .map(line => parseIngredientLine(line))
    .filter((ing): ing is Partial<Ingredient> => ing !== null && !!ing.name)
    .map(ing => ({
      name: ing.name || '',
      quantity: ing.quantity ?? null,
      unit: ing.unit || '',
      preparation: ing.preparation || '',
      category: ing.category || 'other',
      optional: false,
    }));
};

/**
 * Parse instruction text into steps (handles numbered lists, bullet points, or paragraphs)
 */
export const parseInstructionText = (text: string): string[] => {
  if (!text || !text.trim()) return [];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Check if it looks like a numbered/bulleted list
  const hasNumbers = lines.some(l => /^\d+[\.\)]\s/.test(l));
  const hasBullets = lines.some(l => /^[\-\*\•]\s/.test(l));

  if (hasNumbers || hasBullets) {
    // Parse as list, removing number/bullet prefixes
    return lines
      .map(line => line.replace(/^(\d+[\.\)]\s*|[\-\*\•]\s*)/, '').trim())
      .filter(Boolean);
  }

  // If no clear structure, split by sentences ending with period
  // but keep as separate steps
  return lines.filter(Boolean);
};

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
