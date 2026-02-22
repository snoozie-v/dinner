import { useState, useMemo, useEffect } from 'react';
import type { PlanItem, Recipe, ShoppingItem, ShoppingAdjustments, PantryStaple } from '../types';
import { STORAGE_KEYS, storage } from '../utils/storage';
import { usePersistedState } from './usePersistedState';
import { parseIngredientLine } from '../utils/recipeValidation';

// Ingredient families: any pantry member covers any other member in the same group.
// Keep groups to truly interchangeable ingredients to avoid false positives.
const INGREDIENT_FAMILIES: string[][] = [
  // Cooking oils
  ['oil', 'cooking oil', 'vegetable oil', 'canola oil', 'sunflower oil', 'corn oil',
   'olive oil', 'extra virgin olive oil', 'light olive oil', 'avocado oil',
   'coconut oil', 'grapeseed oil'],
  // Butter
  ['butter', 'unsalted butter', 'salted butter'],
  // All-purpose flour
  ['flour', 'all-purpose flour', 'plain flour'],
  // White/granulated sugar
  ['sugar', 'white sugar', 'granulated sugar', 'cane sugar'],
  // Dairy milk
  ['milk', 'whole milk', 'full-fat milk', '2% milk', 'skim milk', 'dairy milk'],
  // Salt
  ['salt', 'sea salt', 'table salt', 'kosher salt', 'rock salt', 'fine salt'],
  // Black pepper
  ['pepper', 'black pepper', 'ground pepper', 'ground black pepper', 'white pepper'],
  // Garlic
  ['garlic', 'garlic cloves', 'fresh garlic'],
  // Yellow/white/brown onion (not red, which has a distinct flavour)
  ['onion', 'yellow onion', 'white onion', 'brown onion', 'sweet onion'],
  // Generic broth / stock (generic terms only — chicken vs vegetable are distinct)
  ['broth', 'stock'],
  // Soy sauce
  ['soy sauce', 'light soy sauce'],
  // Vinegar (generic / white)
  ['vinegar', 'white vinegar'],
];

const SHOPPING_NAME_ALIASES: Record<string, string> = {
  // Black pepper
  'ground black pepper': 'black pepper',
  'freshly ground black pepper': 'black pepper',
  'fresh ground black pepper': 'black pepper',
  'cracked black pepper': 'black pepper',
  'fresh cracked pepper': 'black pepper',
  'freshly cracked black pepper': 'black pepper',
  'freshly cracked pepper': 'black pepper',
  'ground pepper': 'black pepper',

  // Salt
  'sea salt': 'salt',
  'kosher salt': 'salt',
  'table salt': 'salt',
  'fine salt': 'salt',
  'coarse salt': 'salt',
  'rock salt': 'salt',

  // Garlic (whole/cloves only — not pre-minced, which has a different form)
  'garlic cloves': 'garlic',
  'garlic clove': 'garlic',
  'fresh garlic': 'garlic',

  // Butter
  'unsalted butter': 'butter',
  'salted butter': 'butter',

  // Flour
  'all purpose flour': 'all-purpose flour',
  'plain flour': 'all-purpose flour',

  // Sugar
  'white sugar': 'sugar',
  'granulated sugar': 'sugar',
  'cane sugar': 'sugar',

  // Milk (generic dairy)
  'whole milk': 'milk',
  '2% milk': 'milk',
  'skim milk': 'milk',
  'full-fat milk': 'milk',
  'dairy milk': 'milk',

  // Onion (not red onion, which has distinct flavour)
  'yellow onion': 'onion',
  'white onion': 'onion',
  'brown onion': 'onion',
  'sweet onion': 'onion',

  // Olive oil
  'extra virgin olive oil': 'olive oil',
  'light olive oil': 'olive oil',

  // Broth / stock
  'chicken stock': 'chicken broth',
  'beef stock': 'beef broth',
  'vegetable stock': 'vegetable broth',

  // Soy sauce
  'light soy sauce': 'soy sauce',

  // Vinegar
  'white vinegar': 'vinegar',

  // Celery (unit descriptor words often baked into name by recipe parsers)
  'celery stalk': 'celery',
  'celery rib': 'celery',
  'celery stick': 'celery',
  'stalk celery': 'celery',
  'rib celery': 'celery',
  'stick celery': 'celery',

  // Basil leaf forms
  'basil leave': 'basil',
  'dried basil leave': 'dried basil',

  // Bay leaf forms
  'bay leave': 'bay leaf',
  'dried bay leave': 'dried bay leaf',

  // Corn
  'corn kernel': 'corn',

  // Parmesan
  'parmesan cheese': 'parmesan',
  'shaved parmesan': 'parmesan',

  // Mozzarella
  'mozzarella cheese': 'mozzarella',
  'firm mozzarella cheese': 'mozzarella',
  'soft mozzarella cheese': 'mozzarella',

  // Jalapeño spelling variants
  'jalapeno': 'jalapeño',
  'jalapeño pepper': 'jalapeño',
  'jalapeno pepper': 'jalapeño',

  // Ground beef
  'lean ground beef': 'ground beef',

  // Italian sausage
  'sweet italian sausage': 'italian sausage',

  // Cooking spray
  'non-stick cooking spray': 'cooking spray',
  'nonstick cooking spray': 'cooking spray',
  'oil spray': 'cooking spray',

  // Ground beef variants
  'beef mince': 'ground beef',
  'beef mince (ground beef)': 'ground beef',
  'ground chuck': 'ground beef',
  'ground beef chuck': 'ground beef',
  'minced beef': 'ground beef',

  // Ground pork
  'pork mince': 'ground pork',
  'minced pork': 'ground pork',

  // Cumin
  'cumin powder': 'ground cumin',

  // Cayenne
  'cayenne powder': 'cayenne pepper',
  'cayenne': 'cayenne pepper',

  // Paprika
  'smoky paprika': 'smoked paprika',

  // Scallions / green onions
  'scallion': 'green onion',
  'scallions': 'green onion',
  'spring onion': 'green onion',
  'spring onions': 'green onion',

  // Sesame oil
  'toasted sesame oil': 'sesame oil',

  // Cornstarch
  'cornflour': 'cornstarch',
  'corn starch': 'cornstarch',
  'corn flour': 'cornstarch',

  // Heavy cream
  'heavy whipping cream': 'heavy cream',
  'whipping cream': 'heavy cream',
  'double cream': 'heavy cream',

  // Chicken thigh / breast variants
  'boneless chicken breast': 'chicken breast',
  'boneless skinless chicken breast': 'chicken breast',
  'chicken breasts': 'chicken breast',
  'boneless chicken thigh': 'chicken thigh',
  'boneless skinless chicken thigh': 'chicken thigh',
  'chicken thighs': 'chicken thigh',

  // Red pepper / capsicum
  'red capsicum': 'red bell pepper',
  'green capsicum': 'green bell pepper',
  'yellow capsicum': 'yellow bell pepper',
  'capsicum': 'bell pepper',

  // Dried chili
  'dried ground chilli': 'chili powder',
  'dried ground chili': 'chili powder',
  'chilli powder': 'chili powder',

  // Sundry
  'shallot': 'shallots',
  'romano bean': 'kidney bean',
  'romano beans': 'kidney beans',

  // Olive oil (hyphenated variant)
  'extra-virgin olive oil': 'olive oil',

  // Parsley
  'flat-leaf parsley': 'parsley',
  'parsley leave': 'parsley',
  'parsley leaves': 'parsley',
  'flat leaf parsley': 'parsley',
  'italian flat-leaf parsley': 'parsley',
  'italian flat leaf parsley': 'parsley',

  // Mint
  'mint leave': 'mint',
  'mint leaves': 'mint',
  'fresh mint leave': 'mint',
  'fresh mint leaves': 'mint',

  // Sage
  'sage leave': 'sage',
  'sage leaves': 'sage',
  'fresh sage leave': 'sage',
  'fresh sage leaves': 'sage',

  // Cilantro
  'cilantro leave': 'cilantro',
  'cilantro leaves': 'cilantro',

  // Cheese
  'sharp cheddar': 'cheddar cheese',
  'sharp cheddar cheese': 'cheddar cheese',
  'white cheddar': 'cheddar cheese',
  'white cheddar cheese': 'cheddar cheese',
  'extra sharp cheddar': 'cheddar cheese',
  'shredded cheddar': 'cheddar cheese',
  'shredded cheddar cheese': 'cheddar cheese',
  'shredded mozzarella': 'mozzarella',
  'shredded mozzarella cheese': 'mozzarella',

  // Sugar
  'caster sugar': 'sugar',
  'powdered sugar': 'powdered sugar',

  // Celery (rib count variant — 'rib celery' is already defined above)
  'ribs celery': 'celery',
  'celery ribs': 'celery',

  // Wine
  'dry white wine': 'white wine',
  'dry red wine': 'red wine',
  'dry white': 'white wine',
  'dry red': 'red wine',

  // Fish sauce alias
  'vietnamese': 'fish sauce',

  // Tortillas
  'warm corn tortilla': 'corn tortilla',
  'warm corn tortillas': 'corn tortilla',
  'wheat tortilla': 'flour tortilla',
  'wheat tortillas': 'flour tortilla',
  'small flour tortilla': 'flour tortilla',
  'large flour tortilla': 'flour tortilla',

  // Taco seasoning
  'batch taco seasoning': 'taco seasoning',
  'homemade taco seasoning': 'taco seasoning',

  // Tomato sauce
  'canned tomato sauce': 'tomato sauce',

  // Quinoa
  'uncooked quinoa': 'quinoa',

  // Chicken variants
  'chicken breast strip': 'chicken breast',
  'chicken breast strips': 'chicken breast',
  'split chicken breast': 'chicken breast',

  // Broccoli
  'baby broccoli': 'broccoli',
  'broccoli floret': 'broccoli',
  'broccoli florets': 'broccoli',

  // Cabbage
  'green cabbage': 'cabbage',

  // Mushrooms
  'white mushroom': 'mushroom',
  'cremini mushroom': 'mushroom',
  'cremini mushrooms': 'mushroom',
  'baby bella mushroom': 'mushroom',
  'baby bella mushrooms': 'mushroom',
  'button mushroom': 'mushroom',
  'button mushrooms': 'mushroom',

  // Egg noodles
  'wide egg noodle': 'egg noodles',
  'wide egg noodles': 'egg noodles',

  // Butter (serving context)
  'butter for the pan': 'butter',

  // Italian seasoning
  'dried italian herb': 'italian seasoning',
  'dried italian herbs': 'italian seasoning',

  // Spaghetti
  'dried spaghetti': 'spaghetti',

  // Medium-to-large garlic
  'medium-to-large clove garlic': 'garlic',
  'medium to large clove garlic': 'garlic',

  // Cumin / cinnamon (standalone name = ground form for shopping purposes)
  'cumin': 'ground cumin',
  'cinnamon': 'ground cinnamon',

  // Oregano
  'oregano': 'dried oregano',

  // Chile pepper categories — normalize variant spellings to one canonical name
  'chile ancho': 'ancho chile',
  'ancho chili': 'ancho chile',
  'pasilla chile': 'ancho chile',    // close enough for shopping
  'chile negro': 'negro chile',

  // Oxtail spelling
  'oxtails': 'oxtail',

  // Enchilada sauce (strip homemade/store-bought prefix via MODIFIER_PREFIX_RE; alias result)
  'enchilada sauce': 'enchilada sauce',  // identity — category override handles the rest

  // Bacon / sausage word-order fixes (after COUNT_PREFIX_RE strips "strips"/"links")
  'uncooked bacon': 'bacon',

  // Flour (bare "flour" → all-purpose flour for consolidation)
  'flour': 'all-purpose flour',

  // Pepper — cracked without "black" qualifier
  'cracked pepper': 'black pepper',
  'freshly cracked pepper': 'black pepper',

  // Mozzarella fat-content variants
  'part-skim mozzarella': 'mozzarella',
  'part-skim mozzarella cheese': 'mozzarella',
  'fresh mozzarella': 'mozzarella',
  'fresh mozzarella cheese': 'mozzarella',
  'low-moisture mozzarella': 'mozzarella',

  // Cheddar fat-content / style variants
  'mild cheddar': 'cheddar cheese',
  'mild cheddar cheese': 'cheddar cheese',

  // Vanilla (bare name → vanilla extract for consolidation)
  'vanilla': 'vanilla extract',
};

const UNIT_ALIASES: Record<string, string> = {
  'tsp': 'teaspoon',
  'tsps': 'teaspoon',
  'teaspoons': 'teaspoon',
  'tbsp': 'tablespoon',
  'tbsps': 'tablespoon',
  'tablespoons': 'tablespoon',
  'oz': 'ounce',
  'ozs': 'ounce',
  'ounces': 'ounce',
  'lb': 'pound',
  'lbs': 'pound',
  'pounds': 'pound',
  'grams': 'gram',
  'kilograms': 'kilogram',
  'milliliters': 'milliliter',
  'millilitres': 'milliliter',
  'liters': 'liter',
  'litres': 'liter',
  'cups': 'cup',
  'pints': 'pint',
  'quarts': 'quart',
  'gallons': 'gallon',
  // Container/count units — normalize to '' so they share a count key
  'can': '',
  'cans': '',
  'jar': '',
  'jars': '',
  'bag': '',
  'bags': '',
  'box': '',
  'boxes': '',
  'bottle': '',
  'bottles': '',
  'package': '',
  'packages': '',
  'pkg': '',
  'pkgs': '',
  // Size qualifiers and "unit" — all mean "whole item / count", use '' so they share a key
  'unit': '',
  'whole': '',
  'medium': '',
  'large': '',
  'small': '',
  'extra large': '',
  'xl': '',
  // Metric abbreviations not otherwise covered
  'g': 'gram',
  'ml': 'milliliter',
  'kg': 'kilogram',
  // Botanical / produce count units — normalize to '' so they share a count key
  'bunch': '',
  'bunches': '',
  'stalk': '',
  'stalks': '',
  'sprig': '',
  'sprigs': '',
  'head': '',
  'heads': '',
  'slice': '',
  'slices': '',
  'clove': '',
  'cloves': '',
  'dash': '',
  'dashes': '',
  'pinch': '',
  'pinches': '',
  'strip': '',
  'strips': '',
};

// Category overrides: applied after name normalization to fix systematic mis-categorisation.
// Map normalized ingredient name → correct category.
const CATEGORY_OVERRIDES: Record<string, string> = {
  // Spices
  'cayenne pepper': 'spices',
  'ground cumin': 'spices',
  'ground cinnamon': 'spices',
  'smoked paprika': 'spices',
  'chili powder': 'spices',
  'paprika': 'spices',
  'taco seasoning': 'spices',
  'italian seasoning': 'spices',
  'dried oregano': 'spices',
  'dried basil': 'spices',
  'dried thyme': 'spices',
  'dried rosemary': 'spices',
  'cumin': 'spices',
  'coriander': 'spices',
  'turmeric': 'spices',
  'garlic powder': 'spices',
  'onion powder': 'spices',
  'dried parsley': 'spices',
  // Meat
  'chicken breast': 'protein/meat',
  'chuck-eye roast': 'protein/meat',
  'chuck eye roast': 'protein/meat',
  'pepperoni': 'protein/meat',
  'oxtail': 'protein/meat',
  'pancetta': 'protein/meat',
  'prosciutto': 'protein/meat',
  'chorizo': 'protein/meat',
  'bacon': 'protein/meat',
  'pork sausage': 'protein/meat',
  'italian sausage': 'protein/meat',
  'ground turkey': 'protein/meat',
  'ground pork': 'protein/meat',
  // Produce
  'eggplant': 'produce',
  'jalapeño': 'produce',
  'ginger': 'produce',
  'mint': 'produce',
  'sage': 'produce',
  'shallots': 'produce',
  'cilantro': 'produce',
  'parsley': 'produce',
  'basil': 'produce',
  'thyme': 'produce',
  'rosemary': 'produce',
  'chives': 'produce',
  'dill': 'produce',
  'leek': 'produce',
  'leeks': 'produce',
  'corn': 'produce',
  'avocado': 'produce',
  'zucchini': 'produce',
  'asparagus': 'produce',
  'beet': 'produce',
  'beets': 'produce',
  'radish': 'produce',
  'turnip': 'produce',
  'cabbage': 'produce',
  'broccoli': 'produce',
  'cauliflower': 'produce',
  'green onion': 'produce',
  'celery': 'produce',
  // Dairy
  'egg': 'dairy',
  'eggs': 'dairy',
  // Pantry
  'active dry yeast': 'pantry',
  'tahini': 'pantry',
  'vanilla extract': 'pantry',
  'vanilla': 'pantry',
  'spaghetti': 'pantry',
  'egg noodles': 'pantry',
  'quinoa': 'pantry',
  'rice': 'pantry',
  'pasta': 'pantry',
  'almonds': 'pantry',
  'walnuts': 'pantry',
  'pecans': 'pantry',
  'peanuts': 'pantry',
  'pine nut': 'pantry',
  'sesame seed': 'pantry',
  'coconut': 'pantry',
  'breadcrumb': 'pantry',
  'panko': 'pantry',
  'tomato sauce': 'pantry',
  // Condiments
  'fish sauce': 'condiments',
  'ranch dressing': 'condiments',
  'hot sauce': 'condiments',
  'worcestershire sauce': 'condiments',
  'mayonnaise': 'condiments',
  'mustard': 'condiments',
  'ketchup': 'condiments',
  'soy sauce': 'condiments',
  // Bakery
  'corn tortilla': 'bakery',
  'flour tortilla': 'bakery',
  // Pantry — broths (override wrong 'protein/meat' category from some recipe imports)
  'chicken broth': 'pantry',
  'beef broth': 'pantry',
  'vegetable broth': 'pantry',
  // Pantry — dried chiles & canned goods
  'ancho chile': 'pantry',
  'negro chile': 'pantry',
  'chipotle chilis packed in adobo': 'pantry',
  'chipotle chili': 'pantry',
  'fire roasted green chili': 'pantry',
  'fire roasted tomato': 'pantry',
  'enchilada sauce': 'pantry',
  // Spices — additional
  'ground cumin': 'spices',    // ensure after alias consolidation
  'ground cinnamon': 'spices', // ensure after alias consolidation
  'dried oregano': 'spices',   // ensure after alias consolidation
  'ancho chili powder': 'spices',
  'ground clove': 'spices',
  'southwest spice blend': 'spices',
  'spice blend': 'spices',
  'bay leaf': 'spices',
  'red pepper flake': 'spices',
  'crushed red pepper': 'spices',
  'black pepper': 'spices',
  'salt': 'spices',
  // Frozen
  'frozen corn': 'frozen',
  'frozen pea': 'frozen',
  'frozen peas': 'frozen',
  'frozen spinach': 'frozen',
  // Produce — dried fruit / misc
  'cranberry': 'produce',
  'dried cranberry': 'pantry',
  'raisin': 'pantry',
  'dried fruit': 'pantry',
  // Lemon / lime juice (produce section in stores)
  'lemon juice': 'produce',
  'lime juice': 'produce',
};

const WEIGHT_UNITS = new Set(['gram', 'kilogram', 'ounce', 'pound']);

// Volume unit conversion: teaspoon as the common base
const VOLUME_TO_TSP: Record<string, number> = {
  'teaspoon': 1,
  'tablespoon': 3,
  'fluid ounce': 6,
  'cup': 48,
  'pint': 96,
  'quart': 192,
  'gallon': 768,
};

// Convert a teaspoon total back to the cleanest display unit.
// Prefers exact tablespoon counts; stays in teaspoons for small non-divisible amounts.
function tspToUnit(tsp: number): { qty: number; unit: string } {
  if (tsp >= 48) return { qty: tsp / 48, unit: 'cup' };
  if (tsp >= 3 && Math.round(tsp) % 3 === 0) return { qty: Math.round(tsp) / 3, unit: 'tablespoon' };
  if (tsp >= 12) return { qty: tsp / 3, unit: 'tablespoon' };
  return { qty: tsp, unit: 'teaspoon' };
}

// Pre-build a lookup: lowercase name → Set of all family members
const FAMILY_LOOKUP = new Map<string, Set<string>>();
for (const family of INGREDIENT_FAMILIES) {
  const familySet = new Set(family);
  for (const member of family) {
    FAMILY_LOOKUP.set(member, familySet);
  }
}

// Strip parenthetical annotations baked into ingredient names, e.g.
// "cayenne pepper (adjust spiciness to taste)" → "cayenne pepper"
// Also handles unclosed parens and trailing orphan ")" from import artifacts.
function stripParenthetical(name: string): string {
  return name
    .replace(/\s*\([^)]*\)?/g, '')  // remove (text) and unclosed (text
    .replace(/\)+$/, '')             // remove trailing orphan )
    .trim().toLowerCase();
}

// Conservative whole-string depluralization for ingredient names.
// Handles: carrots→carrot, tomatoes→tomato, berries→berry, mushrooms→mushroom.
// Skips words ending in -ss/-us/-is to avoid mangling (bass, asparagus, hummus).
function depluralizeName(name: string): string {
  if (name.endsWith('ss') || name.endsWith('us') || name.endsWith('is')) return name;
  if (name.endsWith('ies') && name.length > 4) return name.slice(0, -3) + 'y';
  if (name.endsWith('oes') && name.length > 4) return name.slice(0, -2); // tomatoes→tomato
  if (name.endsWith('s') && name.length > 3) return name.slice(0, -1);
  return name;
}

function normalizeUnit(unit: string): string {
  let lower = unit.toLowerCase().trim();
  // Strip leading size annotations baked into unit strings by importers.
  // "12 oz jar" → "jar", "16 oz can" → "can", "4 oz" → "4 oz" (stays for alias lookup)
  lower = lower.replace(/^\d+\s*(?:oz|fl oz|ml|g|lb)\s+/, '');
  return UNIT_ALIASES[lower] ?? lower;
}

// Step 1: strip optional adverb/adjective modifiers + a prep verb + optional trailing "fresh"
// Handles: "freshly chopped basil", "finely minced garlic", "lightly packed fresh cilantro", etc.
const PREP_VERB_PREFIX_RE = /^(?:(?:fresh(?:ly)?|finely|roughly|coarsely|thinly|lightly|well)\s+)*(?:chopped|minced|diced|sliced|torn|snipped|shredded|halved|grated|packed|peeled)(?:\s+fresh(?:ly)?)?\s+/i;
// Step 2: strip bare state/freshness/source prefixes (applied twice for chained modifiers)
const MODIFIER_PREFIX_RE = /^(?:fresh(?:ly)?|melted|softened|warm(?:ed)?|cold|frozen|dry|dried|canned|uncooked|cooked|raw|ripe|homemade|store-bought|low-sodium|reduced-sodium)\s+/i;

// Strip known supermarket / brand name prefixes baked into ingredient names by importers.
const BRAND_PREFIX_RE = /^(?:kroger|great\s+value|store\s+brand|generic|kirkland|signature\s+select|best\s+choice|trader\s+joe'?s)\s+/i;

// Strip subjective quality descriptors that add no shopping information.
// "high quality extra virgin olive oil" → "extra virgin olive oil" → alias → "olive oil"
const QUALITY_PREFIX_RE = /^(?:high[-\s]quality|good[-\s]quality|premium|finest|best[-\s]quality|top[-\s]quality|restaurant[-\s]quality)\s+/i;

function normalizeShoppingName(name: string): string {
  let n = stripParenthetical(name);
  n = n.replace(/\s+/g, ' ');
  // Strip trailing footnote markers: "lean ground beef***" → "lean ground beef"
  n = n.replace(/\*+$/, '').trim();
  // Strip trailing punctuation artifacts: "bread for mopping!" → "bread for mopping"
  n = n.replace(/!+$/, '').trim();
  // Strip trailing superscript digit artifacts: "cayenne pepper³" → "cayenne pepper"
  n = n.replace(/[\u00B2\u00B3\u00B9\u2070-\u2079]+$/, '').trim();
  // Strip trailing "to taste": "black pepper to taste" → "black pepper"
  n = n.replace(/\s+to\s+taste$/, '').trim();
  // Strip preparation descriptors after a comma: "yellow onion, diced" → "yellow onion"
  const commaIdx = n.indexOf(',');
  if (commaIdx !== -1) {
    n = n.slice(0, commaIdx).trim();
  }
  // Strip leading "of " artifact: "of mozzarella cheese" → "mozzarella cheese"
  n = n.replace(/^of\s+/, '').trim();
  // Strip leading brand names: "kroger beef chuck roast" → "beef chuck roast"
  n = n.replace(BRAND_PREFIX_RE, '').trim();
  // Strip leading quality descriptors: "high quality extra virgin olive oil" → "extra virgin olive oil"
  n = n.replace(QUALITY_PREFIX_RE, '').trim();
  // Collapse "or" alternatives: keep only the primary option.
  // "lime juice or 1 tablespoon sherry vinegar" → "lime juice"
  // "broccoli or 1 small head of cauliflower" → "broccoli"
  // Special case: if the part before "or" is a lone color/size/source modifier (not a real
  // ingredient on its own), take the part after "or" instead.
  // "red or white onion" → "white onion" | "vegetable or canola oil" → "canola oil" → "oil"
  const orIdx = n.indexOf(' or ');
  if (orIdx !== -1) {
    const before = n.slice(0, orIdx).trim();
    const after = n.slice(orIdx + 4).trim();
    const isBareModifier = /^(red|green|yellow|white|brown|dark|light|black|orange|purple|fresh|dried|dry|homemade|store-bought|low-sodium|warm|vegetable|canola|sunflower|avocado|grapeseed|peanut|coconut)$/i.test(before);
    // Strip any leading quantity+unit from the "after" part before using it
    const afterClean = after.replace(/^\d[\d\s/.]*(tablespoons?|teaspoons?|cups?|ounces?|pounds?|grams?|tbsp|tsp|oz|lbs?|cups?)\.?\s+/i, '').trim();
    n = isBareModifier ? afterClean : before;
  }
  // Strip leading preparation descriptors: "fresh chopped basil" → "basil"
  n = n.replace(PREP_VERB_PREFIX_RE, '').trim();
  // Apply MODIFIER_PREFIX_RE twice to handle chained modifiers like "homemade low-sodium broth"
  n = n.replace(MODIFIER_PREFIX_RE, '').trim();
  n = n.replace(MODIFIER_PREFIX_RE, '').trim();
  if (SHOPPING_NAME_ALIASES[n]) return SHOPPING_NAME_ALIASES[n];
  // Try depluralized form (carrots→carrot, celery stalks→celery stalk→alias)
  const dep = depluralizeName(n);
  return SHOPPING_NAME_ALIASES[dep] ?? dep;
}

// Bare single-word names that are too vague to be actionable shopping items.
// These arise from importer edge-cases ("vegetable or canola oil" → "canola oil" → fine,
// but "vegetable" alone from "vegetable, divided" notes, or "fruit"/"nut"/"seed" catch-alls).
const VAGUE_INGREDIENT_NAMES = new Set([
  'fruit', 'nut', 'seed', 'produce', 'vegetable', 'item', 'ingredient', 'other',
  'misc', 'topping', 'toppings', 'garnish', 'accompaniment',
  'homemade', 'store-bought',  // leftover fragments after OR-collapse
  'water', 'tap water',        // never purchased for cooking
]);

function isCoveredByPantry(itemName: string, pantryNames: Set<string>): boolean {
  const lower = normalizeShoppingName(itemName);
  if (pantryNames.has(lower)) return true;
  const family = FAMILY_LOOKUP.get(lower);
  if (!family) return false;
  for (const member of family) {
    if (pantryNames.has(member)) return true;
  }
  return false;
}

interface UseShoppingListParams {
  plan: PlanItem[];
  allRecipes: Recipe[];
  pantryStaples: PantryStaple[];
  days: number;
}

export const useShoppingList = ({ plan, allRecipes, pantryStaples, days }: UseShoppingListParams) => {
  const [shoppingAdjustments, setShoppingAdjustments] = usePersistedState<ShoppingAdjustments>(
    STORAGE_KEYS.SHOPPING_ADJUSTMENTS, {}
  );

  const [selectedShoppingDays, setSelectedShoppingDays] = useState<Set<number>>(() => {
    const storedDays = storage.get<number>(STORAGE_KEYS.DAYS, 3);
    return new Set(Array.from({ length: storedDays }, (_, i) => i + 1));
  });

  // Update selected shopping days when total days changes
  useEffect(() => {
    setSelectedShoppingDays(prev => {
      const newSet = new Set<number>();
      for (let i = 1; i <= days; i++) {
        if (prev.has(i) || i > prev.size) {
          newSet.add(i);
        }
      }
      if (newSet.size === 0) {
        for (let i = 1; i <= days; i++) {
          newSet.add(i);
        }
      }
      return newSet;
    });
  }, [days]);

  const shoppingList = useMemo<ShoppingItem[]>(() => {
    // Build a lookup map so the shopping list always uses the latest recipe
    // data from the bundle, even when a plan item has a stale embedded recipe.
    const liveRecipeMap = new Map<string, Recipe>(allRecipes.map(r => [r.id, r]));

    const map = new Map<string, {
      name: string;
      unit: string;
      totalQty: number;
      count: number;
      preparation: string;
      category: string;
      key: string;
      sources: string[];
      recipeBreakdown: Array<{ recipeName: string; qty: number; unit: string }>;
    }>();

    const filteredPlan = plan.filter(item => selectedShoppingDays.has(item.day));

    filteredPlan.forEach(({ id, recipe: embeddedRecipe, servingsMultiplier }) => {
      // Prefer the live recipe from the current bundle; fall back to the
      // embedded copy (covers custom recipes not in the default set).
      const recipe = liveRecipeMap.get(id) ?? embeddedRecipe;
      if (!recipe) return;

      recipe?.ingredients?.forEach((ing) => {
        if (!ing?.name) return;
        // Skip annotation lines that are recipe notes, not real ingredients
        const ingNameLower = ing.name.trim().toLowerCase();
        if (ingNameLower.startsWith('other:')) return;
        if (ingNameLower.startsWith('suggested garnishes:')) return;
        if (/^(toppings? of your choice|optional toppings?|garnish|for garnish|for serving|to serve|as needed|a pinch|turns? of|your favorite|preferred|any of the following)/i.test(ingNameLower)) return;
        // Skip ingredients that are clearly serving suggestions (qty=0, preparation says "for serving")
        const prepLower = (ing.preparation || '').toLowerCase();
        if (!ing.quantity && /\bfor serving\b|\bto serve\b|\bcooked.*serving\b/.test(prepLower)) return;

        // Always attempt to extract a clean ingredient name from the name field —
        // importers often bake quantity/unit strings into it (e.g. "⅓ tsp cayenne pepper",
        // "/ 2.5 lb potato").  Only adopt the parsed qty/unit when the recipe data has none.
        let ingName = ing.name;
        let ingQty = ing.quantity || 0;
        let ingUnit = ing.unit || '';
        const parsed = parseIngredientLine(ingName);
        if (parsed && parsed.name && parsed.name !== ingName) {
          if ((!ingQty || ingUnit.toLowerCase() === 'as needed') && parsed.quantity != null) {
            ingQty = parsed.quantity;
            ingUnit = parsed.unit || '';
          }
          ingName = parsed.name;
        }

        // Strip leading container/count/unit descriptor words baked into names by importers.
        // "can tomato paste" → "tomato paste" (qty implied 1)
        // "cloves garlic" → "garlic" | "pinch of salt" → "salt" | "unit lemon" → "lemon"
        // Note: "canned" is intentionally NOT in this list — it's an adjective, not a unit.
        const COUNT_PREFIX_RE = /^(cans?|jars?|bags?|bottles?|boxes?|packages?|packets?|pkgs?|cloves?|pinch(?:es)?(?:\s+of)?|handful(?:s)?(?:\s+of)?|heads?\s+of\s+|unit|strips?|links?)\s*/i;
        const countPrefix = ingName.match(COUNT_PREFIX_RE);
        if (countPrefix) {
          if (!ingQty) ingQty = 1;
          ingName = ingName.slice(countPrefix[0].length).trim();
        }

        // Strip leading volume/weight unit words when they're baked into the name field
        // but the quantity is already stored separately.
        // "tablespoons lemon juice" + qty=5, unit="" → name="lemon juice", unit="tablespoon"
        // "ounces baby spinach" + qty=10, unit="" → name="baby spinach", unit="ounce"
        const UNIT_WORD_PREFIX_RE = /^(tablespoons?|teaspoons?|ounces?|pounds?|cups?|grams?|kg|ml|g|tbsps?|tsps?|ozs?|lbs?)\s+/i;
        const unitWordPrefix = ingName.match(UNIT_WORD_PREFIX_RE);
        if (unitWordPrefix) {
          if (!ingUnit || ingUnit.toLowerCase() === 'as needed') {
            ingUnit = normalizeUnit(unitWordPrefix[1]);
          }
          ingName = ingName.slice(unitWordPrefix[0].length).trim();
        }

        // Strip leading size annotations baked into the name field by importers.
        // "8oz. can tomato sauce" → "tomato sauce"  |  "(16 ounce) can tomato sauce" → "tomato sauce"
        const SIZE_IN_NAME_RE = /^\(?\d+\.?\d*\s*(?:oz|ounce|ounces|fl\.?\s*oz|ml|g|gram|lb|pound)\.?\)?\s*(?:cans?|jars?|bags?|boxes?|pouches?|containers?)?\s*/i;
        ingName = ingName.replace(SIZE_IN_NAME_RE, '').trim() || ingName;

        const normalizedName = normalizeShoppingName(ingName);
        // Skip entries that normalized to nothing (e.g. "homemade" alone after modifier stripping)
        // or bare vague generic words that aren't actionable shopping items.
        if (!normalizedName || VAGUE_INGREDIENT_NAMES.has(normalizedName)) return;
        const normalizedUnit = normalizeUnit(ingUnit);
        const key = `${normalizedName}|${normalizedUnit}`;
        const qty = ingQty * (servingsMultiplier || 1);

        if (!map.has(key)) {
          // Normalise non-standard raw category strings from recipe imports.
          const rawCategory = ing.category === 'meat' ? 'protein/meat'
            : ing.category === 'seafood' ? 'protein/seafood'
            : ing.category ?? 'other';
          const overriddenCategory = CATEGORY_OVERRIDES[normalizedName] ?? rawCategory;
          map.set(key, {
            name: normalizedName,
            unit: normalizedUnit || 'unit',
            totalQty: 0,
            count: 0,
            preparation: ing.preparation || '',
            category: overriddenCategory,
            key,
            sources: [],
            recipeBreakdown: [],
          });
        }

        const item = map.get(key)!;
        item.totalQty += qty;
        item.count += 1;
        if (recipe.name && !item.sources.includes(recipe.name)) {
          item.sources.push(recipe.name);
        }
        const recipeName = recipe.name || 'Unknown';
        const bdEntry = item.recipeBreakdown.find(b => b.recipeName === recipeName);
        if (bdEntry) {
          bdEntry.qty += qty;
        } else {
          item.recipeBreakdown.push({ recipeName, qty, unit: normalizedUnit || 'unit' });
        }
      });
    });

    // Second pass: for each ingredient that appears with multiple volume units
    // (e.g. "salt|tablespoon" + "salt|teaspoon"), convert all to teaspoons, sum,
    // then convert back to the cleanest display unit.
    const byName = new Map<string, string[]>();
    for (const key of map.keys()) {
      const name = map.get(key)!.name;
      const existing = byName.get(name);
      if (existing) existing.push(key);
      else byName.set(name, [key]);
    }
    for (const keys of byName.values()) {
      if (keys.length <= 1) continue;
      const volKeys = keys.filter(k => VOLUME_TO_TSP[map.get(k)!.unit] !== undefined);
      if (volKeys.length <= 1) continue;

      let totalTsp = 0;
      let totalCount = 0;
      for (const k of volKeys) {
        const item = map.get(k)!;
        totalTsp += item.totalQty * VOLUME_TO_TSP[item.unit];
        totalCount += item.count;
      }

      // Keep only the first volume entry, merge sources, delete the rest
      const primaryKey = volKeys[0];
      const mergedSources = new Set(map.get(primaryKey)!.sources);
      for (const k of volKeys.slice(1)) {
        map.get(k)?.sources.forEach(s => mergedSources.add(s));
      }
      map.get(primaryKey)!.sources = Array.from(mergedSources);
      const mergedBreakdown = [...map.get(primaryKey)!.recipeBreakdown];
      for (const k of volKeys.slice(1)) {
        for (const entry of map.get(k)!.recipeBreakdown) {
          const ex = mergedBreakdown.find(b => b.recipeName === entry.recipeName);
          if (ex) ex.qty += entry.qty;
          else mergedBreakdown.push({ ...entry });
        }
      }
      map.get(primaryKey)!.recipeBreakdown = mergedBreakdown;
      for (const k of volKeys.slice(1)) map.delete(k);

      const { qty, unit } = tspToUnit(totalTsp);
      const primary = map.get(primaryKey)!;
      primary.totalQty = qty;
      primary.unit = unit;
      primary.count = totalCount;

      // Re-key if the canonical unit changed (e.g. tablespoon → teaspoon)
      const newKey = `${primary.name}|${unit}`;
      if (newKey !== primaryKey) {
        primary.key = newKey;
        map.delete(primaryKey);
        map.set(newKey, primary);
      }
    }

    // Third pass: collapse any remaining same-ingredient entries that have
    // incompatible units (e.g. "carrot|pound" + "carrot|" count).
    // Keep the most informative unit: weight > volume > count/whole.
    const unitPriority = (unit: string) =>
      WEIGHT_UNITS.has(unit) ? 2 : VOLUME_TO_TSP[unit] !== undefined ? 1 : 0;

    const byName2 = new Map<string, string[]>();
    for (const key of map.keys()) {
      const name = map.get(key)!.name;
      const existing = byName2.get(name);
      if (existing) existing.push(key);
      else byName2.set(name, [key]);
    }
    for (const keys of byName2.values()) {
      if (keys.length <= 1) continue;
      keys.sort((a, b) => unitPriority(map.get(b)!.unit) - unitPriority(map.get(a)!.unit));
      const primaryKey = keys[0];
      const primary = map.get(primaryKey)!;
      for (const k of keys.slice(1)) {
        const sec = map.get(k)!;
        primary.count += sec.count;
        sec.sources.forEach(s => { if (!primary.sources.includes(s)) primary.sources.push(s); });
        for (const entry of sec.recipeBreakdown) {
          const ex = primary.recipeBreakdown.find(b => b.recipeName === entry.recipeName);
          if (ex) ex.qty += entry.qty;
          else primary.recipeBreakdown.push({ ...entry });
        }
        map.delete(k);
      }
    }

    // Fourth pass: convert large tablespoon totals to cups so the display unit
    // is more practical for shopping.  16 tablespoons = 1 cup.
    // Snapshot keys first to avoid mutating the map during iteration.
    const tbspKeys = Array.from(map.keys()).filter(k => map.get(k)!.unit === 'tablespoon' && map.get(k)!.totalQty >= 4);
    for (const oldKey of tbspKeys) {
      const item = map.get(oldKey);
      if (!item) continue;
      const cups = item.totalQty / 16;
      if (cups < 1) continue;
      item.totalQty = cups;
      item.unit = 'cup';
      const newKey = `${item.name}|cup`;
      item.key = newKey;
      item.recipeBreakdown.forEach(b => { b.unit = 'cup'; b.qty = b.qty / 16; });
      map.delete(oldKey);
      map.set(newKey, item);
    }

    const pantryNames = new Set(pantryStaples.map(s => normalizeShoppingName(s.name)));

    return Array.from(map.values())
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      })
      .map((item) => {
        const adj = shoppingAdjustments[item.key] || { haveQty: 0 };
        const isPantryStaple = isCoveredByPantry(item.name, pantryNames);
        const haveQty = isPantryStaple ? item.totalQty : adj.haveQty;
        const neededQty = Math.max(0, item.totalQty - haveQty);
        return {
          ...item,
          haveQty,
          ordered: false,
          neededQty,
          displayNeeded: neededQty % 1 === 0 ? neededQty : neededQty.toFixed(1),
          displayTotal: item.totalQty % 1 === 0 ? item.totalQty : item.totalQty.toFixed(1),
          isPantryStaple,
        };
      });
  }, [plan, allRecipes, shoppingAdjustments, pantryStaples, selectedShoppingDays]);

  const shoppingNeededCount = shoppingList.filter(item =>
    item.totalQty > 0 ? item.haveQty < item.totalQty : item.haveQty === 0
  ).length;

  const toggleHaveItem = (key: string, totalQty: number): void => {
    setShoppingAdjustments((prev) => {
      const current = prev[key] || { haveQty: 0 };
      const targetQty = totalQty > 0 ? totalQty : 1;
      const newHave = current.haveQty > 0 ? 0 : targetQty;
      return {
        ...prev,
        [key]: { haveQty: newHave },
      };
    });
  };

  const resetAdjustments = (): void => {
    setShoppingAdjustments({});
  };

  const importAdjustments = (adj: ShoppingAdjustments): void => {
    setShoppingAdjustments(adj);
  };

  return {
    shoppingAdjustments,
    selectedShoppingDays, setSelectedShoppingDays,
    shoppingList, shoppingNeededCount,
    toggleHaveItem, resetAdjustments, importAdjustments,
  };
};
