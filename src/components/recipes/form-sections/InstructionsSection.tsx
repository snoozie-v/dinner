// src/components/recipes/form-sections/InstructionsSection.tsx
import { useState, type ChangeEvent } from 'react';
import type { FormSectionProps } from '../RecipeForm';
import { createBlankInstructionSection, parseInstructionText } from '../../../utils/recipeValidation';

const InstructionsSection = ({ data, onChange }: FormSectionProps) => {
  const instructions = data.instructions || [];
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSectionName, setBulkSectionName] = useState('Main');

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

  // Handle bulk instruction paste
  const handleBulkAdd = (): void => {
    const steps = parseInstructionText(bulkText);
    if (steps.length > 0) {
      const newSection = {
        section: bulkSectionName.trim() || 'Main',
        steps,
      };
      onChange({ instructions: [...instructions, newSection] });
      setBulkText('');
      setBulkSectionName('Main');
      setShowBulkEntry(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Instructions</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Add instructions step by step, or paste them all at once.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-6">
          You can organize steps into sections (e.g., Prep, Cook) or use a single section for simpler recipes.
        </p>
      </div>

      {/* Bulk Entry Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowBulkEntry(!showBulkEntry)}
          className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
            showBulkEntry
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Paste Instructions
          </span>
        </button>
      </div>

      {/* Bulk Entry Panel */}
      {showBulkEntry && (
        <div className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Section Name
            </label>
            <input
              type="text"
              value={bulkSectionName}
              onChange={(e) => setBulkSectionName(e.target.value)}
              placeholder="e.g., Main, Prep, Cook"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Paste your instructions
            </label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`Example:\n1. Preheat oven to 350°F\n2. Mix flour, sugar, and salt in a bowl\n3. Add butter and mix until crumbly\n4. Press into pan and bake for 20 minutes\n\nOr just paste plain text - each line becomes a step.`}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBulkAdd}
              disabled={!bulkText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Instructions
            </button>
            <button
              type="button"
              onClick={() => {
                setShowBulkEntry(false);
                setBulkText('');
                setBulkSectionName('Main');
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            The parser handles numbered lists (1. 2. 3.), bulleted lists (- or *), or plain paragraphs.
            You can edit each step after adding.
          </p>
        </div>
      )}

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
        Add Section Manually
      </button>

      {instructions.length === 0 && !showBulkEntry && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
          No instructions added yet. Click "Paste Instructions" to bulk add, or "Add Section Manually" to build step by step.
        </p>
      )}
    </div>
  );
};

export default InstructionsSection;
