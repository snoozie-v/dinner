// src/components/NutritionSummary.tsx
import { useState, useMemo } from 'react';
import type { PlanItem } from '../types';

interface NutritionSummaryProps {
  plan: PlanItem[];
}

const NutritionSummary = ({ plan }: NutritionSummaryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const stats = useMemo(() => {
    // Group by day, only count days with at least one filled meal
    const dayMap: Record<number, { calories: number; protein: number; carbs: number; fat: number; fiber: number }> = {};

    for (const item of plan) {
      if (!item.recipe?.nutrition) continue;
      const n = item.recipe.nutrition;
      const m = item.servingsMultiplier ?? 1;
      if (!dayMap[item.day]) {
        dayMap[item.day] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      }
      dayMap[item.day].calories += n.calories * m;
      dayMap[item.day].protein  += n.protein_g * m;
      dayMap[item.day].carbs    += n.carbs_g * m;
      dayMap[item.day].fat      += n.fat_g * m;
      dayMap[item.day].fiber    += n.fiber_g * m;
    }

    const dayEntries = Object.entries(dayMap).map(([dayNum, vals]) => ({ dayNum: Number(dayNum), ...vals }));
    if (dayEntries.length < 2) return null;

    const n = dayEntries.length;
    const avg = (key: keyof Omit<typeof dayEntries[0], 'dayNum'>) =>
      Math.round(dayEntries.reduce((sum, d) => sum + d[key], 0) / n);

    return {
      calories: avg('calories'),
      protein:  avg('protein'),
      carbs:    avg('carbs'),
      fat:      avg('fat'),
      fiber:    avg('fiber'),
      days:     dayEntries,
    };
  }, [plan]);

  if (!stats) return null;

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
      {/* Collapsed pill row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Daily Avg
          </span>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
            ~{stats.calories.toLocaleString()} cal
          </span>
          <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">·</span>
          <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300">
            {stats.protein}g protein
          </span>
          <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">·</span>
          <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300">
            {stats.carbs}g carbs
          </span>
          <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">·</span>
          <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300">
            {stats.fat}g fat
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded breakdown */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          <div className="mt-3 space-y-3">
            {/* Macro bars */}
            {[
              { label: 'Calories', value: stats.calories, unit: 'kcal', max: 2500, color: 'bg-orange-400' },
              { label: 'Protein',  value: stats.protein,  unit: 'g',    max: 150,  color: 'bg-blue-500' },
              { label: 'Carbs',    value: stats.carbs,    unit: 'g',    max: 300,  color: 'bg-yellow-400' },
              { label: 'Fat',      value: stats.fat,      unit: 'g',    max: 100,  color: 'bg-red-400' },
              { label: 'Fiber',    value: stats.fiber,    unit: 'g',    max: 40,   color: 'bg-green-500' },
            ].map(({ label, value, unit, max, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span className="font-medium">{label}</span>
                  <span>{value} {unit}/day avg</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all`}
                    style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}

            {/* Per-day table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400">
                    <th className="text-left py-1 pr-3 font-medium">Day</th>
                    <th className="text-right py-1 px-2 font-medium">Cal</th>
                    <th className="text-right py-1 px-2 font-medium">Pro</th>
                    <th className="text-right py-1 px-2 font-medium">Carb</th>
                    <th className="text-right py-1 px-2 font-medium">Fat</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.days.map((d) => (
                    <tr key={d.dayNum} className="border-t border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                      <td className="py-1 pr-3">Day {d.dayNum}</td>
                      <td className="text-right py-1 px-2">{Math.round(d.calories)}</td>
                      <td className="text-right py-1 px-2">{Math.round(d.protein)}g</td>
                      <td className="text-right py-1 px-2">{Math.round(d.carbs)}g</td>
                      <td className="text-right py-1 px-2">{Math.round(d.fat)}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionSummary;
