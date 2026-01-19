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
import type { PlanItem as PlanItemType } from '../types';
import SortablePlanItem from './SortablePlanItem';

interface MealPlanProps {
  plan: PlanItemType[];
  setSelectedDayForPicker: (day: number | null) => void;
  updateServings: (planItemId: string, multiplier: number) => void;
  onReorderDays: (activeId: string, overId: string) => void;
}

const MealPlan = ({ plan, setSelectedDayForPicker, updateServings, onReorderDays }: MealPlanProps) => {
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

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onReorderDays(String(active.id), String(over.id));
    }
  };

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Your Meal Plan</h2>
        {plan.length > 0 && (
          <p className="text-sm text-gray-500">
            Drag the handle to reorder days
          </p>
        )}
      </div>

      {plan.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
          <p className="text-gray-500 text-lg">
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
            items={plan.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {plan.map((planItem) => (
                <SortablePlanItem
                  key={planItem.id}
                  planItem={planItem}
                  setSelectedDayForPicker={setSelectedDayForPicker}
                  updateServings={updateServings}
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
