import React from 'react';
import PlanItem from './PlanItem';

const MealPlan = ({ plan, setSelectedDayForPicker, updateServings }) => {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Meal Plan</h2>

      {plan.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border">
          <p className="text-gray-500 text-lg">
            Generate a random plan or pick recipes manually to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {plan.map((planItem) => (
            <PlanItem
              key={planItem.id}
              planItem={planItem}
              setSelectedDayForPicker={setSelectedDayForPicker}
              updateServings={updateServings}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default MealPlan;
