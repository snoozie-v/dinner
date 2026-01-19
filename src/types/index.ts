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

export interface PlanItem {
  day: number;
  id: string;
  recipe: Recipe | null;
  servingsMultiplier: number;
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
}

export interface ShoppingAdjustment {
  haveQty: number;
}

export interface ShoppingOrder {
  ordered: boolean;
}

export type ShoppingAdjustments = Record<string, ShoppingAdjustment>;
export type ShoppingOrders = Record<string, ShoppingOrder>;

export type ActiveTab = 'planner' | 'recipes';
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
