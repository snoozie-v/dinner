// src/components/TodayHero.tsx
import type { PlanItem, MealTypeConfig } from '../types';

interface TodayHeroProps {
  plan: PlanItem[];
  planStartDate: string | null;
  days: number;
  mealTypes: MealTypeConfig[];
  onScrollToDay: (day: number) => void;
  onViewRecipe: (recipe: NonNullable<PlanItem['recipe']>) => void;
}

const TodayHero = ({
  plan,
  planStartDate,
  days,
  mealTypes,
  onScrollToDay,
  onViewRecipe,
}: TodayHeroProps) => {
  if (!planStartDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(planStartDate + 'T00:00:00');
  const end = new Date(start);
  end.setDate(start.getDate() + days - 1);

  const diffMs = today.getTime() - start.getTime();
  const todayDay = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  const todayLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Plan complete
  if (today > end) {
    return (
      <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold text-green-800 dark:text-green-200">Plan complete!</p>
            <p className="text-sm text-green-700 dark:text-green-300">Ready to start a new one?</p>
          </div>
        </div>
      </div>
    );
  }

  // Plan hasn't started yet
  if (today < start) {
    const daysUntil = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return (
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <p className="font-semibold text-blue-800 dark:text-blue-200">Plan starts in {daysUntil} day{daysUntil !== 1 ? 's' : ''}</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">Starting {start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>
      </div>
    );
  }

  // Today is within the plan
  const todaySlots = plan.filter(p => p.day === todayDay && p.recipe !== null);
  const enabledMealTypes = mealTypes.map(mt => mt.id);
  const todaySlotsByMeal = mealTypes
    .filter(mt => enabledMealTypes.includes(mt.id))
    .map(mt => ({
      config: mt,
      slot: todaySlots.find(s => s.mealType === mt.id) || null,
    }));

  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-blue-900 dark:text-blue-100">Today</span>
            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
              Day {todayDay} of {days}
            </span>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300">{todayLabel}</p>
        </div>
        <button
          onClick={() => onScrollToDay(todayDay)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium underline underline-offset-2"
        >
          View in plan ↓
        </button>
      </div>

      {todaySlots.length === 0 ? (
        <p className="text-sm text-blue-600 dark:text-blue-400 italic">No meals planned for today yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {todaySlotsByMeal
            .filter(({ slot }) => slot !== null)
            .map(({ config, slot }) => (
              <button
                key={config.id}
                onClick={() => slot?.recipe && onViewRecipe(slot.recipe)}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-left hover:shadow-md transition-shadow"
              >
                <span className="text-base">{config.icon}</span>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{config.label}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-[140px] truncate">
                    {slot?.recipe?.name}
                  </p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default TodayHero;
