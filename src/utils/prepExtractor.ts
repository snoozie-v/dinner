// src/utils/prepExtractor.ts
import type { PlanItem, PrepTask, PrepTiming, PrepTaskSource, Recipe } from '../types';

interface ExtractedPrepTask {
  description: string;
  timing: PrepTiming;
  source: PrepTaskSource;
}

// Patterns for detecting prep tasks in instructions
const PREP_PATTERNS: Array<{
  pattern: RegExp;
  getTiming: (match: RegExpMatchArray) => PrepTiming;
  getDescription: (match: RegExpMatchArray, fullText: string) => string;
}> = [
  // "marinate (for) X hours/overnight"
  {
    pattern: /marinate\s+(?:for\s+)?(\d+)\s*(?:hour|hr)s?/i,
    getTiming: (match) => {
      const hours = parseInt(match[1], 10);
      const daysBeforeMeal = hours >= 8 ? 1 : 0;
      return {
        daysBeforeMeal,
        hoursBeforeMeal: hours,
        description: daysBeforeMeal > 0 ? 'day before' : `${hours} hours before`,
      };
    },
    getDescription: (match) => `Marinate for ${match[1]} hours`,
  },
  // "marinate overnight"
  {
    pattern: /marinate\s+(?:for\s+)?overnight/i,
    getTiming: () => ({
      daysBeforeMeal: 1,
      hoursBeforeMeal: 8,
      description: 'night before',
    }),
    getDescription: () => 'Marinate overnight',
  },
  // "refrigerate (for) X hours/overnight"
  {
    pattern: /refrigerate\s+(?:for\s+)?(\d+)\s*(?:hour|hr)s?/i,
    getTiming: (match) => {
      const hours = parseInt(match[1], 10);
      const daysBeforeMeal = hours >= 8 ? 1 : 0;
      return {
        daysBeforeMeal,
        hoursBeforeMeal: hours,
        description: daysBeforeMeal > 0 ? 'day before' : `${hours} hours before`,
      };
    },
    getDescription: (match) => `Refrigerate for ${match[1]} hours`,
  },
  // "refrigerate overnight"
  {
    pattern: /refrigerate\s+(?:for\s+)?overnight/i,
    getTiming: () => ({
      daysBeforeMeal: 1,
      hoursBeforeMeal: 8,
      description: 'night before',
    }),
    getDescription: () => 'Refrigerate overnight',
  },
  // "chill (for) X hours"
  {
    pattern: /chill\s+(?:for\s+)?(\d+)\s*(?:hour|hr)s?/i,
    getTiming: (match) => {
      const hours = parseInt(match[1], 10);
      const daysBeforeMeal = hours >= 8 ? 1 : 0;
      return {
        daysBeforeMeal,
        hoursBeforeMeal: hours,
        description: daysBeforeMeal > 0 ? 'day before' : `${hours} hours before`,
      };
    },
    getDescription: (match) => `Chill for ${match[1]} hours`,
  },
  // "chill overnight"
  {
    pattern: /chill\s+(?:for\s+)?overnight/i,
    getTiming: () => ({
      daysBeforeMeal: 1,
      hoursBeforeMeal: 8,
      description: 'night before',
    }),
    getDescription: () => 'Chill overnight',
  },
  // "soak X overnight" or "soak overnight"
  {
    pattern: /soak\s+(?:\w+\s+)?overnight/i,
    getTiming: () => ({
      daysBeforeMeal: 1,
      hoursBeforeMeal: 8,
      description: 'night before',
    }),
    getDescription: (_, fullText) => {
      // Try to extract what should be soaked
      const itemMatch = fullText.match(/soak\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+overnight/i);
      return itemMatch ? `Soak ${itemMatch[1]} overnight` : 'Soak overnight';
    },
  },
  // "soak (for) X hours"
  {
    pattern: /soak\s+(?:for\s+)?(\d+)\s*(?:hour|hr)s?/i,
    getTiming: (match) => {
      const hours = parseInt(match[1], 10);
      const daysBeforeMeal = hours >= 8 ? 1 : 0;
      return {
        daysBeforeMeal,
        hoursBeforeMeal: hours,
        description: daysBeforeMeal > 0 ? 'day before' : `${hours} hours before`,
      };
    },
    getDescription: (match) => `Soak for ${match[1]} hours`,
  },
  // "let rise (for) X hours"
  {
    pattern: /let\s+(?:the\s+)?(?:dough\s+)?rise\s+(?:for\s+)?(\d+)\s*(?:hour|hr)s?/i,
    getTiming: (match) => {
      const hours = parseInt(match[1], 10);
      const daysBeforeMeal = hours >= 4 ? 1 : 0;
      return {
        daysBeforeMeal,
        hoursBeforeMeal: hours,
        description: daysBeforeMeal > 0 ? 'day before' : `${hours} hours before`,
      };
    },
    getDescription: (match) => `Let dough rise for ${match[1]} hours`,
  },
  // "rest (for) X minutes" (only if >= 30 minutes)
  {
    pattern: /(?:let\s+)?rest\s+(?:for\s+)?(\d+)\s*(?:minute|min)s?/i,
    getTiming: (match) => {
      const minutes = parseInt(match[1], 10);
      if (minutes < 30) return { daysBeforeMeal: 0, description: 'same day' };
      const hours = Math.ceil(minutes / 60);
      return {
        daysBeforeMeal: 0,
        hoursBeforeMeal: hours,
        description: `${minutes} minutes before serving`,
      };
    },
    getDescription: (match) => {
      const minutes = parseInt(match[1], 10);
      if (minutes < 30) return ''; // Will be filtered out
      return `Let rest for ${minutes} minutes`;
    },
  },
];

// Patterns for notes section
const NOTES_PATTERNS: Array<{
  pattern: RegExp;
  getTiming: (match: RegExpMatchArray) => PrepTiming;
  getDescription: (match: RegExpMatchArray) => string;
}> = [
  // "can be made ahead: X days"
  {
    pattern: /(?:can\s+be\s+)?made\s+ahead[:\s]+(\d+)\s*days?/i,
    getTiming: (match) => ({
      daysBeforeMeal: parseInt(match[1], 10),
      description: `${match[1]} days ahead`,
    }),
    getDescription: () => 'Can be made ahead',
  },
  // "prep X day(s) before"
  {
    pattern: /prep\s+(\d+)\s*days?\s+(?:before|ahead)/i,
    getTiming: (match) => ({
      daysBeforeMeal: parseInt(match[1], 10),
      description: `${match[1]} day${parseInt(match[1], 10) > 1 ? 's' : ''} before`,
    }),
    getDescription: () => 'Prep ahead',
  },
  // "make the night before" or "prepare the night before"
  {
    pattern: /(?:make|prepare)\s+(?:the\s+)?(?:night|day)\s+before/i,
    getTiming: () => ({
      daysBeforeMeal: 1,
      description: 'day before',
    }),
    getDescription: () => 'Make the day before',
  },
];

// Section names that indicate prep content
const PREP_SECTION_NAMES = ['prep', 'marinate', 'advance prep', 'ahead of time', 'day before'];

/**
 * Generate a prep task description based on ingredients that need preparation
 */
function generateIngredientPrepDescription(recipe: Recipe): string | null {
  if (!recipe.ingredients || recipe.ingredients.length === 0) return null;

  // Look for ingredients that need prep (have preparation field)
  const ingredientsWithPrep = recipe.ingredients
    .filter(ing => ing.preparation && ing.preparation.trim())
    .slice(0, 3); // Limit to 3 for brevity

  if (ingredientsWithPrep.length > 0) {
    const prepItems = ingredientsWithPrep.map(ing => {
      const prep = ing.preparation!.toLowerCase();
      return `${prep} ${ing.name}`;
    });

    if (prepItems.length === 1) {
      return `Prep: ${prepItems[0]}`;
    } else if (prepItems.length === 2) {
      return `Prep: ${prepItems[0]} and ${prepItems[1]}`;
    } else {
      return `Prep: ${prepItems[0]}, ${prepItems[1]}, etc.`;
    }
  }

  return null;
}

/**
 * Extract prep tasks from a single recipe
 */
function extractFromRecipe(recipe: Recipe): ExtractedPrepTask[] {
  const tasks: ExtractedPrepTask[] = [];
  const seenDescriptions = new Set<string>();

  // Extract advance prep from instructions (marinate, soak, etc.)
  if (recipe.instructions) {
    for (const section of recipe.instructions) {
      const isPrepSection = PREP_SECTION_NAMES.some(name =>
        section.section.toLowerCase().includes(name)
      );

      for (const step of section.steps) {
        // Check each pattern for advance prep
        for (const { pattern, getTiming, getDescription } of PREP_PATTERNS) {
          const match = step.match(pattern);
          if (match) {
            const description = getDescription(match, step);
            if (description && !seenDescriptions.has(description.toLowerCase())) {
              const timing = getTiming(match);
              // Include advance prep tasks (overnight, hours before)
              if (timing.daysBeforeMeal > 0 || (timing.hoursBeforeMeal && timing.hoursBeforeMeal >= 1)) {
                tasks.push({
                  description,
                  timing,
                  source: 'auto-instruction',
                });
                seenDescriptions.add(description.toLowerCase());
              }
            }
          }
        }

        // If it's a prep section, add the whole step as a task if it mentions timing
        if (isPrepSection && !seenDescriptions.has(step.toLowerCase().slice(0, 50))) {
          const hasTimingKeyword = /(?:hour|overnight|ahead|before|day)/i.test(step);
          if (hasTimingKeyword) {
            tasks.push({
              description: step.length > 80 ? step.slice(0, 77) + '...' : step,
              timing: { daysBeforeMeal: 1, description: 'day before' },
              source: 'auto-instruction',
            });
            seenDescriptions.add(step.toLowerCase().slice(0, 50));
          }
        }
      }
    }
  }

  // Extract from notes
  if (recipe.notes) {
    for (const { pattern, getTiming, getDescription } of NOTES_PATTERNS) {
      const match = recipe.notes.match(pattern);
      if (match) {
        const description = getDescription(match);
        if (!seenDescriptions.has(description.toLowerCase())) {
          tasks.push({
            description,
            timing: getTiming(match),
            source: 'auto-notes',
          });
          seenDescriptions.add(description.toLowerCase());
        }
      }
    }
  }

  // Check for significant passive time (totalTime - cookTime > 30 minutes)
  if (recipe.totalTime && recipe.cookTime) {
    const totalMinutes = parseTimeToMinutes(recipe.totalTime);
    const cookMinutes = parseTimeToMinutes(recipe.cookTime);
    const passiveTime = totalMinutes - cookMinutes;

    if (passiveTime > 30 && !seenDescriptions.has('passive time')) {
      const hours = Math.floor(passiveTime / 60);
      const mins = passiveTime % 60;
      const timeStr = hours > 0
        ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
        : `${mins}m`;

      tasks.push({
        description: `Recipe has ${timeStr} passive time (rising, marinating, etc.)`,
        timing: {
          daysBeforeMeal: hours >= 4 ? 1 : 0,
          hoursBeforeMeal: hours,
          description: hours >= 4 ? 'day before' : 'same day',
        },
        source: 'auto-timing',
      });
    }
  }

  // ALWAYS add a basic same-day prep task for every recipe
  // This ensures every meal has at least one prep task
  const prepMinutes = recipe.prepTime ? parseTimeToMinutes(recipe.prepTime) : 0;

  // Generate a more specific description if possible
  let basicPrepDescription = generateIngredientPrepDescription(recipe);

  if (!basicPrepDescription) {
    // Fallback to generic prep description based on prep time
    if (prepMinutes > 0) {
      const prepTimeStr = prepMinutes >= 60
        ? `${Math.floor(prepMinutes / 60)}h ${prepMinutes % 60}m`.replace(' 0m', '')
        : `${prepMinutes} min`;
      basicPrepDescription = `Prep ingredients (${prepTimeStr})`;
    } else {
      basicPrepDescription = 'Prep ingredients';
    }
  }

  // Add the basic prep task
  tasks.push({
    description: basicPrepDescription,
    timing: {
      daysBeforeMeal: 0,
      hoursBeforeMeal: prepMinutes > 0 ? Math.ceil(prepMinutes / 60) : 1,
      description: 'same day',
    },
    source: 'auto-timing',
  });

  return tasks;
}

/**
 * Parse time string like "1 hour 30 minutes" or "45 minutes" to total minutes
 */
function parseTimeToMinutes(timeStr: string): number {
  let total = 0;

  const hourMatch = timeStr.match(/(\d+)\s*(?:hour|hr)s?/i);
  if (hourMatch) {
    total += parseInt(hourMatch[1], 10) * 60;
  }

  const minMatch = timeStr.match(/(\d+)\s*(?:minute|min)s?/i);
  if (minMatch) {
    total += parseInt(minMatch[1], 10);
  }

  return total;
}

/**
 * Extract all prep tasks from a meal plan
 */
export function extractPrepTasks(plan: PlanItem[]): PrepTask[] {
  const tasks: PrepTask[] = [];

  for (const planItem of plan) {
    if (!planItem.recipe) continue;

    const extractedTasks = extractFromRecipe(planItem.recipe);

    for (const extracted of extractedTasks) {
      tasks.push({
        id: `auto-${planItem.id}-${tasks.length}`,
        planItemId: planItem.id,
        recipeId: planItem.recipe.id,
        recipeName: planItem.recipe.name,
        mealDay: planItem.day,
        mealType: planItem.mealType,
        description: extracted.description,
        timing: extracted.timing,
        source: extracted.source,
        completed: false,
      });
    }
  }

  return tasks;
}

/**
 * Calculate the execution day for a prep task
 * This is when the task should actually be performed
 */
export function getExecutionDay(task: PrepTask): number {
  return Math.max(1, task.mealDay - task.timing.daysBeforeMeal);
}

/**
 * Sort prep tasks by execution order:
 * 1. Execution day (ascending)
 * 2. Meal day (ascending) - tasks for earlier meals first
 * 3. Hours before (descending) - longer lead time first
 */
export function sortPrepTasks(tasks: PrepTask[]): PrepTask[] {
  return [...tasks].sort((a, b) => {
    const execDayA = getExecutionDay(a);
    const execDayB = getExecutionDay(b);

    if (execDayA !== execDayB) return execDayA - execDayB;
    if (a.mealDay !== b.mealDay) return a.mealDay - b.mealDay;

    // Sort by hours before (longer lead time first)
    const hoursA = a.timing.hoursBeforeMeal || 0;
    const hoursB = b.timing.hoursBeforeMeal || 0;
    return hoursB - hoursA;
  });
}

/**
 * Group prep tasks by execution day
 */
export function groupTasksByExecutionDay(tasks: PrepTask[]): Map<number, PrepTask[]> {
  const groups = new Map<number, PrepTask[]>();

  for (const task of tasks) {
    const execDay = getExecutionDay(task);
    if (!groups.has(execDay)) {
      groups.set(execDay, []);
    }
    groups.get(execDay)!.push(task);
  }

  return groups;
}
