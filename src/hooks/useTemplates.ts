import type { Recipe, PlanItem, MealPlanTemplate, MealPlanSettings, MealType } from '../types';
import type { UndoAction } from '../components/UndoToast';
import { STORAGE_KEYS } from '../utils/storage';
import { usePersistedState } from './usePersistedState';

interface UseTemplatesParams {
  plan: PlanItem[];
  mealSettings: MealPlanSettings;
  allRecipes: Recipe[];
  setUndoAction: (action: UndoAction | null) => void;
}

interface ResolvedTemplate {
  plan: PlanItem[];
  days: number;
  enabledMealTypes?: MealType[];
}

export const useTemplates = ({
  plan,
  mealSettings,
  allRecipes,
  setUndoAction,
}: UseTemplatesParams) => {
  const [templates, setTemplates] = usePersistedState<MealPlanTemplate[]>(
    STORAGE_KEYS.TEMPLATES, []
  );

  const saveTemplate = (name: string): void => {
    const maxDay = Math.max(...plan.map(p => p.day), 0);

    const template: MealPlanTemplate = {
      id: `template-${Date.now().toString(36)}`,
      name,
      createdAt: new Date().toISOString(),
      days: maxDay,
      version: 2,
      enabledMealTypes: [...mealSettings.enabledMealTypes],
      slots: plan.map(p => ({
        day: p.day,
        mealType: p.mealType,
        recipeId: p.recipe?.id || null,
        servingsMultiplier: p.servingsMultiplier,
      })),
    };
    setTemplates(prev => [...prev, template]);
  };

  const resolveTemplate = (template: MealPlanTemplate): ResolvedTemplate => {
    const newPlan: PlanItem[] = template.slots.map(slot => {
      const recipe = slot.recipeId ? allRecipes.find(r => r.id === slot.recipeId) || null : null;
      return {
        day: slot.day,
        mealType: slot.mealType,
        id: `day-${slot.day}-${slot.mealType}-${slot.recipeId || 'empty'}`,
        recipe: recipe ? { ...recipe } : null,
        servingsMultiplier: slot.servingsMultiplier,
      };
    });

    return {
      plan: newPlan,
      days: template.days,
      enabledMealTypes: template.enabledMealTypes,
    };
  };

  const deleteTemplate = (templateId: string): void => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setTemplates(prev => prev.filter(t => t.id !== templateId));

    setUndoAction({
      id: `template-${Date.now()}`,
      message: `Deleted template "${template.name}"`,
      onUndo: () => {
        setTemplates(prev => [...prev, template]);
      },
    });
  };

  const importTemplates = (imported: MealPlanTemplate[], mode: 'overwrite' | 'merge'): void => {
    if (mode === 'overwrite') {
      setTemplates(imported);
    } else {
      setTemplates(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newTemplates = imported.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTemplates];
      });
    }
  };

  return { templates, saveTemplate, resolveTemplate, deleteTemplate, importTemplates, setTemplates };
};
