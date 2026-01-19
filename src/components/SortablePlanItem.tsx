// src/components/SortablePlanItem.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PlanItem as PlanItemType } from '../types';
import PlanItem from './PlanItem';

interface SortablePlanItemProps {
  planItem: PlanItemType;
  setSelectedDayForPicker: (day: number | null) => void;
  updateServings: (planItemId: string, multiplier: number) => void;
}

const SortablePlanItem = ({ planItem, setSelectedDayForPicker, updateServings }: SortablePlanItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: planItem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 bg-gray-100 rounded-l-xl border-r border-gray-200 hover:bg-gray-200 transition-colors"
        title="Drag to reorder"
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

      {/* Plan Item with left padding for drag handle */}
      <div className="pl-10">
        <PlanItem
          planItem={planItem}
          setSelectedDayForPicker={setSelectedDayForPicker}
          updateServings={updateServings}
        />
      </div>
    </div>
  );
};

export default SortablePlanItem;
