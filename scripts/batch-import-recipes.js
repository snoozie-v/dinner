#!/usr/bin/env node
/**
 * Batch Recipe Importer
 *
 * This script fetches recipes from popular cooking sites and builds up the default recipe library.
 *
 * Usage:
 *   1. Start the proxy server: npm run proxy
 *   2. Run this script: node scripts/batch-import-recipes.js
 *
 * The script will:
 *   - Read recipe URLs from scripts/recipe-urls.txt (one URL per line)
 *   - Fetch and parse each recipe
 *   - Save valid recipes to src/recipes.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3001';
const URLS_FILE = process.env.URLS_FILE || path.join(__dirname, 'beef-recipes.txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'recipes.json');
const DELAY_BETWEEN_REQUESTS = 3000; // 3 seconds to be respectful and avoid rate limits
const CUSTOM_TAGS = process.env.CUSTOM_TAGS ? process.env.CUSTOM_TAGS.split(',') : []; // Add custom tags to all imported recipes

// Known cooking units for parsing
const KNOWN_UNITS = [
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

// HTML entity decoder
function decodeHtmlEntities(text) {
  if (!text) return text;

  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#34;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&#x27;': "'",
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&deg;': '°',
    '&frac12;': '½',
    '&frac14;': '¼',
    '&frac34;': '¾',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

  return decoded;
}

// Fetch recipe HTML via proxy
async function fetchRecipeHtml(url) {
  const response = await fetch(`${PROXY_URL}/api/fetch-recipe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !data.html) {
    throw new Error('Failed to fetch HTML');
  }

  return data.html;
}

// Extract JSON-LD from HTML
function extractJsonLd(html) {
  const scripts = [];
  const scriptRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        scripts.push(...parsed);
      } else {
        scripts.push(parsed);
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return scripts;
}

// Find recipe in JSON-LD data
function findRecipeSchema(jsonLdScripts) {
  for (const script of jsonLdScripts) {
    if (!script || typeof script !== 'object') continue;

    // Direct recipe
    if (isRecipeType(script)) return script;

    // Check @graph
    if (script['@graph'] && Array.isArray(script['@graph'])) {
      for (const item of script['@graph']) {
        if (isRecipeType(item)) return item;
      }
    }
  }
  return null;
}

function isRecipeType(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const type = obj['@type'];
  if (typeof type === 'string') return type === 'Recipe';
  if (Array.isArray(type)) return type.includes('Recipe');
  return false;
}

// Parse quantity string
function parseQuantity(qtyStr) {
  const str = qtyStr.trim();

  // Handle ranges
  if (str.includes('-')) {
    const parts = str.split('-').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return (parts[0] + parts[1]) / 2;
    }
  }

  // Mixed fractions: "1 1/2"
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // Simple fractions: "1/2"
  const fracMatch = str.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// Extract name and preparation
function extractNameAndPrep(rest) {
  // Parentheses: "cabbage (shredded)"
  const parenMatch = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return { name: parenMatch[1].trim(), preparation: parenMatch[2].trim() };
  }

  // Comma: "chicken, diced"
  const commaIndex = rest.indexOf(',');
  if (commaIndex !== -1) {
    return {
      name: rest.substring(0, commaIndex).trim(),
      preparation: rest.substring(commaIndex + 1).trim(),
    };
  }

  return { name: rest.trim(), preparation: '' };
}

// Parse single ingredient
function parseIngredient(ingredientStr) {
  if (!ingredientStr?.trim()) return null;

  const str = decodeHtmlEntities(ingredientStr.trim());
  const unitPattern = KNOWN_UNITS.join('|');

  // With unit
  const patternWithUnit = new RegExp(`^([\\d\\s\\/\\-\\.]+)\\s+(${unitPattern})\\s+(.+)$`, 'i');
  let match = str.match(patternWithUnit);
  if (match) {
    const quantity = parseQuantity(match[1].trim());
    const { name, preparation } = extractNameAndPrep(match[3]);
    return {
      name,
      quantity,
      unit: match[2].toLowerCase().replace(/\.$/, ''),
      preparation: preparation || undefined,
      category: guessCategory(name),
      optional: false,
    };
  }

  // Without unit
  const patternNoUnit = /^([\d\s\/\-\.]+)\s+(.+)$/;
  match = str.match(patternNoUnit);
  if (match) {
    const quantity = parseQuantity(match[1].trim());
    const { name, preparation } = extractNameAndPrep(match[2]);
    return {
      name,
      quantity,
      unit: '',
      preparation: preparation || undefined,
      category: guessCategory(name),
      optional: false,
    };
  }

  // No quantity
  const { name, preparation } = extractNameAndPrep(str);
  return {
    name,
    quantity: null,
    unit: '',
    preparation: preparation || undefined,
    category: guessCategory(name),
    optional: false,
  };
}

// Guess ingredient category based on name
function guessCategory(name) {
  const lower = name.toLowerCase();

  // Proteins
  if (/chicken|beef|pork|lamb|turkey|duck|bacon|sausage|ham|steak|ground meat/i.test(lower)) return 'protein/meat';
  if (/shrimp|salmon|tuna|fish|cod|tilapia|crab|lobster|scallop|mussels|clam/i.test(lower)) return 'protein/seafood';

  // Dairy
  if (/milk|cream|cheese|butter|yogurt|sour cream|parmesan|mozzarella|cheddar/i.test(lower)) return 'dairy';

  // Produce
  if (/onion|garlic|tomato|pepper|carrot|celery|lettuce|spinach|kale|broccoli|potato|mushroom|zucchini|cucumber|avocado|lemon|lime|orange|apple|berry|banana|cilantro|parsley|basil|cabbage|corn/i.test(lower)) return 'produce';

  // Pantry
  if (/oil|vinegar|sauce|broth|stock|honey|sugar|flour|rice|pasta|bean|lentil|chickpea|coconut milk/i.test(lower)) return 'pantry';

  // Spices
  if (/salt|pepper|cumin|paprika|oregano|thyme|rosemary|cinnamon|nutmeg|cayenne|chili powder|garlic powder|onion powder/i.test(lower)) return 'spices';

  // Condiments
  if (/ketchup|mustard|mayo|mayonnaise|soy sauce|hot sauce|sriracha|salsa|relish/i.test(lower)) return 'condiments';

  // Bakery
  if (/bread|tortilla|bun|roll|pita|naan|croissant/i.test(lower)) return 'bakery';

  // Canned goods
  if (/canned|can of/i.test(lower)) return 'canned goods';

  return 'other';
}

// Parse instructions - handles HowToSection and HowToStep schema structures
function parseInstructions(instructions) {
  if (!instructions) return [];

  const sections = [];

  if (typeof instructions === 'string') {
    const steps = instructions.split(/\n+/).filter(s => s.trim()).map(s => decodeHtmlEntities(s));
    if (steps.length > 0) {
      sections.push({ section: 'Instructions', steps });
    }
  } else if (Array.isArray(instructions)) {
    let currentSteps = [];

    for (const inst of instructions) {
      if (typeof inst === 'string') {
        currentSteps.push(decodeHtmlEntities(inst.trim()));
      } else if (inst && typeof inst === 'object') {
        const instType = inst['@type'];

        // Handle HowToSection - contains itemListElement with nested steps
        if (instType === 'HowToSection' && Array.isArray(inst.itemListElement)) {
          // Save any accumulated steps first
          if (currentSteps.length > 0) {
            sections.push({ section: 'Instructions', steps: currentSteps });
            currentSteps = [];
          }

          // Extract steps from the section
          const sectionName = typeof inst.name === 'string'
            ? decodeHtmlEntities(inst.name.trim().replace(/:$/, ''))
            : 'Instructions';
          const sectionSteps = [];

          for (const item of inst.itemListElement) {
            if (typeof item === 'string') {
              sectionSteps.push(decodeHtmlEntities(item));
            } else if (item && typeof item === 'object') {
              // HowToStep or HowToDirection
              const stepText = item.text || item.name;
              if (typeof stepText === 'string' && stepText.trim()) {
                sectionSteps.push(decodeHtmlEntities(stepText.trim()));
              }
            }
          }

          if (sectionSteps.length > 0) {
            sections.push({ section: sectionName, steps: sectionSteps });
          }
        }
        // Handle direct HowToStep
        else if (inst.text) {
          currentSteps.push(decodeHtmlEntities(inst.text.trim()));
        } else if (inst.name && instType !== 'HowToSection') {
          // Only use name if it's not a section header
          currentSteps.push(decodeHtmlEntities(inst.name.trim()));
        }
      }
    }

    // Add any remaining steps
    if (currentSteps.length > 0) {
      sections.push({ section: 'Instructions', steps: currentSteps });
    }
  }

  return sections.filter(s => s.steps.length > 0);
}

// Parse servings
function parseServings(recipeYield) {
  if (typeof recipeYield === 'number') {
    return { default: recipeYield, unit: 'servings' };
  }

  if (typeof recipeYield === 'string') {
    const match = recipeYield.match(/(\d+)/);
    if (match) {
      return { default: parseInt(match[1]), unit: 'servings' };
    }
  }

  return { default: 4, unit: 'servings' };
}

// Parse nutrition
function parseNutrition(nutrition) {
  if (!nutrition) return null;

  const parseValue = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseFloat(val.replace(/[^\d.]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  return {
    calories: parseValue(nutrition.calories),
    protein_g: parseValue(nutrition.proteinContent),
    carbs_g: parseValue(nutrition.carbohydrateContent),
    fat_g: parseValue(nutrition.fatContent),
    fiber_g: parseValue(nutrition.fiberContent),
    source: 'imported',
  };
}

// Infer meal types from categories, keywords, and name
function inferMealTypes(categories, keywords, name) {
  const mealTypes = new Set();

  // Combine all text sources for matching
  const allText = [...categories, ...keywords, name].map(s => s.toLowerCase());

  // Mapping patterns to meal types
  const mealTypePatterns = [
    {
      patterns: [/breakfast/, /brunch/, /morning/, /pancake/, /waffle/, /omelette/, /omelet/, /scramble/, /french toast/],
      mealType: 'breakfast',
    },
    {
      patterns: [/lunch/, /sandwich/, /wrap/, /salad/, /tacos?/, /burrito/, /quesadilla/],
      mealType: 'lunch',
    },
    {
      patterns: [/dinner/, /supper/, /main dish/, /main course/, /entree/, /entrée/, /tacos?/, /burrito/, /enchilada/, /fajita/],
      mealType: 'dinner',
    },
    {
      patterns: [/dessert/, /cake/, /cookie/, /brownie/, /pie/, /pastry/, /sweet treat/, /ice cream/, /pudding/],
      mealType: 'dessert',
    },
    {
      patterns: [/snack/, /appetizer/, /finger food/, /dip/, /chips/],
      mealType: 'snack',
    },
  ];

  for (const { patterns, mealType } of mealTypePatterns) {
    for (const text of allText) {
      if (patterns.some(pattern => pattern.test(text))) {
        mealTypes.add(mealType);
        break;
      }
    }
  }

  // If no meal types were inferred and it looks like a main dish, default to dinner
  if (mealTypes.size === 0) {
    const mainDishIndicators = [/chicken/, /beef/, /pork/, /fish/, /pasta/, /rice/, /steak/, /roast/, /casserole/, /stew/, /soup/];
    for (const text of allText) {
      if (mainDishIndicators.some(pattern => pattern.test(text))) {
        mealTypes.add('dinner');
        break;
      }
    }
  }

  return Array.from(mealTypes);
}

// Generate unique ID
function generateId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${slug}-${rand}`;
}

// Parse full recipe
function parseRecipe(schema, sourceUrl) {
  const recipe = {
    id: generateId(schema.name || 'recipe'),
    sourceUrl,
    isCustom: false, // Mark as default recipe
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };

  // Basic info
  if (schema.name) recipe.name = decodeHtmlEntities(schema.name.trim());
  if (schema.description) recipe.description = decodeHtmlEntities(schema.description.trim());

  // Author
  if (schema.author) {
    recipe.author = typeof schema.author === 'string'
      ? decodeHtmlEntities(schema.author)
      : decodeHtmlEntities(schema.author?.name || '');
  }

  // Image
  if (schema.image) {
    if (typeof schema.image === 'string') {
      recipe.imageUrl = schema.image;
    } else if (Array.isArray(schema.image)) {
      recipe.imageUrl = typeof schema.image[0] === 'string' ? schema.image[0] : schema.image[0]?.url;
    } else if (schema.image.url) {
      recipe.imageUrl = schema.image.url;
    }
  }

  // Times
  if (schema.prepTime) recipe.prepTime = schema.prepTime;
  if (schema.cookTime) recipe.cookTime = schema.cookTime;
  if (schema.totalTime) recipe.totalTime = schema.totalTime;

  // Difficulty (guess based on time/ingredients)
  recipe.difficulty = 'medium';

  // Servings
  recipe.servings = parseServings(schema.recipeYield);

  // Tags and categories
  const tags = [];
  const categories = [];
  const keywords = [];

  if (schema.recipeCategory) {
    const cats = Array.isArray(schema.recipeCategory) ? schema.recipeCategory : [schema.recipeCategory];
    categories.push(...cats.map(c => decodeHtmlEntities(c.trim())));
    tags.push(...categories.map(c => c.toLowerCase()));
  }
  if (schema.keywords) {
    const kws = typeof schema.keywords === 'string'
      ? schema.keywords.split(',').map(k => k.trim())
      : schema.keywords;
    keywords.push(...kws.map(k => decodeHtmlEntities(k.trim())));
    tags.push(...keywords.map(k => k.toLowerCase()));
  }
  // Add custom tags from environment variable
  if (CUSTOM_TAGS.length > 0) {
    tags.push(...CUSTOM_TAGS);
  }
  if (tags.length > 0) {
    recipe.tags = [...new Set(tags)].slice(0, 15); // Limit to 15 tags
  }

  // Infer meal types from categories, keywords, and recipe name
  const mealTypes = inferMealTypes(categories, keywords, recipe.name || '');
  if (mealTypes.length > 0) {
    recipe.mealTypes = mealTypes;
  }

  // Cuisine
  if (schema.recipeCuisine) {
    recipe.cuisine = Array.isArray(schema.recipeCuisine)
      ? decodeHtmlEntities(schema.recipeCuisine[0])
      : decodeHtmlEntities(schema.recipeCuisine);
  }

  // Ingredients
  if (schema.recipeIngredient && Array.isArray(schema.recipeIngredient)) {
    recipe.ingredients = schema.recipeIngredient
      .map(ing => parseIngredient(ing))
      .filter(ing => ing !== null);
  }

  // Instructions
  if (schema.recipeInstructions) {
    recipe.instructions = parseInstructions(schema.recipeInstructions);
  }

  // Nutrition
  if (schema.nutrition) {
    recipe.nutrition = parseNutrition(schema.nutrition);
  }

  return recipe;
}

// Main import function
async function importRecipes() {
  console.log('🍳 Recipe Batch Importer\n');

  // Check if proxy is running
  try {
    const health = await fetch(`${PROXY_URL}/health`);
    if (!health.ok) throw new Error();
    console.log('✓ Proxy server is running\n');
  } catch {
    console.error('✗ Proxy server not running. Start it with: npm run proxy\n');
    process.exit(1);
  }

  // Read URLs
  if (!fs.existsSync(URLS_FILE)) {
    console.log(`Creating ${URLS_FILE} - add recipe URLs (one per line) and run again.\n`);
    fs.writeFileSync(URLS_FILE, `# Add recipe URLs here, one per line
# Lines starting with # are ignored
# Example:
# https://www.allrecipes.com/recipe/123/example-recipe/
`);
    process.exit(0);
  }

  const urlsContent = fs.readFileSync(URLS_FILE, 'utf-8');
  const urls = urlsContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  if (urls.length === 0) {
    console.log('No URLs found in recipe-urls.txt\n');
    process.exit(0);
  }

  console.log(`Found ${urls.length} URLs to import\n`);

  // Load existing recipes
  let existingRecipes = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingRecipes = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      console.log(`Loaded ${existingRecipes.length} existing recipes\n`);
    } catch {
      console.log('Could not load existing recipes, starting fresh\n');
    }
  }

  // Track existing URLs to avoid duplicates
  const existingUrls = new Set(existingRecipes.map(r => r.sourceUrl).filter(Boolean));

  // Import each URL
  const imported = [];
  const failed = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] ${url}`);

    // Skip if already imported
    if (existingUrls.has(url)) {
      console.log('  → Skipped (already imported)\n');
      continue;
    }

    try {
      // Fetch HTML
      const html = await fetchRecipeHtml(url);

      // Extract JSON-LD
      const jsonLd = extractJsonLd(html);
      if (jsonLd.length === 0) {
        throw new Error('No JSON-LD data found');
      }

      // Find recipe schema
      const recipeSchema = findRecipeSchema(jsonLd);
      if (!recipeSchema) {
        throw new Error('No recipe schema found');
      }

      // Parse recipe
      const recipe = parseRecipe(recipeSchema, url);

      if (!recipe.name) {
        throw new Error('Recipe has no name');
      }

      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        throw new Error('Recipe has no ingredients');
      }

      imported.push(recipe);
      console.log(`  ✓ Imported: ${recipe.name}\n`);

    } catch (error) {
      failed.push({ url, error: error.message });
      console.log(`  ✗ Failed: ${error.message}\n`);
    }

    // Rate limiting
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
    }
  }

  // Merge and save
  const allRecipes = [...existingRecipes, ...imported];
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allRecipes, null, 2));

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Import Complete!\n');
  console.log(`  Imported: ${imported.length} recipes`);
  console.log(`  Failed: ${failed.length} recipes`);
  console.log(`  Total in library: ${allRecipes.length} recipes\n`);

  if (failed.length > 0) {
    console.log('Failed URLs:');
    for (const { url, error } of failed) {
      console.log(`  - ${url}`);
      console.log(`    ${error}`);
    }
  }
}

// Run
importRecipes().catch(console.error);
