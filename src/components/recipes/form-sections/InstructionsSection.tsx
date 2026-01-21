// src/components/recipes/form-sections/InstructionsSection.tsx
import type { ChangeEvent } from 'react';
import type { FormSectionProps } from '../RecipeForm';
import { createBlankInstructionSection } from '../../../utils/recipeValidation';

const InstructionsSection = ({ data, onChange }: FormSectionProps) => {
  const instructions = data.instructions || [];

  const addSection = (): void => {
    onChange({ instructions: [...instructions, createBlankInstructionSection()] });
  };

  const removeSection = (sectionIndex: number): void => {
    onChange({ instructions: instructions.filter((_, i) => i !== sectionIndex) });
  };

  const updateSectionName = (sectionIndex: number, name: string): void => {
    const updated = instructions.map((section, i) => {
      if (i !== sectionIndex) return section;
      return { ...section, section: name };
    });
    onChange({ instructions: updated });
  };

  const addStep = (sectionIndex: number): void => {
    const updated = instructions.map((section, i) => {
      if (i !== sectionIndex) return section;
      return { ...section, steps: [...section.steps, ''] };
    });
    onChange({ instructions: updated });
  };

  const removeStep = (sectionIndex: number, stepIndex: number): void => {
    const updated = instructions.map((section, i) => {
      if (i !== sectionIndex) return section;
      return {
        ...section,
        steps: section.steps.filter((_, si) => si !== stepIndex)
      };
    });
    onChange({ instructions: updated });
  };

  const updateStep = (sectionIndex: number, stepIndex: number, value: string): void => {
    const updated = instructions.map((section, i) => {
      if (i !== sectionIndex) return section;
      return {
        ...section,
        steps: section.steps.map((step, si) => (si === stepIndex ? value : step))
      };
    });
    onChange({ instructions: updated });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Instructions</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Organize your recipe instructions into sections (e.g., Prep, Cook, Assembly). Each section can have multiple steps.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {instructions.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
          >
            {/* Section Header */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between">
              <input
                type="text"
                value={section.section || ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => updateSectionName(sectionIndex, e.target.value)}
                placeholder="Section name (e.g., Prep, Cook)"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 dark:text-gray-100 dark:placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => removeSection(sectionIndex)}
                className="ml-3 text-red-500 hover:text-red-700 text-sm"
              >
                Remove Section
              </button>
            </div>

            {/* Steps */}
            <div className="p-4 space-y-3">
              {section.steps.map((step, stepIndex) => (
                <div key={stepIndex} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center justify-center mt-2">
                    {stepIndex + 1}
                  </span>
                  <textarea
                    value={step || ''}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => updateStep(sectionIndex, stepIndex, e.target.value)}
                    placeholder="Enter step instructions..."
                    rows={2}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(sectionIndex, stepIndex)}
                    className="flex-shrink-0 mt-2 text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addStep(sectionIndex)}
                className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Step
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Section Button */}
      <button
        type="button"
        onClick={addSection}
        className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Section
      </button>

      {instructions.length === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
          No instruction sections added yet. Click the button above to add your first section.
        </p>
      )}
    </div>
  );
};

export default InstructionsSection;
