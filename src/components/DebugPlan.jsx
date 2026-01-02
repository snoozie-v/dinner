import React from 'react';

const DebugPlan = ({ planDebug }) => {
  if (!planDebug || planDebug.length === 0) return null;

  return (
    <div className="mb-8">
      <details className="bg-gray-100 rounded p-3 text-sm">
        <summary className="font-medium cursor-pointer">Debug: Current Plan State</summary>
        <pre className="mt-3 bg-gray-800 text-green-300 p-4 rounded overflow-auto max-h-64 font-mono text-xs">
          {JSON.stringify(planDebug, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default DebugPlan;
