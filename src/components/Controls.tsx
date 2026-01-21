// src/components/Controls.tsx
import type { ChangeEvent } from 'react';

interface ControlsProps {
  days: number;
  setDays: (days: number) => void;
  generateRandomPlan: () => void;
  initManualPlan: () => void;
  clearAllData: () => void;
  onOpenTemplates: () => void;
  onOpenPantry: () => void;
  hasTemplates: boolean;
}

const Controls = ({
  days,
  setDays,
  generateRandomPlan,
  initManualPlan,
  clearAllData,
  onOpenTemplates,
  onOpenPantry,
  hasTemplates,
}: ControlsProps) => {
  const handleDaysChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDays(Math.max(1, Number(e.target.value) || 1));
  };

  return (
    <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
      {/* Main controls row */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          <label className="text-gray-700 dark:text-gray-300 font-medium">Plan for</label>
          <input
            type="number"
            min="1"
            max="30"
            value={days}
            onChange={handleDaysChange}
            className="w-20 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-700 dark:text-gray-300 font-medium">days</span>
        </div>

        <button
          onClick={generateRandomPlan}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
        >
          Randomize Plan
        </button>

        <button
          onClick={initManualPlan}
          className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition shadow-sm"
        >
          Start Manual
        </button>

        {hasTemplates && (
          <button
            onClick={onOpenTemplates}
            className="bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Templates
          </button>
        )}
      </div>

      {/* Secondary controls row */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={onOpenTemplates}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {hasTemplates ? 'Manage Templates' : 'Save as Template'}
        </button>

        <span className="text-gray-300 dark:text-gray-600">|</span>

        <button
          onClick={onOpenPantry}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Pantry Staples
        </button>

        <span className="text-gray-300 dark:text-gray-600">|</span>

        <button
          onClick={clearAllData}
          className="text-red-600 hover:text-red-700 px-3 py-1.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
};

export default Controls;
