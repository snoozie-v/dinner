// src/components/MealPlan.tsx
import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import type { PlanItem as PlanItemType, Recipe, MealType, MealTypeConfig, MealSlotTheme } from '../types';
import DayCard from './DayCard';
import { copyToClipboard, shareText, canNativeShare } from '../utils/platform';

interface MealPlanProps {
  plan: PlanItemType[];
  mealTypes: MealTypeConfig[];
  onSelectRecipe: (day: number, mealType: MealType) => void;
  updateServings: (planItemId: string, multiplier: number) => void;
  updateNotes: (planItemId: string, notes: string) => void;
  onReorderDays: (activeDay: number, overDay: number) => void;
  onRemoveRecipe: (day: number, mealType: MealType) => void;
  onViewRecipe: (recipe: Recipe) => void;
  mealSlotThemes?: MealSlotTheme[];
  todayPlanDay?: number | null;
  onMarkCooked?: (planItemId: string) => void;
  onRateRecipe?: (recipeId: string, rating: number) => void;
  planStartDate?: string | null;
}

const MealPlan = ({
  plan,
  mealTypes,
  onSelectRecipe,
  updateServings,
  updateNotes,
  onReorderDays,
  onRemoveRecipe,
  onViewRecipe,
  mealSlotThemes = [],
  todayPlanDay,
  onMarkCooked,
  onRateRecipe,
  planStartDate,
}: MealPlanProps) => {
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setCopyToast(msg);
    setTimeout(() => setCopyToast(null), 3000);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group plan items by day
  const dayGroups = plan.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
    acc[item.day].push(item);
    return acc;
  }, {} as Record<number, PlanItemType[]>);

  // Get sorted list of days
  const sortedDays = Object.keys(dayGroups)
    .map(Number)
    .sort((a, b) => a - b);

  const hasFilledSlots = plan.some(item => item.recipe !== null);

  // Build readable export text
  const generatePlanText = (): string => {
    const lines: string[] = [];
    const numDays = sortedDays.length;

    if (planStartDate) {
      const start = new Date(planStartDate + 'T00:00:00');
      const end = new Date(start);
      end.setDate(end.getDate() + numDays - 1);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      lines.push(`Meal Plan — ${fmt(start)} – ${fmt(end)} (${numDays} day${numDays !== 1 ? 's' : ''})`);
    } else {
      lines.push(`Meal Plan (${numDays} day${numDays !== 1 ? 's' : ''})`);
    }

    for (const day of sortedDays) {
      const slots = dayGroups[day];
      const filledSlots = slots.filter(s => s.recipe !== null);
      if (filledSlots.length === 0) continue;

      lines.push('');

      if (planStartDate) {
        const dayDate = new Date(planStartDate + 'T00:00:00');
        dayDate.setDate(dayDate.getDate() + day - 1);
        const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        lines.push(`Day ${day} — ${dayLabel}`);
      } else {
        lines.push(`Day ${day}`);
      }

      // Sort slots by meal type order
      const sortedSlots = filledSlots.slice().sort((a, b) => {
        const aOrder = mealTypes.find(mt => mt.id === a.mealType)?.order ?? 99;
        const bOrder = mealTypes.find(mt => mt.id === b.mealType)?.order ?? 99;
        return aOrder - bOrder;
      });

      for (const slot of sortedSlots) {
        if (!slot.recipe) continue;
        const mt = mealTypes.find(m => m.id === slot.mealType);
        const icon = mt?.icon || '🍽️';
        const label = mt?.label || slot.mealType;
        const mult = slot.servingsMultiplier !== 1 ? ` (${slot.servingsMultiplier}x)` : '';
        lines.push(`  ${icon} ${label}: ${slot.recipe.name}${mult}`);
        if (slot.notes?.trim()) {
          lines.push(`    Note: ${slot.notes.trim()}`);
        }
      }
    }

    return lines.join('\n');
  };

  const handleCopy = async () => {
    const text = generatePlanText();
    const success = await copyToClipboard(text);
    showToast(success ? 'Meal plan copied!' : 'Failed to copy. Please try manually.');
  };

  const handleShare = async () => {
    const text = generatePlanText();
    const result = await shareText('Meal Plan', text);
    if (result === 'copied') {
      showToast('Meal plan copied!');
    }
  };

  // Create sortable IDs for days
  const sortableIds = sortedDays.map(day => `day-${day}`);

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeDay = parseInt(String(active.id).replace('day-', ''), 10);
      const overDay = parseInt(String(over.id).replace('day-', ''), 10);
      onReorderDays(activeDay, overDay);
    }
  };

  return (
    <section className="mb-12">
      {/* Toast */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-full shadow-lg pointer-events-none">
          {copyToast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6 gap-3">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Your Meal Plan</h2>
        <div className="flex items-center gap-2">
          {plan.length > 0 && (
            <p className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
              Drag to reorder days
            </p>
          )}
          {/* Copy button */}
          <button
            onClick={handleCopy}
            disabled={!hasFilledSlots}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            title="Copy meal plan"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {/* Share button — only on capable devices */}
          {canNativeShare() && (
            <button
              onClick={handleShare}
              disabled={!hasFilledSlots}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
              title="Share meal plan"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {sortedDays.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Generate a random plan or pick recipes manually to get started!
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {sortedDays.map((day) => (
                <div key={`day-${day}`} id={`day-card-${day}`}>
                  <DayCard
                    day={day}
                    slots={dayGroups[day]}
                    mealTypes={mealTypes}
                    onSelectRecipe={onSelectRecipe}
                    updateServings={updateServings}
                    updateNotes={updateNotes}
                    onRemoveRecipe={onRemoveRecipe}
                    onViewRecipe={onViewRecipe}
                    mealSlotThemes={mealSlotThemes}
                    isToday={day === todayPlanDay}
                    onMarkCooked={onMarkCooked}
                    onRateRecipe={onRateRecipe}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
};

export default MealPlan;
