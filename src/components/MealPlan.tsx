// src/components/MealPlan.tsx
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
}: MealPlanProps) => {
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

  // Create sortable IDs for days
  const sortableIds = sortedDays.map(day => `day-${day}`);

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Extract day numbers from IDs (format: "day-1", "day-2", etc.)
      const activeDay = parseInt(String(active.id).replace('day-', ''), 10);
      const overDay = parseInt(String(over.id).replace('day-', ''), 10);
      onReorderDays(activeDay, overDay);
    }
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Your Meal Plan</h2>
        {plan.length > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drag the handle to reorder days
          </p>
        )}
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
                <DayCard
                  key={`day-${day}`}
                  day={day}
                  slots={dayGroups[day]}
                  mealTypes={mealTypes}
                  onSelectRecipe={onSelectRecipe}
                  updateServings={updateServings}
                  updateNotes={updateNotes}
                  onRemoveRecipe={onRemoveRecipe}
                  onViewRecipe={onViewRecipe}
                  mealSlotThemes={mealSlotThemes}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
};

export default MealPlan;
