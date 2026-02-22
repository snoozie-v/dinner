// src/utils/recipeParser.ts
import type { Recipe, Ingredient, InstructionSection, Nutrition, MealType } from '../types';
import { PROXY_URL } from '../config';

export interface ParseResult {
  success: boolean;
  recipe?: Partial<Recipe>;
  errors?: string[];
}

/**
 * Decodes HTML entities in a string
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  // Create a map of common HTML entities
  const entities: Record<string, string> = {
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
  };

  // Replace known entities
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }

  // Handle numeric entities like &#123; or &#x7B;
  decoded = decoded.replace(/&#(\d+);/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 10));
  });

  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (_, code) => {
    return String.fromCharCode(parseInt(code, 16));
  });

  return decoded;
}

interface SchemaOrgRecipe {
  '@type'?: string | string[];
  name?: string;
  description?: string;
  author?: string | { name?: string; '@type'?: string };
  url?: string;
  image?: string | string[] | { url?: string };
  recipeIngredient?: string[];
  recipeInstructions?: string | string[] | Array<{
    '@type'?: string;
    text?: string;
    name?: string;
    itemListElement?: Array<{
      '@type'?: string;
      text?: string;
      name?: string;
    }>;
  }>;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string | number;
  recipeCategory?: string | string[];
  recipeCuisine?: string | string[];
  keywords?: string | string[];
  nutrition?: {
    '@type'?: string;
    calories?: string | number;
    proteinContent?: string | number;
    carbohydrateContent?: string | number;
    fatContent?: string | number;
    fiberContent?: string | number;
  };
  aggregateRating?: {
    ratingValue?: number | string;
  };
  video?: {
    contentUrl?: string;
  } | string;
}

/**
 * Parses a recipe from a URL by extracting Schema.org JSON-LD data
 */
export async function parseRecipeFromUrl(url: string): Promise<ParseResult> {
  const errors: string[] = [];

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      success: false,
      errors: ['Invalid URL format. Please enter a valid recipe URL.']
    };
  }

  // Check if this is an AMP page and try non-AMP version first
  const isAmpUrl = url.includes('.amp') || url.includes('/amp/') || url.includes('?amp') || parsedUrl.pathname.endsWith('/amp');
  if (isAmpUrl) {
    // Try non-AMP version first
    const nonAmpUrl = url
      .replace('.amp', '')
      .replace('/amp/', '/')
      .replace('/amp', '')
      .replace('?amp', '');

    if (nonAmpUrl !== url) {
      const nonAmpResult = await tryFetchRecipe(nonAmpUrl);
      if (nonAmpResult.success) {
        return nonAmpResult;
      }
      // If non-AMP fails, continue with original URL
    }
  }

  return await tryFetchRecipe(url);
}

/**
 * Fetches HTML using proxy server if available, falls back to direct fetch
 */
async function fetchRecipeHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  // Try proxy first
  try {
    const proxyResponse = await fetch(`${PROXY_URL}/api/fetch-recipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data = await proxyResponse.json();

    if (proxyResponse.ok && data.success && data.html) {
      console.log('Fetched via proxy server');
      return { html: data.html, finalUrl: data.url || url };
    }

    // Proxy returned an error - throw it instead of falling back
    if (data.error) {
      throw new Error(data.error);
    }

    // Proxy failed without error message, try direct fetch
    console.log('Proxy fetch failed, trying direct fetch');
  } catch (proxyError) {
    // Re-throw if it's our own error message
    if (proxyError instanceof Error && !proxyError.message.includes('fetch')) {
      throw proxyError;
    }
    console.log('Proxy not available, trying direct fetch');
  }

  // Fallback to direct fetch (will likely fail with CORS for most sites)
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  return { html, finalUrl: response.url || url };
}

/**
 * Attempts to fetch and parse a recipe from a URL
 */
async function tryFetchRecipe(url: string): Promise<ParseResult> {
  try {
    // Fetch HTML content (via proxy or direct)
    const { html } = await fetchRecipeHtml(url);

    // Extract JSON-LD scripts
    const jsonLdScripts = extractJsonLd(html);

    console.log(`Found ${jsonLdScripts.length} JSON-LD scripts on page`);

    if (jsonLdScripts.length === 0) {
      // Check if this is an AMP page
      const isAmpPage = html.includes('⚡') || html.includes('amp-') || html.toLowerCase().includes('<html amp');
      if (isAmpPage) {
        return {
          success: false,
          errors: ['AMP pages often lack recipe data. Try removing .amp from the URL or use the regular (non-AMP) version of the page.']
        };
      }

      return {
        success: false,
        errors: ['This website doesn\'t use standard recipe formatting. Try another site or look for a different recipe page on the same site.']
      };
    }

    // Find recipe schema
    const recipeSchema = findRecipeSchema(jsonLdScripts);

    if (!recipeSchema) {
      console.log('No recipe schema found in JSON-LD data');
      return {
        success: false,
        errors: ['No recipe data found on this page. The page may not contain a recipe, or it may use non-standard formatting.']
      };
    }

    // Parse recipe data
    const recipe = parseRecipeSchema(recipeSchema, url);

    // Validate we got at least a name
    if (!recipe.name || recipe.name.trim() === '') {
      return {
        success: false,
        errors: ['Recipe name is missing from the page data. The page may not be formatted correctly.']
      };
    }

    console.log('Successfully parsed recipe:', recipe.name);
    return {
      success: true,
      recipe
    };

  } catch (error) {
    // Check for CORS errors (most common)
    if (error instanceof TypeError) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('cors') || errorMsg.includes('load failed')) {
        return {
          success: false,
          errors: [
            'This website blocks automatic imports (CORS policy). You can still add this recipe manually - copy the URL and paste it in the Source URL field when creating a recipe.'
          ]
        };
      }
    }

    console.error('Parse error:', error);
    return {
      success: false,
      errors: [`Failed to import recipe: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Extracts all JSON-LD script tags from HTML
 */
function extractJsonLd(html: string): Array<unknown> {
  const scripts: Array<unknown> = [];

  // Use a more flexible regex that handles various spacing patterns
  const scriptRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;
  let matchCount = 0;

  while ((match = scriptRegex.exec(html)) !== null) {
    matchCount++;
    try {
      const jsonContent = match[1].trim();

      // Skip empty content
      if (!jsonContent) {
        console.log(`JSON-LD #${matchCount}: empty content`);
        continue;
      }

      const parsed = JSON.parse(jsonContent);

      // If parsed result is an array, add each item separately
      // Otherwise add the object as-is
      if (Array.isArray(parsed)) {
        console.log(`JSON-LD #${matchCount}: successfully parsed (array with ${parsed.length} items)`);
        scripts.push(...parsed);
      } else {
        console.log(`JSON-LD #${matchCount}: successfully parsed (object)`);
        scripts.push(parsed);
      }
    } catch (err) {
      console.log(`JSON-LD #${matchCount}: parse error -`, err instanceof Error ? err.message : 'unknown');
      // Skip invalid JSON
      continue;
    }
  }

  console.log(`Total JSON-LD items extracted: ${scripts.length}`);
  return scripts;
}

/**
 * Finds the Recipe schema from JSON-LD data
 */
function findRecipeSchema(jsonLdScripts: Array<unknown>): SchemaOrgRecipe | null {
  const foundTypes: string[] = [];

  for (let i = 0; i < jsonLdScripts.length; i++) {
    const script = jsonLdScripts[i];

    // Skip non-objects
    if (!script || typeof script !== 'object') {
      continue;
    }

    const scriptObj = script as Record<string, unknown>;

    // Track what types we're seeing for debugging
    const scriptType = scriptObj['@type'];
    if (scriptType) {
      foundTypes.push(Array.isArray(scriptType) ? scriptType.join(', ') : String(scriptType));
    }

    // Check if this is directly a Recipe
    if (isRecipeType(script)) {
      console.log('Found Recipe schema');
      return script as SchemaOrgRecipe;
    }

    // Check if it has a @graph array
    if (scriptObj['@graph'] && Array.isArray(scriptObj['@graph'])) {
      for (const item of scriptObj['@graph']) {
        if (typeof item === 'object' && item !== null) {
          const itemType = (item as Record<string, unknown>)['@type'];
          if (itemType) {
            foundTypes.push(Array.isArray(itemType) ? itemType.join(', ') : String(itemType));
          }

          if (isRecipeType(item)) {
            console.log('Found Recipe schema in @graph');
            return item as SchemaOrgRecipe;
          }
        }
      }
    }
  }

  console.log('Schema types found:', foundTypes.join('; '));
  return null;
}

/**
 * Checks if an object is a Recipe type
 */
function isRecipeType(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const typed = obj as Record<string, unknown>;
  const type = typed['@type'];

  if (typeof type === 'string') {
    return type === 'Recipe';
  }
  if (Array.isArray(type)) {
    return type.includes('Recipe');
  }
  return false;
}

/**
 * Parses Schema.org recipe data into app's Recipe format
 */
function parseRecipeSchema(schema: SchemaOrgRecipe, sourceUrl: string): Partial<Recipe> {
  const recipe: Partial<Recipe> = {
    sourceUrl,
    isCustom: true,
  };

  // Basic info
  if (schema.name) {
    recipe.name = decodeHtmlEntities(schema.name.trim());
  }

  if (schema.description) {
    recipe.description = decodeHtmlEntities(schema.description.trim());
  }

  // Author
  if (schema.author) {
    if (typeof schema.author === 'string') {
      recipe.author = decodeHtmlEntities(schema.author.trim());
    } else if (schema.author.name) {
      recipe.author = decodeHtmlEntities(schema.author.name.trim());
    }
  }

  // Image
  if (schema.image) {
    if (typeof schema.image === 'string') {
      recipe.imageUrl = schema.image;
    } else if (Array.isArray(schema.image) && schema.image.length > 0) {
      const firstImage = schema.image[0];
      recipe.imageUrl = typeof firstImage === 'string' ? firstImage : firstImage.url;
    } else if (typeof schema.image === 'object' && 'url' in schema.image) {
      recipe.imageUrl = schema.image.url;
    }
  }

  // Times (keep as ISO 8601 strings)
  if (schema.prepTime) {
    recipe.prepTime = schema.prepTime;
  }
  if (schema.cookTime) {
    recipe.cookTime = schema.cookTime;
  }
  if (schema.totalTime) {
    recipe.totalTime = schema.totalTime;
  }

  // Servings
  if (schema.recipeYield) {
    const servings = parseServings(schema.recipeYield);
    if (servings) {
      recipe.servings = servings;
    }
  }

  // Tags and categories
  const tags: string[] = [];
  const categories: string[] = [];
  const keywords: string[] = [];

  if (schema.recipeCategory) {
    const cats = Array.isArray(schema.recipeCategory)
      ? schema.recipeCategory
      : [schema.recipeCategory];
    categories.push(...cats.map(c => decodeHtmlEntities(c.trim())));
    tags.push(...categories);
  }

  if (schema.keywords) {
    const kws = typeof schema.keywords === 'string'
      ? schema.keywords.split(',').map(k => k.trim())
      : schema.keywords;
    keywords.push(...kws.map(k => decodeHtmlEntities(k.trim())));
    tags.push(...keywords);
  }

  if (tags.length > 0) {
    recipe.tags = [...new Set(tags)]; // Remove duplicates
  }

  // Infer meal types from categories, keywords, and recipe name
  const mealTypes = inferMealTypes(categories, keywords, recipe.name || '');
  if (mealTypes.length > 0) {
    recipe.mealTypes = mealTypes;
  }

  // Cuisine
  if (schema.recipeCuisine) {
    const cuisineValue = Array.isArray(schema.recipeCuisine)
      ? schema.recipeCuisine[0]
      : schema.recipeCuisine;
    recipe.cuisine = decodeHtmlEntities(cuisineValue);
  }

  // Ingredients
  if (schema.recipeIngredient && Array.isArray(schema.recipeIngredient)) {
    recipe.ingredients = schema.recipeIngredient
      .flatMap(ing => {
        const result = parseIngredient(ing);
        if (!result) return [];
        return Array.isArray(result) ? result : [result];
      });
  }

  // Instructions
  if (schema.recipeInstructions) {
    recipe.instructions = parseInstructions(schema.recipeInstructions);
  }

  // Nutrition
  if (schema.nutrition) {
    recipe.nutrition = parseNutrition(schema.nutrition);
  }

  // Rating
  if (schema.aggregateRating?.ratingValue) {
    const rating = typeof schema.aggregateRating.ratingValue === 'string'
      ? parseFloat(schema.aggregateRating.ratingValue)
      : schema.aggregateRating.ratingValue;
    if (!isNaN(rating)) {
      recipe.rating = rating;
    }
  }

  // Video
  if (schema.video) {
    if (typeof schema.video === 'string') {
      recipe.videoUrl = schema.video;
    } else if (typeof schema.video === 'object' && 'contentUrl' in schema.video) {
      recipe.videoUrl = schema.video.contentUrl;
    }
  }

  return recipe;
}

/**
 * Parses servings from various formats
 */
function parseServings(recipeYield: string | number): { default: number; unit: string } | null {
  if (typeof recipeYield === 'number') {
    return { default: recipeYield, unit: 'servings' };
  }

  // Try to extract number from string like "4 servings", "Serves 6", "Makes 8"
  const match = recipeYield.match(/(\d+)/);
  if (match) {
    return { default: parseInt(match[1]), unit: 'servings' };
  }

  return null;
}

/**
 * Infers meal types from recipe categories, keywords, and name
 */
function inferMealTypes(
  categories: string[],
  keywords: string[],
  name: string
): MealType[] {
  const mealTypes: Set<MealType> = new Set();

  // Combine all text sources for matching
  const allText = [...categories, ...keywords, name].map(s => s.toLowerCase());

  // Mapping patterns to meal types
  const mealTypePatterns: { patterns: RegExp[]; mealType: MealType }[] = [
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

// ── Unicode fraction normalization ───────────────────────────────────────────
const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2', '¼': '1/4', '¾': '3/4',
  '⅓': '1/3', '⅔': '2/3',
  '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅙': '1/6', '⅚': '5/6',
};

function normalizeUnicodeFractions(str: string): string {
  let s = str;
  for (const [frac, ascii] of Object.entries(UNICODE_FRACTIONS)) {
    // "1½" → "1 1/2"  (digit immediately before fraction char)
    s = s.replace(new RegExp(`(\\d)${frac}`, 'g'), `$1 ${ascii}`);
    s = s.replace(new RegExp(frac, 'g'), ascii);
  }
  return s;
}

// ── Category guesser ──────────────────────────────────────────────────────────
function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/\b(chicken|beef|pork|lamb|turkey|duck|veal|bison|venison|bacon|sausage|ham|steak|ground meat|mince|meatball|salami|pepperoni|prosciutto|pancetta|lardons?|lard|suet|tallow|chicken liver|chicken thigh|chicken breast|chicken drum|chicken wing|rotisserie)\b/.test(n)) return 'protein/meat';
  if (/\b(shrimp|prawn|salmon|tuna|cod|tilapia|halibut|bass|trout|catfish|fish|crab|lobster|scallop|mussel|clam|oyster|anchov|calamari|squid|octopus|mahi|swordfish|sea bass)\b/.test(n)) return 'protein/seafood';
  if (/\b(milk|cream|cheese|butter|yogurt|yoghurt|sour cream|crème fraîche|creme fraiche|parmesan|mozzarella|cheddar|ricotta|mascarpone|brie|gouda|feta|gruyère|gruyere|colby|provolone|jack cheese|cream cheese|cottage cheese|ghee)\b/.test(n)) return 'dairy';
  if (/\b(bread|bun|roll|tortilla|pita|naan|flatbread|croissant|baguette|loaf|sourdough|brioche|ciabatta|focaccia|panini|cracker|pretzel|english muffin)\b/.test(n)) return 'bakery';
  if (/\b(canned|can of)\b/.test(n) || /^canned /.test(n)) return 'canned goods';
  if (/\b(frozen pea|frozen corn|frozen broccoli|frozen spinach|frozen edamame|ice cream|frozen meal|frozen pizza)\b/.test(n)) return 'frozen';
  if (/\b(salt|pepper|paprika|cumin|oregano|thyme|rosemary|cinnamon|nutmeg|cayenne|chili powder|chilli powder|garlic powder|onion powder|turmeric|coriander|cardamom|allspice|cloves|bay leaf|bay leaves|dill|fennel|ginger powder|mustard powder|curry powder|garam masala|five spice|old bay|taco seasoning|italian seasoning|baking soda|baking powder|cream of tartar|vanilla extract|smoked paprika|chipotle powder|ancho|dried basil|dried oregano|dried thyme|dried parsley|dried rosemary|dried sage|dried dill|dried cilantro|dried mint|seasoned salt|celery salt|garlic salt|red pepper flakes|crushed red pepper)\b/.test(n)) return 'spices';
  if (/\b(oil|vinegar|soy sauce|fish sauce|oyster sauce|worcestershire|hot sauce|sriracha|hoisin|ketchup|mustard|mayo|mayonnaise|salsa|relish|honey|maple syrup|molasses|tahini|pesto|tomato paste|tomato sauce|diced tomatoes|crushed tomatoes|pasta sauce|marinara|stock|broth|bouillon|cornstarch|cornflour|flour|sugar|rice|pasta|noodle|lentil|chickpea|black bean|kidney bean|pinto bean|navy bean|cannellini|coconut milk|coconut cream|chocolate chip|cocoa|condensed milk|evaporated milk|dried fruit|nut|seed|oat|grain|quinoa|couscous|bulgur|barley|cereal|cracker|panko|breadcrumb|sprinkle|extract|coloring|food color|raisin|cranberry|dried cranberry|cooking spray|non-stick|parchment)\b/.test(n)) return 'pantry';
  if (/\b(onion|garlic|tomato|pepper|carrot|celery|lettuce|spinach|kale|broccoli|potato|mushroom|zucchini|cucumber|avocado|lemon|lime|orange|apple|berry|banana|cilantro|parsley|basil|cabbage|corn|asparagus|bean sprout|bok choy|brussels|cauliflower|eggplant|aubergine|beet|radish|leek|shallot|scallion|green onion|spring onion|arugula|rocket|watercress|endive|fennel bulb|artichoke|squash|sweet potato|yam|turnip|parsnip|rutabaga|kohlrabi|jicama|tomatillo|jalapeño|jalapeno|habanero|serrano|anaheim|poblano|chipotle pepper|bell pepper|capsicum|ginger|turmeric root|herb|mint|sage|dill|chive|thyme|rosemary|oregano|tarragon|bay|sorrel|purslane|mango|papaya|pineapple|peach|plum|pear|grape|cherry|strawberry|blueberry|raspberry|blackberry|watermelon|melon|cantaloupe|fig|date|kiwi|pomegranate|persimmon|dragon fruit|passion fruit|lychee|jackfruit)\b/.test(n)) return 'produce';
  return 'other';
}

// ── Non-ingredient detection ──────────────────────────────────────────────────
const NON_INGREDIENT_RE = /^(other:|suggested\s+garnish|garnish[es]*:|for\s+garnish|preferred\s+topping|any\s+combination\s+of|any\s+of\s+the\s+following|bread\s+for\s+mopping|empanada\s+sauce$)/i;

// ── Salt-and-pepper combined entry ────────────────────────────────────────────
const SALT_AND_PEPPER_RE = /^(kosher\s+)?salt\s+and\s+(freshly\s+)?(ground\s+)?(black\s+)?pepper(\s+to\s+taste)?$/i;

// ── Prep verb set — only split on comma if text after comma starts with these ─
const PREP_VERBS = new Set([
  'diced', 'chopped', 'minced', 'sliced', 'shredded', 'grated', 'mashed',
  'julienned', 'halved', 'quartered', 'crushed', 'peeled', 'pitted', 'seeded',
  'deveined', 'trimmed', 'thawed', 'drained', 'rinsed', 'cooked', 'uncooked',
  'sifted', 'softened', 'melted', 'beaten', 'divided', 'crumbled', 'torn',
  'toasted', 'roasted', 'optional', 'for serving', 'for garnish', 'to taste',
  'packed', 'lightly packed', 'heaping', 'room temperature',
]);

function smartCommaPrep(raw: string): { name: string; preparation: string } {
  const commaIdx = raw.indexOf(',');
  if (commaIdx === -1) return { name: raw.trim(), preparation: '' };

  const beforeComma = raw.slice(0, commaIdx).trim();
  const afterComma = raw.slice(commaIdx + 1).trim().toLowerCase();

  // Only split if the part after the comma starts with a known preparation verb
  const firstWord = afterComma.split(/\s+/)[0];
  if (PREP_VERBS.has(firstWord) || PREP_VERBS.has(afterComma.split(',')[0].trim())) {
    return { name: beforeComma, preparation: raw.slice(commaIdx + 1).trim() };
  }

  // Not a prep verb — keep the whole thing as the name
  return { name: raw.trim(), preparation: '' };
}

/**
 * Known cooking units - must be followed by a space to match
 * Listed from longest to shortest to match longer units first
 */
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

/**
 * Helper to extract name and preparation from ingredient rest.
 * Only splits on comma when the text after the comma is clearly a prep verb.
 */
function extractNameAndPrep(rest: string): { name: string; preparation: string } {
  // Check for trailing parentheses: "cabbage (shredded)"
  const parenMatch = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return {
      name: parenMatch[1].trim(),
      preparation: parenMatch[2].trim(),
    };
  }

  // Smart comma split — only when text after comma is a preparation verb
  return smartCommaPrep(rest);
}

/**
 * Parses an ingredient string into one or more structured Ingredient objects.
 * Returns null to skip, a single Ingredient, or an array (e.g. salt+pepper split).
 */
function parseIngredient(ingredientStr: string): Ingredient | Ingredient[] | null {
  if (!ingredientStr || ingredientStr.trim() === '') return null;

  // Decode HTML entities and normalise unicode fractions
  let str = decodeHtmlEntities(ingredientStr.trim());
  str = normalizeUnicodeFractions(str);

  // ── Skip non-ingredient annotation lines ──────────────────────────────────
  if (NON_INGREDIENT_RE.test(str)) return null;
  if (/^(other:|suggested garnishes?:|garnishes?:)/i.test(str)) return null;

  // ── Split "salt and pepper" into two entries ──────────────────────────────
  const saltPepperTest = str.replace(/\s+to\s+taste$/i, '').trim();
  if (SALT_AND_PEPPER_RE.test(saltPepperTest)) {
    return [
      { name: 'salt', quantity: 0, unit: '', preparation: 'to taste', category: 'spices' },
      { name: 'black pepper', quantity: 0, unit: '', preparation: 'to taste', category: 'spices' },
    ];
  }

  // ── Strip leading parenthetical quantity: "(50g) butter", "(2 1/4 tsp) yeast"
  const leadingParenQty = str.match(
    /^\(\s*(?:about\s+)?([\d\s./]+)\s*(g|ml|kg|oz|ounces?|grams?|milliliters?|millilitres?|liters?|litres?|cups?|tablespoons?|tbsp|teaspoons?|tsp|pounds?|lbs?|lb)\s*\)\s*/i
  );
  let prefixQty: number | null = null;
  let prefixUnit = '';
  if (leadingParenQty) {
    prefixQty = parseQuantity(leadingParenQty[1].trim());
    prefixUnit = leadingParenQty[2].toLowerCase().replace(/s$/, '').replace(/\.$/, '');
    str = str.slice(leadingParenQty[0].length);
  }

  // ── Strip leading slash-prefixed quantities: "/ 2.5 lb potatoes" ─────────
  const leadingSlashQty = str.match(/^\/\s*([\d\s./]+)\s*(g|ml|kg|oz|ounces?|grams?|pounds?|lbs?|lb|cups?|tablespoons?|tbsp|teaspoons?|tsp)\s+/i);
  if (leadingSlashQty && prefixQty === null) {
    prefixQty = parseQuantity(leadingSlashQty[1].trim());
    prefixUnit = leadingSlashQty[2].toLowerCase().replace(/s$/, '').replace(/\.$/, '');
    str = str.slice(leadingSlashQty[0].length);
  }

  // ── Strip size-only annotations that don't carry quantity info ────────────
  // e.g. "(9 inch)" in "(9 inch) unbaked pie crust"
  str = str.replace(/^\(\s*\d[\d\s./]*\s*inch(?:es)?\s*\)\s*/i, '').trim();

  // Build pattern with known units
  const unitPattern = KNOWN_UNITS.join('|');

  // Pattern: number immediately adjacent to unit — "200g butter", "500ml stock"
  const patternAdjacentUnit = new RegExp(
    `^(\\d+(?:\\.\\d+)?)\\s*(g|ml|kg)\\s+(.+)$`,
    'i'
  );

  // Pattern WITH a known unit: "2 cups flour, sifted"
  const patternWithUnit = new RegExp(
    `^([\\d\\s\\/\\-\\.]+)\\s+(${unitPattern})\\s+(.+)$`,
    'i'
  );

  // Pattern WITHOUT a unit: "1 cabbage" or "2 onions, diced"
  const patternNoUnit = /^([\d\s\/\-\.]+)\s+(.+)$/;

  let quantity: number | null = prefixQty;
  let unit = prefixUnit;
  let rest = str;

  if (prefixQty === null) {
    // Try adjacent-unit pattern first ("200g butter")
    let match = str.match(patternAdjacentUnit);
    if (match) {
      quantity = parseQuantity(match[1]);
      unit = match[2].toLowerCase();
      rest = match[3];
    } else {
      // Try standard with-unit pattern
      match = str.match(patternWithUnit);
      if (match) {
        quantity = parseQuantity(match[1].trim());
        unit = match[2].toLowerCase().replace(/\.$/, '');
        rest = match[3];
      } else {
        // Try no-unit pattern
        match = str.match(patternNoUnit);
        if (match) {
          quantity = parseQuantity(match[1].trim());
          rest = match[2];
        }
        // else: no quantity — rest = str, quantity = null
      }
    }
  }

  const { name, preparation } = extractNameAndPrep(rest);

  return {
    name: name.trim(),
    quantity,
    unit,
    preparation: preparation || undefined,
    category: guessCategory(name),
  };
}

/**
 * Parses quantity string to number (handles fractions)
 */
function parseQuantity(qtyStr: string): number | null {
  // Handle fractions like "1/2", "1 1/2", "2-3"
  const str = qtyStr.trim();

  // Helper to round to 2 decimal places
  const round = (n: number): number => Math.round(n * 100) / 100;

  // Handle ranges (take the average)
  if (str.includes('-')) {
    const [min, max] = str.split('-').map(s => parseFloat(s.trim()));
    if (!isNaN(min) && !isNaN(max)) {
      return round((min + max) / 2);
    }
  }

  // Handle mixed fractions like "1 1/2"
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    return round(whole + (num / den));
  }

  // Handle simple fractions like "1/2"
  const fracMatch = str.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    return round(num / den);
  }

  // Handle regular numbers
  const num = parseFloat(str);
  return isNaN(num) ? null : round(num);
}

/**
 * Parses instructions into sections
 * Handles HowToSection and HowToStep schema structures
 */
function parseInstructions(instructions: SchemaOrgRecipe['recipeInstructions']): InstructionSection[] {
  if (!instructions) {
    return [];
  }

  const sections: InstructionSection[] = [];

  if (typeof instructions === 'string') {
    // Single string - split by newlines
    const steps = instructions.split(/\n+/).filter(s => s.trim()).map(s => decodeHtmlEntities(s));
    if (steps.length > 0) {
      sections.push({ section: 'Instructions', steps });
    }
  } else if (Array.isArray(instructions)) {
    let currentSteps: string[] = [];

    for (const inst of instructions) {
      if (typeof inst === 'string') {
        currentSteps.push(decodeHtmlEntities(inst.trim()));
      } else if (inst && typeof inst === 'object') {
        const instObj = inst as Record<string, unknown>;
        const instType = instObj['@type'];

        // Handle HowToSection - contains itemListElement with nested steps
        if (instType === 'HowToSection' && Array.isArray(instObj.itemListElement)) {
          // Save any accumulated steps first
          if (currentSteps.length > 0) {
            sections.push({ section: 'Instructions', steps: currentSteps });
            currentSteps = [];
          }

          // Extract steps from the section
          const sectionName = typeof instObj.name === 'string'
            ? decodeHtmlEntities(instObj.name.trim().replace(/:$/, ''))
            : 'Instructions';
          const sectionSteps: string[] = [];

          for (const item of instObj.itemListElement as Array<Record<string, unknown>>) {
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

  // If no sections were created, return empty array
  // If we have sections, filter out any with empty steps
  return sections.filter(s => s.steps.length > 0);
}

/**
 * Parses nutrition information
 */
function parseNutrition(nutrition: SchemaOrgRecipe['nutrition']): Nutrition | null {
  if (!nutrition) return null;

  const parseNutrientValue = (value: string | number | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove units and parse (e.g., "200 calories" -> 200)
      const num = parseFloat(value.replace(/[^\d.]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  return {
    calories: parseNutrientValue(nutrition.calories),
    protein_g: parseNutrientValue(nutrition.proteinContent),
    carbs_g: parseNutrientValue(nutrition.carbohydrateContent),
    fat_g: parseNutrientValue(nutrition.fatContent),
    fiber_g: parseNutrientValue(nutrition.fiberContent),
    source: 'Schema.org',
  };
}
