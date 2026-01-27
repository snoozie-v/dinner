// src/components/DayCard.tsx
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PlanItem, Recipe, MealType, MealTypeConfig } from '../types';
import MealSlot from './MealSlot';

interface DayCardProps {
  day: number;
  slots: PlanItem[];
  mealTypes: MealTypeConfig[];
  onSelectRecipe: (day: number, mealType: MealType) => void;
  updateServings: (planItemId: string, multiplier: number) => void;
  updateNotes: (planItemId: string, notes: string) => void;
  onRemoveRecipe: (day: number, mealType: MealType) => void;
  onViewRecipe: (recipe: Recipe) => void;
}

const DayCard = ({
  day,
  slots,
  mealTypes,
  onSelectRecipe,
  updateServings,
  updateNotes,
  onRemoveRecipe,
  onViewRecipe,
}: DayCardProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Use the first slot's id for sorting (all slots in a day move together)
  const sortableId = `day-${day}`;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Count filled slots
  const filledSlots = slots.filter(s => s.recipe !== null).length;
  const totalSlots = slots.length;

  // Get recipe names for collapsed view
  const recipeNames = slots
    .filter(s => s.recipe)
    .map(s => {
      const mealConfig = mealTypes.find(mt => mt.id === s.mealType);
      return `${mealConfig?.icon || ''} ${s.recipe?.name}`;
    });

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700 overflow-hidden">
        {/* Day Header */}
        <div className="flex items-center bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="w-12 flex items-center justify-center cursor-grab active:cursor-grabbing py-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors touch-manipulation min-h-[56px]"
            title="Drag to reorder days"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8h16M4 16h16"
              />
            </svg>
          </div>

          {/* Day title and collapse toggle */}
          <div className="flex-1 flex items-center justify-between px-4 py-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Day {day}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filledSlots} of {totalSlots} meals planned
              </p>
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition touch-manipulation"
            >
              <svg
                className={`w-5 h-5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsed view - show recipe names inline */}
        {isCollapsed && (
          <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
            {recipeNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {recipeNames.map((name, idx) => (
                  <span key={idx} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 italic">No meals planned</span>
            )}
          </div>
        )}

        {/* Expanded view - show all meal slots */}
        {!isCollapsed && (
          <div className="p-4 space-y-3">
            {mealTypes.map(mealTypeConfig => {
              const slot = slots.find(s => s.mealType === mealTypeConfig.id);
              if (!slot) return null;

              return (
                <MealSlot
                  key={slot.id}
                  planItem={slot}
                  onSelectRecipe={onSelectRecipe}
                  updateServings={updateServings}
                  updateNotes={updateNotes}
                  onRemoveRecipe={onRemoveRecipe}
                  onViewRecipe={onViewRecipe}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DayCard;
