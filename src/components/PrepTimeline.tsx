// src/components/PrepTimeline.tsx
import { useMemo, useState } from 'react';
import type { PrepTask, PlanItem } from '../types';
import { groupTasksByExecutionDay, sortPrepTasks } from '../utils/prepExtractor';
import PrepTaskItem from './PrepTaskItem';
import AddPrepTaskModal from './AddPrepTaskModal';

interface PrepTimelineProps {
  tasks: PrepTask[];
  plan: PlanItem[];
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (planItemId: string, description: string, daysBeforeMeal: number) => void;
  onViewRecipe: (recipeId: string) => void;
}

const PrepTimeline = ({
  tasks,
  plan,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onViewRecipe,
}: PrepTimelineProps) => {
  const [showAddModal, setShowAddModal] = useState(false);

  // Sort tasks and group by execution day
  const sortedTasks = useMemo(() => sortPrepTasks(tasks), [tasks]);
  const groupedTasks = useMemo(() => groupTasksByExecutionDay(sortedTasks), [sortedTasks]);

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const incompleteTasks = totalTasks - completedTasks;

  // Get planned meals for the add task modal
  const plannedMeals = useMemo(() => {
    return plan
      .filter(item => item.recipe !== null)
      .sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.mealType.localeCompare(b.mealType);
      });
  }, [plan]);

  // Check if there are any planned meals
  const hasPlannedMeals = plannedMeals.length > 0;

  // Get sorted execution days
  const executionDays = useMemo(() => {
    return Array.from(groupedTasks.keys()).sort((a, b) => a - b);
  }, [groupedTasks]);

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Prep Tasks
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {totalTasks === 0 ? (
                'No prep tasks yet'
              ) : (
                <>
                  {totalTasks} task{totalTasks !== 1 ? 's' : ''} · {completedTasks} completed
                </>
              )}
            </p>
          </div>

          {/* Progress indicator */}
          {totalTasks > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {Math.round((completedTasks / totalTasks) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {totalTasks === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No prep tasks yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
            {hasPlannedMeals ? (
              <>
                Prep tasks are auto-extracted from recipes with marinating, soaking, or other advance prep steps.
                You can also add manual tasks.
              </>
            ) : (
              <>
                Add some meals to your plan first, then prep tasks will be extracted automatically from recipes that require advance preparation.
              </>
            )}
          </p>
          {hasPlannedMeals && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors touch-manipulation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Prep Task
            </button>
          )}
        </div>
      )}

      {/* Task timeline grouped by execution day */}
      {executionDays.map(day => {
        const dayTasks = groupedTasks.get(day) || [];
        const dayCompletedCount = dayTasks.filter(t => t.completed).length;
        const allCompleted = dayCompletedCount === dayTasks.length;

        return (
          <div key={day} className="relative">
            {/* Day header */}
            <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 py-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                allCompleted
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {allCompleted && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>Day {day}</span>
                <span className="text-xs opacity-75">
                  ({dayCompletedCount}/{dayTasks.length})
                </span>
              </div>
            </div>

            {/* Tasks for this day */}
            <div className="space-y-2 mt-2">
              {dayTasks.map(task => (
                <PrepTaskItem
                  key={task.id}
                  task={task}
                  onToggle={onToggleTask}
                  onDelete={task.source === 'manual' ? onDeleteTask : undefined}
                  onViewRecipe={() => onViewRecipe(task.recipeId)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Add Task button (when there are tasks) */}
      {totalTasks > 0 && hasPlannedMeals && (
        <div className="pt-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors touch-manipulation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-medium">Add Prep Task</span>
          </button>
        </div>
      )}

      {/* Add Task Modal */}
      <AddPrepTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        plannedMeals={plannedMeals}
        onAddTask={onAddTask}
      />
    </div>
  );
};

export default PrepTimeline;
