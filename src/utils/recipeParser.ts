// src/utils/recipeParser.ts
import type { Recipe, Ingredient, InstructionSection, Nutrition } from '../types';

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
  const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001';

  // Try proxy first
  try {
    const proxyResponse = await fetch(`${PROXY_URL}/api/fetch-recipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      if (data.success && data.html) {
        console.log('Fetched via proxy server');
        return { html: data.html, finalUrl: data.url || url };
      }
    }

    // Proxy failed, try direct fetch
    console.log('Proxy fetch failed, trying direct fetch');
  } catch (proxyError) {
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

  if (schema.recipeCategory) {
    const categories = Array.isArray(schema.recipeCategory)
      ? schema.recipeCategory
      : [schema.recipeCategory];
    tags.push(...categories.map(c => decodeHtmlEntities(c.trim())));
  }

  if (schema.keywords) {
    const keywords = typeof schema.keywords === 'string'
      ? schema.keywords.split(',').map(k => k.trim())
      : schema.keywords;
    tags.push(...keywords.map(k => decodeHtmlEntities(k.trim())));
  }

  if (tags.length > 0) {
    recipe.tags = [...new Set(tags)]; // Remove duplicates
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
      .map(ing => parseIngredient(ing))
      .filter((ing): ing is Ingredient => ing !== null);
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
 * Parses an ingredient string into structured format
 */
function parseIngredient(ingredientStr: string): Ingredient | null {
  if (!ingredientStr || ingredientStr.trim() === '') {
    return null;
  }

  // Decode HTML entities first
  const str = decodeHtmlEntities(ingredientStr.trim());

  // Try to parse quantity and unit using regex
  // Matches patterns like: "2 cups flour", "1/2 tsp salt", "3-4 large eggs"
  const qtyUnitPattern = /^([\d\s\/\-\.]+)\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(.+)$/;
  const match = str.match(qtyUnitPattern);

  if (match) {
    const [, qtyStr, unit, rest] = match;
    const quantity = parseQuantity(qtyStr.trim());

    // Check if the rest contains a comma (often separates name from preparation)
    const commaIndex = rest.indexOf(',');
    let name = rest;
    let preparation: string | undefined;

    if (commaIndex !== -1) {
      name = rest.substring(0, commaIndex).trim();
      preparation = rest.substring(commaIndex + 1).trim();
    }

    return {
      name,
      quantity,
      unit: unit.trim(),
      preparation,
      category: 'Other',
    };
  }

  // No quantity/unit pattern found - treat entire string as ingredient name
  return {
    name: str,
    quantity: null,
    unit: '',
    category: 'Other',
  };
}

/**
 * Parses quantity string to number (handles fractions)
 */
function parseQuantity(qtyStr: string): number | null {
  // Handle fractions like "1/2", "1 1/2", "2-3"
  const str = qtyStr.trim();

  // Handle ranges (take the average)
  if (str.includes('-')) {
    const [min, max] = str.split('-').map(s => parseFloat(s.trim()));
    if (!isNaN(min) && !isNaN(max)) {
      return (min + max) / 2;
    }
  }

  // Handle mixed fractions like "1 1/2"
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const den = parseInt(mixedMatch[3]);
    return whole + (num / den);
  }

  // Handle simple fractions like "1/2"
  const fracMatch = str.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1]);
    const den = parseInt(fracMatch[2]);
    return num / den;
  }

  // Handle regular numbers
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * Parses instructions into sections
 */
function parseInstructions(instructions: SchemaOrgRecipe['recipeInstructions']): InstructionSection[] {
  if (!instructions) {
    return [];
  }

  const steps: string[] = [];

  if (typeof instructions === 'string') {
    // Single string - split by newlines or numbers
    steps.push(...instructions.split(/\n+/).filter(s => s.trim()).map(s => decodeHtmlEntities(s)));
  } else if (Array.isArray(instructions)) {
    for (const inst of instructions) {
      if (typeof inst === 'string') {
        steps.push(decodeHtmlEntities(inst.trim()));
      } else if (inst.text) {
        steps.push(decodeHtmlEntities(inst.text.trim()));
      } else if (inst.name) {
        steps.push(decodeHtmlEntities(inst.name.trim()));
      }
    }
  }

  return [{
    section: 'Instructions',
    steps: steps.filter(s => s.length > 0)
  }];
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
