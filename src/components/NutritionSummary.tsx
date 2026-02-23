// src/components/NutritionSummary.tsx
import { useState, useMemo } from 'react';
import type { PlanItem, NutritionTargets } from '../types';
import { usePersistedState } from '../hooks/usePersistedState';
import { STORAGE_KEYS } from '../utils/storage';

interface NutritionSummaryProps {
  plan: PlanItem[];
}

const DEFAULT_TARGETS: NutritionTargets = {
  calories: 2000,
  protein: 50,
  carbs: 250,
  fat: 65,
  fiber: 25,
};

// Returns 'green' | 'amber' | 'red' based on % of target
const targetColor = (value: number, target: number): 'green' | 'amber' | 'red' => {
  const pct = value / target;
  if (pct >= 0.80 && pct <= 1.15) return 'green';
  if (pct >= 0.60 && pct <= 1.35) return 'amber';
  return 'red';
};

const colorDot: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
};

const barColor: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
};

const NutritionSummary = ({ plan }: NutritionSummaryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [targets, setTargets] = usePersistedState<NutritionTargets>(STORAGE_KEYS.NUTRITION_TARGETS, DEFAULT_TARGETS);
  // Draft state for the edit form — initialized from targets when edit opens
  const [draft, setDraft] = useState<NutritionTargets>(targets);

  const stats = useMemo(() => {
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

  const calColor = targetColor(stats.calories, targets.calories);

  const handleOpenEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft({ ...targets });
    setIsEditingTargets(true);
    setIsExpanded(true);
  };

  const handleSaveTargets = () => {
    setTargets(draft);
    setIsEditingTargets(false);
  };

  const handleResetTargets = () => {
    setDraft({ ...DEFAULT_TARGETS });
  };

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
      {/* Collapsed pill row */}
      <div className="flex items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Daily Avg
            </span>
            {/* Calorie pill with color dot */}
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-100">
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${colorDot[calColor]}`} />
              {stats.calories.toLocaleString()} / {targets.calories.toLocaleString()} cal
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
        {/* Target edit button */}
        <button
          onClick={handleOpenEdit}
          className="px-3 py-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          title="Set nutrition targets"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Expanded breakdown */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          <div className="mt-3 space-y-3">
            {/* Macro bars */}
            {([
              { label: 'Calories', value: stats.calories, target: targets.calories, unit: 'kcal' },
              { label: 'Protein',  value: stats.protein,  target: targets.protein,  unit: 'g' },
              { label: 'Carbs',    value: stats.carbs,    target: targets.carbs,    unit: 'g' },
              { label: 'Fat',      value: stats.fat,      target: targets.fat,      unit: 'g' },
              { label: 'Fiber',    value: stats.fiber,    target: targets.fiber,    unit: 'g' },
            ] as const).map(({ label, value, target, unit }) => {
              const color = targetColor(value, target);
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span className="font-medium">{label}</span>
                    <span>
                      {value} / {target} {unit}/day avg
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor[color]} rounded-full transition-all`}
                      style={{ width: `${Math.min(100, (value / target) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}

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

            {/* Target edit panel */}
            {isEditingTargets && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">
                  Daily Targets
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    { key: 'calories', label: 'Calories', unit: 'kcal', step: 50 },
                    { key: 'protein',  label: 'Protein',  unit: 'g',    step: 5 },
                    { key: 'carbs',    label: 'Carbs',    unit: 'g',    step: 5 },
                    { key: 'fat',      label: 'Fat',      unit: 'g',    step: 5 },
                    { key: 'fiber',    label: 'Fiber',    unit: 'g',    step: 1 },
                  ] as const).map(({ key, label, unit, step }) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {label} ({unit})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step={step}
                        value={draft[key]}
                        onChange={e => setDraft(prev => ({ ...prev, [key]: Math.max(0, Number(e.target.value)) }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={handleSaveTargets}
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleResetTargets}
                    className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
                  >
                    Reset to defaults
                  </button>
                  <button
                    onClick={() => setIsEditingTargets(false)}
                    className="ml-auto px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionSummary;
