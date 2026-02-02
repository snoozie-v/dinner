#!/usr/bin/env node
/**
 * Recipe Metadata Updater
 *
 * This script inspects existing recipes and updates their meal types and tags
 * based on recipe content analysis.
 *
 * Usage:
 *   node scripts/update-recipe-metadata.js [options]
 *
 * Options:
 *   --dry-run    Preview changes without saving (default)
 *   --apply      Apply changes to recipes.json
 *   --verbose    Show detailed analysis for each recipe
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const RECIPES_FILE = path.join(__dirname, '..', 'src', 'recipes.json');

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const VERBOSE = args.includes('--verbose');

// Valid meal types
const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'dessert', 'snack'];

// Meal type inference patterns - use word boundaries to avoid false matches
const MEAL_TYPE_PATTERNS = [
  {
    patterns: [/\bbreakfast\b/, /\bbrunch\b/, /\bpancake/, /\bwaffle/, /\bomelette/, /\bomelet/, /\bscramble/, /\bfrench\s+toast/, /\beggs?\s+benedict/, /\bhash\s*brown/, /\bgranola\b/],
    mealType: 'breakfast',
  },
  {
    patterns: [/\blunch\b/, /\bsandwich/, /\bwrap\b/, /\bpanini/, /\bhoagie/, /\btacos?\b/, /\bburrito/, /\bquesadilla/],
    mealType: 'lunch',
  },
  {
    patterns: [/\bdinner\b/, /\bsupper\b/, /\bmain\s+dish/, /\bmain\s+course/, /\bentree/, /\bentrée/, /\btacos?\b/, /\bburrito/, /\benchilada/, /\bfajita/],
    mealType: 'dinner',
  },
  {
    // Exclude savory pies (pot pie, shepherd's pie, etc.) by not matching "pie" alone
    patterns: [/\bdessert/, /\bcake\b/, /\bcookies?\b/, /\bbrownie/, /\bsweet\s+treat/, /\bice\s+cream/, /\bpudding\b/, /\bcheesecake/, /\bcupcake/, /\btart\b/, /\bcobbler/, /\bmousse\b/, /\btiramisu/, /\bfudge\b/, /\bcandy/, /\btruffle/, /\bapple\s+pie/, /\bpumpkin\s+pie/, /\bpecan\s+pie/, /\bcherry\s+pie/, /\bchocolate\s+pie/, /\bcream\s+pie/, /\bkey\s+lime\s+pie/],
    mealType: 'dessert',
  },
  {
    // Removed salsa - too common in main dishes like tacos
    patterns: [/\bsnack/, /\bappetizer/, /\bfinger\s+food/, /\bdip\b/, /\bnachos/, /\bpopcorn/, /\btrail\s+mix/, /\benergy\s+bites/, /\bhummus/, /\bguacamole/, /\bbruschetta/, /\bcrostini/],
    mealType: 'snack',
  },
];

// Snack indicators to prevent false dinner classification
// Removed salsa - too common in main dishes like tacos
const SNACK_INDICATORS = [
  /\bguacamole/, /\bhummus/, /\bdip\b/, /\bappetizer/, /\bnachos/,
  /\bbruschetta/, /\bcrostini/, /\bsnack/,
];

// Main protein/dish indicators that suggest dinner
const MAIN_DISH_INDICATORS = [
  /chicken/, /beef/, /pork/, /lamb/, /turkey/, /duck/,
  /fish/, /salmon/, /tuna/, /shrimp/, /lobster/, /crab/,
  /pasta/, /lasagna/, /spaghetti/, /fettuccine/, /penne/,
  /steak/, /roast/, /casserole/, /stew/, /chili/,
  /curry/, /stir[\s-]?fry/, /stir[\s-]?fried/,
  /tacos?/, /burrito/, /enchilada/, /fajita/,
  /pizza/, /calzone/,
  /meatloaf/, /meatball/, /burger/,
  /ribs/, /brisket/, /pulled\s+pork/,
];

// Tag inference patterns based on ingredients and recipe characteristics
// These patterns are applied to recipe NAME and TAGS only (not ingredients) unless noted
const TAG_PATTERNS = {
  // Protein-based tags - these check ingredients
  // Exclude chicken stock/broth/bouillon from chicken dish detection
  'chicken-dish': { patterns: [/\bchicken\b(?!\s*(stock|broth|bouillon|base|concentrate))/i], checkIngredients: true, nameOnly: false },
  'beef-dish': { patterns: [/\bbeef\b/i, /\bsteak\b/i, /\bmeatloaf\b/i, /\bmeatball/i], checkIngredients: true, nameOnly: false },
  'pork-dish': { patterns: [/\bpork\b/i, /\bbacon\b/i, /\bham\b/i, /\bsausage\b/i], checkIngredients: true, nameOnly: false },
  'seafood': { patterns: [/\bshrimp\b/i, /\bfish\b/i, /\bsalmon\b/i, /\btuna\b/i, /\bcrab\b/i, /\blobster\b/i, /\bscallop/i, /\bseafood\b/i], checkIngredients: true, nameOnly: false },
  'vegetarian': { patterns: [], checkIngredients: false, nameOnly: false }, // Special handling

  // Cooking method tags - name/description only
  'slow-cooker': { patterns: [/slow[\s-]*cook/i, /crock[\s-]*pot/i], checkIngredients: false, nameOnly: true },
  'instant-pot': { patterns: [/instant[\s-]*pot/i, /pressure[\s-]*cook/i], checkIngredients: false, nameOnly: true },
  'grilled': { patterns: [/\bgrill/i, /\bbbq\b/i, /\bbarbecue/i], checkIngredients: false, nameOnly: true },
  'one-pot': { patterns: [/one[\s-]pot/i, /one[\s-]pan/i, /sheet[\s-]pan/i], checkIngredients: false, nameOnly: true },

  // Dietary tags - name/tags only
  'gluten-free': { patterns: [/gluten[\s-]*free/i], checkIngredients: false, nameOnly: true },
  'dairy-free': { patterns: [/dairy[\s-]*free/i], checkIngredients: false, nameOnly: true },
  'low-carb': { patterns: [/low[\s-]*carb/i, /\bketo\b/i], checkIngredients: false, nameOnly: true },
  'vegan': { patterns: [/\bvegan\b/i], checkIngredients: false, nameOnly: true },

  // Meal characteristics - name/tags only
  'quick-easy': { patterns: [/\bquick\b/i, /\beasy\b/i, /\bsimple\b/i, /\d+[\s-]minute/i], checkIngredients: false, nameOnly: true },
  'comfort-food': { patterns: [/\bcomfort\b/i, /\bhearty\b/i], checkIngredients: false, nameOnly: true },
  'healthy': { patterns: [/\bhealthy\b/i, /\bnutritious\b/i], checkIngredients: false, nameOnly: true },
  'kid-friendly': { patterns: [/\bkid/i, /\bchild/i, /\bfamily\b/i], checkIngredients: false, nameOnly: true },
  'meal-prep': { patterns: [/meal[\s-]*prep/i, /make[\s-]*ahead/i, /\bfreezer\b/i], checkIngredients: false, nameOnly: true },
};

// Meat ingredients for vegetarian detection
const MEAT_INGREDIENTS = [
  /chicken/i, /beef/i, /pork/i, /lamb/i, /turkey/i, /duck/i,
  /bacon/i, /sausage/i, /ham/i, /prosciutto/i, /pepperoni/i, /salami/i,
  /fish/i, /salmon/i, /tuna/i, /shrimp/i, /lobster/i, /crab/i, /scallop/i, /clam/i, /mussel/i, /anchov/i,
  /tilapia/i, /cod\b/i, /halibut/i, /trout/i, /bass\b/i, /catfish/i, /mahi/i, /snapper/i,
  /ground\s+meat/i, /ground\s+chuck/i, /ground\s+sirloin/i, /ground\s+round/i, /mince/i, /steak/i, /ribs/i, /brisket/i,
  /meatloaf/i, /meatball/i,
];

/**
 * Infer meal types from recipe data
 */
function inferMealTypes(recipe) {
  const mealTypes = new Set();

  // Primary sources for meal type detection (name, tags, category)
  // Description excluded to avoid false positives from casual mentions
  const primaryTexts = [
    recipe.name || '',
    ...(recipe.tags || []),
  ].map(s => s.toLowerCase());

  // Check each pattern against primary sources only
  for (const { patterns, mealType } of MEAL_TYPE_PATTERNS) {
    for (const text of primaryTexts) {
      if (patterns.some(pattern => pattern.test(text))) {
        mealTypes.add(mealType);
        break;
      }
    }
  }

  // If no meal types found, check for main dish indicators -> dinner
  // But first check if it's clearly a snack to avoid false positives
  if (mealTypes.size === 0) {
    // Check if it's a snack first
    let isSnack = false;
    for (const text of primaryTexts) {
      if (SNACK_INDICATORS.some(pattern => pattern.test(text))) {
        mealTypes.add('snack');
        isSnack = true;
        break;
      }
    }

    // If not a snack, check for main dish indicators in name/tags
    if (!isSnack) {
      for (const text of primaryTexts) {
        if (MAIN_DISH_INDICATORS.some(pattern => pattern.test(text))) {
          mealTypes.add('dinner');
          break;
        }
      }

      // Also check ingredients for main dish proteins
      if (mealTypes.size === 0 && recipe.ingredients) {
        const ingredientText = recipe.ingredients.map(i => i.name || '').join(' ').toLowerCase();
        if (MAIN_DISH_INDICATORS.some(pattern => pattern.test(ingredientText))) {
          mealTypes.add('dinner');
        }
      }
    }
  }

  return Array.from(mealTypes);
}

/**
 * Infer additional tags from recipe data
 */
function inferTags(recipe) {
  const newTags = new Set();
  const existingTags = new Set((recipe.tags || []).map(t => t.toLowerCase()));

  // Gather text to analyze - name and existing tags only
  const nameAndTagsText = [
    recipe.name || '',
    ...(recipe.tags || []),
  ].join(' ').toLowerCase();

  // Get ingredient names (for protein detection)
  const ingredientNames = (recipe.ingredients || [])
    .map(i => (i.name || '').toLowerCase());

  // Combined text for vegetarian check
  const allText = nameAndTagsText + ' ' + ingredientNames.join(' ');

  // Check each tag pattern
  for (const [tag, config] of Object.entries(TAG_PATTERNS)) {
    // Skip if tag already exists
    if (existingTags.has(tag)) continue;

    // Special handling for vegetarian
    if (tag === 'vegetarian') {
      const hasMeat = MEAT_INGREDIENTS.some(pattern => pattern.test(allText));
      if (!hasMeat && recipe.ingredients && recipe.ingredients.length > 0) {
        newTags.add(tag);
      }
      continue;
    }

    const { patterns, checkIngredients } = config;

    // Check name and tags
    let matched = patterns.some(pattern => pattern.test(nameAndTagsText));

    // Also check ingredients if configured
    if (!matched && checkIngredients) {
      matched = ingredientNames.some(name =>
        patterns.some(pattern => pattern.test(name))
      );
    }

    if (matched) {
      newTags.add(tag);
    }
  }

  return Array.from(newTags);
}

/**
 * Analyze a single recipe and return suggested updates
 */
function analyzeRecipe(recipe) {
  const updates = {
    mealTypes: { current: recipe.mealTypes || [], suggested: [] },
    tags: { current: recipe.tags || [], suggested: [] },
    hasChanges: false,
  };

  // Infer meal types
  const inferredMealTypes = inferMealTypes(recipe);
  const currentMealTypes = new Set(recipe.mealTypes || []);

  for (const mt of inferredMealTypes) {
    if (!currentMealTypes.has(mt)) {
      // Don't add "snack" to recipes that already have "dinner" unless name explicitly says "snack"
      if (mt === 'snack' && currentMealTypes.has('dinner') && !/\bsnack\b/i.test(recipe.name || '')) {
        continue;
      }
      updates.mealTypes.suggested.push(mt);
    }
  }

  // Infer tags
  const inferredTags = inferTags(recipe);
  updates.tags.suggested = inferredTags;

  updates.hasChanges = updates.mealTypes.suggested.length > 0 || updates.tags.suggested.length > 0;

  return updates;
}

/**
 * Apply updates to a recipe
 */
function applyUpdates(recipe, updates) {
  const updated = { ...recipe };

  // Add new meal types
  if (updates.mealTypes.suggested.length > 0) {
    const currentMealTypes = new Set(recipe.mealTypes || []);
    for (const mt of updates.mealTypes.suggested) {
      currentMealTypes.add(mt);
    }
    updated.mealTypes = Array.from(currentMealTypes);
  }

  // Add new tags
  if (updates.tags.suggested.length > 0) {
    const currentTags = new Set((recipe.tags || []).map(t => t.toLowerCase()));
    const newTags = [...(recipe.tags || [])];
    for (const tag of updates.tags.suggested) {
      if (!currentTags.has(tag.toLowerCase())) {
        newTags.push(tag);
        currentTags.add(tag.toLowerCase());
      }
    }
    updated.tags = newTags;
  }

  return updated;
}

/**
 * Main function
 */
async function main() {
  console.log('🏷️  Recipe Metadata Updater\n');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'APPLY CHANGES'}`);
  console.log(`Verbose: ${VERBOSE ? 'Yes' : 'No'}\n`);

  // Load recipes
  if (!fs.existsSync(RECIPES_FILE)) {
    console.error(`❌ Recipes file not found: ${RECIPES_FILE}`);
    process.exit(1);
  }

  let recipes;
  try {
    recipes = JSON.parse(fs.readFileSync(RECIPES_FILE, 'utf-8'));
    console.log(`📚 Loaded ${recipes.length} recipes\n`);
  } catch (error) {
    console.error(`❌ Failed to parse recipes file: ${error.message}`);
    process.exit(1);
  }

  // Analyze each recipe
  const results = {
    analyzed: 0,
    withChanges: 0,
    mealTypesAdded: 0,
    tagsAdded: 0,
    details: [],
  };

  const updatedRecipes = recipes.map(recipe => {
    results.analyzed++;
    const updates = analyzeRecipe(recipe);

    if (updates.hasChanges) {
      results.withChanges++;
      results.mealTypesAdded += updates.mealTypes.suggested.length;
      results.tagsAdded += updates.tags.suggested.length;

      results.details.push({
        name: recipe.name,
        updates,
      });

      if (VERBOSE) {
        console.log(`📝 ${recipe.name}`);
        if (updates.mealTypes.suggested.length > 0) {
          console.log(`   Meal types: [${updates.mealTypes.current.join(', ') || 'none'}] + [${updates.mealTypes.suggested.join(', ')}]`);
        }
        if (updates.tags.suggested.length > 0) {
          console.log(`   Tags: +[${updates.tags.suggested.join(', ')}]`);
        }
        console.log('');
      }

      return applyUpdates(recipe, updates);
    }

    return recipe;
  });

  // Summary
  console.log('='.repeat(50));
  console.log('Summary\n');
  console.log(`  Recipes analyzed: ${results.analyzed}`);
  console.log(`  Recipes with changes: ${results.withChanges}`);
  console.log(`  Meal types to add: ${results.mealTypesAdded}`);
  console.log(`  Tags to add: ${results.tagsAdded}`);
  console.log('');

  // Show changes summary if not verbose
  if (!VERBOSE && results.details.length > 0) {
    console.log('Changes to apply:\n');
    for (const { name, updates } of results.details) {
      const changes = [];
      if (updates.mealTypes.suggested.length > 0) {
        changes.push(`+mealTypes: ${updates.mealTypes.suggested.join(', ')}`);
      }
      if (updates.tags.suggested.length > 0) {
        changes.push(`+tags: ${updates.tags.suggested.join(', ')}`);
      }
      console.log(`  • ${name}`);
      console.log(`    ${changes.join(' | ')}`);
    }
    console.log('');
  }

  // Apply changes if not dry run
  if (!DRY_RUN && results.withChanges > 0) {
    try {
      fs.writeFileSync(RECIPES_FILE, JSON.stringify(updatedRecipes, null, 2));
      console.log(`✅ Changes saved to ${RECIPES_FILE}`);
    } catch (error) {
      console.error(`❌ Failed to save changes: ${error.message}`);
      process.exit(1);
    }
  } else if (DRY_RUN && results.withChanges > 0) {
    console.log('ℹ️  Run with --apply to save changes');
  } else {
    console.log('✅ No changes needed');
  }
}

// Run
main().catch(console.error);
