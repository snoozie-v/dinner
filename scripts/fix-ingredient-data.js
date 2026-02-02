#!/usr/bin/env node
/**
 * Ingredient Data Fixer
 *
 * This script inspects existing recipes and fixes:
 * 1. Ingredients with null quantities (sets to 0, meaning "as needed")
 * 2. Malformed ingredient names from parsing issues
 *
 * Usage:
 *   node scripts/fix-ingredient-data.js [options]
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

// Patterns that indicate malformed ingredient names
const MALFORMED_PATTERNS = [
  /^to \d+\s+/i,           // "to 12  crispy taco shells"
  /^g\s*\/\s*\d+/i,        // "g / 1 lb   beef"
  /^\/\s*\d+/,             // "/ 65ml  water"
  /^EACH\s+/i,             // "EACH garlic powder"
  /^\d+oz\.?\s+can/i,      // "15oz. cans black beans" (quantity in name)
  /^\d+\/\d+\s+cup/i,      // "½ cup Quinoa" (quantity in name)
  /\(\s*$/,                // ends with "("
  /\)\s*$/,                // ends with ")" without matching open
  /^\s*,/,                 // starts with comma
  /\(\(/,                  // double opening parens
];

// Known problematic ingredient name patterns and their fixes
const NAME_FIXES = [
  // Pattern: ingredient name starts with quantity info that should be extracted
  {
    pattern: /^to (\d+)\s+(.+)/i,
    fix: (match) => ({ name: match[2].trim(), note: `Use ${match[1]}` }),
  },
  // "g / 1 lb beef" -> "beef"
  {
    pattern: /^g\s*\/\s*[\d.]+\s*(?:lb|oz)?\s+(.+)/i,
    fix: (match) => ({ name: match[1].replace(/^\s*\(?\s*/, '').trim() }),
  },
  // "500g / 1 lb chicken" -> "chicken"
  {
    pattern: /^(\d+)\s*g\s*\/\s*[\d.]+\s*(?:lb|oz)?\s+(.+)/i,
    fix: (match) => ({ name: match[2].replace(/^\s*\(?\s*/, '').trim() }),
  },
  {
    pattern: /^\/\s*\d+\s*ml\s+(.+)/i,
    fix: (match) => ({ name: match[1].trim() }),
  },
  {
    pattern: /^EACH\s+(.+)/i,
    fix: (match) => ({ name: match[1].trim() }),
  },
  // Remove double opening parens "((something" -> "(something"
  {
    pattern: /\(\(/g,
    fix: (match, original) => ({ name: original.replace(/\(\(/g, '(') }),
  },
  // Clean up trailing/leading issues
  {
    pattern: /\(\s*$/,
    fix: (match, original) => ({ name: original.replace(/\(\s*$/, '').trim() }),
  },
  {
    pattern: /\)\s*$/,
    fix: (match, original) => {
      // Only remove if there's no matching opening paren
      const opens = (original.match(/\(/g) || []).length;
      const closes = (original.match(/\)/g) || []).length;
      if (closes > opens) {
        return { name: original.replace(/\)\s*$/, '').trim() };
      }
      return { name: original };
    },
  },
  {
    pattern: /^\s*,\s*/,
    fix: (match, original) => ({ name: original.replace(/^\s*,\s*/, '').trim() }),
  },
];

/**
 * Check if an ingredient name looks malformed
 */
function isMalformedName(name) {
  if (!name) return true;
  return MALFORMED_PATTERNS.some(pattern => pattern.test(name));
}

/**
 * Attempt to fix a malformed ingredient name
 */
function fixIngredientName(name) {
  if (!name) return { name: 'Unknown ingredient', changed: true };

  let fixedName = name;
  let changed = false;

  // Try each fix pattern
  for (const { pattern, fix } of NAME_FIXES) {
    const match = fixedName.match(pattern);
    if (match) {
      const result = fix(match, fixedName);
      fixedName = result.name;
      changed = true;
    }
  }

  // Clean up common issues
  // Remove leading/trailing whitespace and punctuation
  const cleanedName = fixedName
    .replace(/^\s*[,\-:]\s*/, '')  // Leading punctuation
    .replace(/\s*[,\-:(]\s*$/, '') // Trailing punctuation
    .replace(/\s+/g, ' ')          // Multiple spaces
    .trim();

  if (cleanedName !== name) {
    changed = true;
  }

  return { name: cleanedName || name, changed };
}

/**
 * Analyze and fix a single recipe's ingredients
 */
function analyzeRecipe(recipe) {
  const issues = [];
  const fixes = [];

  if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    return { issues, fixes, hasChanges: false };
  }

  recipe.ingredients.forEach((ing, idx) => {
    // Check for null quantity
    if (ing.quantity === null || ing.quantity === undefined) {
      issues.push({
        type: 'null-quantity',
        index: idx,
        name: ing.name,
        current: ing.quantity,
      });
      fixes.push({
        index: idx,
        field: 'quantity',
        from: ing.quantity,
        to: 0, // 0 means "as needed"
      });
    }

    // Check for long decimal quantities (more than 2 decimal places)
    if (typeof ing.quantity === 'number' && ing.quantity !== 0) {
      const rounded = Math.round(ing.quantity * 100) / 100;
      if (rounded !== ing.quantity) {
        issues.push({
          type: 'long-decimal',
          index: idx,
          name: ing.name,
          current: ing.quantity,
          suggested: rounded,
        });
        fixes.push({
          index: idx,
          field: 'quantity',
          from: ing.quantity,
          to: rounded,
        });
      }
    }

    // Check for malformed name
    if (isMalformedName(ing.name)) {
      const { name: fixedName, changed } = fixIngredientName(ing.name);
      if (changed && fixedName !== ing.name) {
        issues.push({
          type: 'malformed-name',
          index: idx,
          current: ing.name,
          suggested: fixedName,
        });
        fixes.push({
          index: idx,
          field: 'name',
          from: ing.name,
          to: fixedName,
        });
      }
    }

    // Clean up preparation field if it looks malformed
    if (ing.preparation) {
      const cleanedPrep = ing.preparation
        .replace(/^\s*[,\-:]\s*/, '')
        .replace(/\s*\)\s*$/, '')
        .replace(/^\s*\(\s*/, '')
        .trim();

      if (cleanedPrep !== ing.preparation && cleanedPrep.length > 0) {
        fixes.push({
          index: idx,
          field: 'preparation',
          from: ing.preparation,
          to: cleanedPrep,
        });
      }
    }
  });

  return {
    issues,
    fixes,
    hasChanges: fixes.length > 0,
  };
}

/**
 * Apply fixes to a recipe
 */
function applyFixes(recipe, fixes) {
  const updated = { ...recipe };
  updated.ingredients = [...recipe.ingredients];

  for (const fix of fixes) {
    updated.ingredients[fix.index] = {
      ...updated.ingredients[fix.index],
      [fix.field]: fix.to,
    };
  }

  return updated;
}

/**
 * Main function
 */
async function main() {
  console.log('🔧 Ingredient Data Fixer\n');
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
    withIssues: 0,
    nullQuantities: 0,
    longDecimals: 0,
    malformedNames: 0,
    otherFixes: 0,
    details: [],
  };

  const updatedRecipes = recipes.map(recipe => {
    results.analyzed++;
    const analysis = analyzeRecipe(recipe);

    if (analysis.hasChanges) {
      results.withIssues++;

      // Count issue types
      analysis.fixes.forEach(fix => {
        if (fix.field === 'quantity' && fix.from === null) {
          results.nullQuantities++;
        } else if (fix.field === 'quantity' && typeof fix.from === 'number') {
          results.longDecimals++;
        } else if (fix.field === 'name') {
          results.malformedNames++;
        } else {
          results.otherFixes++;
        }
      });

      results.details.push({
        name: recipe.name,
        id: recipe.id,
        fixes: analysis.fixes,
      });

      if (VERBOSE) {
        console.log(`📝 ${recipe.name}`);
        analysis.fixes.forEach(fix => {
          if (fix.field === 'quantity') {
            console.log(`   [${fix.index}] quantity: ${fix.from} → ${fix.to} (as needed)`);
          } else if (fix.field === 'name') {
            console.log(`   [${fix.index}] name: "${fix.from}" → "${fix.to}"`);
          } else {
            console.log(`   [${fix.index}] ${fix.field}: "${fix.from}" → "${fix.to}"`);
          }
        });
        console.log('');
      }

      return applyFixes(recipe, analysis.fixes);
    }

    return recipe;
  });

  // Summary
  console.log('='.repeat(50));
  console.log('Summary\n');
  console.log(`  Recipes analyzed: ${results.analyzed}`);
  console.log(`  Recipes with issues: ${results.withIssues}`);
  console.log(`  Null quantities to fix: ${results.nullQuantities}`);
  console.log(`  Long decimals to round: ${results.longDecimals}`);
  console.log(`  Malformed names to fix: ${results.malformedNames}`);
  console.log(`  Other fixes: ${results.otherFixes}`);
  console.log('');

  // Show affected recipes if not verbose
  if (!VERBOSE && results.details.length > 0 && results.details.length <= 30) {
    console.log('Affected recipes:\n');
    for (const { name, fixes } of results.details) {
      const fixTypes = [...new Set(fixes.map(f => f.field))];
      console.log(`  • ${name}`);
      console.log(`    Fixes: ${fixes.length} (${fixTypes.join(', ')})`);
    }
    console.log('');
  } else if (results.details.length > 30) {
    console.log(`Too many recipes to list (${results.details.length}). Use --verbose to see all.\n`);
  }

  // Apply changes if not dry run
  if (!DRY_RUN && results.withIssues > 0) {
    try {
      fs.writeFileSync(RECIPES_FILE, JSON.stringify(updatedRecipes, null, 2));
      console.log(`✅ Changes saved to ${RECIPES_FILE}`);
    } catch (error) {
      console.error(`❌ Failed to save changes: ${error.message}`);
      process.exit(1);
    }
  } else if (DRY_RUN && results.withIssues > 0) {
    console.log('ℹ️  Run with --apply to save changes');
  } else {
    console.log('✅ No changes needed');
  }
}

// Run
main().catch(console.error);
