// src/types/index.ts

export interface Ingredient {
  name: string;
  quantity: number | null;
  unit: string;
  preparation?: string;
  category: string;
  optional?: boolean;
}

export interface InstructionSection {
  section: string;
  steps: string[];
}

export interface Nutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  source?: string;
}

export interface CostEstimate {
  total: number;
  currency: string;
  perServing: number;
}

export interface Servings {
  default: number;
  unit: string;
}

export interface Recipe {
  id: string;
  isCustom?: boolean;
  name: string;
  description?: string;
  author?: string;
  sourceUrl?: string;
  createdAt?: string;
  updatedAt?: string;

  tags?: string[];
  cuisine?: string;
  mealTypes?: string[];
  dietary?: string[];
  allergiesToAvoid?: string[];

  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  difficulty?: string;

  servings?: Servings;

  ingredients?: Ingredient[];
  instructions?: InstructionSection[];

  nutrition?: Nutrition | null;
  costEstimate?: CostEstimate | null;
  equipment?: string[];
  notes?: string;
  imageUrl?: string;
  videoUrl?: string | null;
  rating?: number | null;
  timesUsed?: number;
}

// Meal type slots for multi-meal-per-day planning
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'dessert' | 'snack';

export interface MealTypeConfig {
  id: MealType;
  label: string;
  icon: string;
  order: number;
}

export const MEAL_TYPES: MealTypeConfig[] = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅', order: 1 },
  { id: 'lunch', label: 'Lunch', icon: '☀️', order: 2 },
  { id: 'dinner', label: 'Dinner', icon: '🌙', order: 3 },
  { id: 'dessert', label: 'Dessert', icon: '🍰', order: 4 },
  { id: 'snack', label: 'Snack', icon: '🍎', order: 5 },
];

export const DEFAULT_ENABLED_MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

export interface PlanItem {
  day: number;
  mealType: MealType;
  id: string;
  recipe: Recipe | null;
  servingsMultiplier: number;
  notes?: string;
}

// Legacy PlanItem for migration (v1 format - single meal per day)
export interface LegacyPlanItem {
  day: number;
  id: string;
  recipe: Recipe | null;
  servingsMultiplier: number;
  notes?: string;
}

export interface ShoppingItem {
  name: string;
  unit: string;
  totalQty: number;
  count: number;
  preparation: string;
  category: string;
  key: string;
  haveQty: number;
  ordered: boolean;
  neededQty: number;
  displayNeeded: string | number;
  displayTotal: string | number;
  isPantryStaple?: boolean;
}

export interface ShoppingAdjustment {
  haveQty: number;
}

export interface ShoppingOrder {
  ordered: boolean;
}

export type ShoppingAdjustments = Record<string, ShoppingAdjustment>;
export type ShoppingOrders = Record<string, ShoppingOrder>;

export type ActiveTab = 'planner' | 'shop' | 'recipes';
export type FilterType = 'all' | 'custom' | 'default';

export interface RecipeValidationResult {
  valid: boolean;
  errors: string[];
}

export interface RecipeOperationResult {
  success: boolean;
  recipe?: Recipe;
  errors?: string[];
}

export interface DifficultyOption {
  value: string;
  label: string;
}

// Pantry Staples - items user always has on hand
export interface PantryStaple {
  name: string;
  unit: string;
  key: string; // matches shopping list key format: "name|unit"
}

// Meal Plan Templates
export interface MealPlanTemplateSlot {
  day: number;
  mealType: MealType;
  recipeId: string | null;
  servingsMultiplier: number;
}

export interface MealPlanTemplate {
  id: string;
  name: string;
  createdAt: string;
  days: number;
  version: 2;  // Template format version
  enabledMealTypes: MealType[];
  slots: MealPlanTemplateSlot[];
}

// Legacy template format for migration (v1)
export interface LegacyMealPlanTemplate {
  id: string;
  name: string;
  createdAt: string;
  days: number;
  recipes: (string | null)[]; // flat array, one per day
}

// User preferences for quick access
export interface UserPreferences {
  favoriteRecipeIds: string[];
  recentRecipeIds: string[]; // most recent first, max 10
}

// Meal plan settings
export interface MealPlanSettings {
  enabledMealTypes: MealType[];
}
