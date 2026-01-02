import React from 'react';

const Controls = ({ days, setDays, generateRandomPlan, initManualPlan }) => { // Updated prop
  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-6 mb-10 bg-white p-6 rounded-xl shadow-sm border">
      <div className="flex items-center gap-3">
        <label className="text-gray-700 font-medium">Plan for</label>
        <input
          type="number"
          min="1"
          max="30"
          value={days}
          onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-gray-700 font-medium">days</span>
      </div>

      <button
        onClick={generateRandomPlan}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
      >
        Randomize Plan
      </button>

      <button
        onClick={initManualPlan} // Updated
        className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition shadow-sm"
      >
        Start Manual Plan
      </button>
    </div>
  );
};

export default Controls;
