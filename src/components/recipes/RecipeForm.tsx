// src/components/recipes/RecipeForm.tsx
import { useState, Fragment } from 'react';
import type { ComponentType } from 'react';
import type { Recipe } from '../../types';
import { createBlankRecipe } from '../../utils/recipeValidation';

import BasicInfoSection from './form-sections/BasicInfoSection';
import TimingSection from './form-sections/TimingSection';
import IngredientsSection from './form-sections/IngredientsSection';
import InstructionsSection from './form-sections/InstructionsSection';
import TagsSection from './form-sections/TagsSection';
import ExtrasSection from './form-sections/ExtrasSection';

export interface FormSectionProps {
  data: Recipe;
  onChange: (updates: Partial<Recipe>) => void;
}

interface Step {
  id: string;
  label: string;
  component: ComponentType<FormSectionProps>;
}

const STEPS: Step[] = [
  { id: 'basic', label: 'Basic Info', component: BasicInfoSection },
  { id: 'timing', label: 'Timing', component: TimingSection },
  { id: 'ingredients', label: 'Ingredients', component: IngredientsSection },
  { id: 'instructions', label: 'Instructions', component: InstructionsSection },
  { id: 'tags', label: 'Tags', component: TagsSection },
  { id: 'extras', label: 'Extras', component: ExtrasSection },
];

interface RecipeFormProps {
  initialData: Recipe | null;
  onSubmit: (recipeData: Partial<Recipe>) => string[] | null;
  onCancel: () => void;
}

const RecipeForm = ({ initialData, onSubmit, onCancel }: RecipeFormProps) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [formData, setFormData] = useState<Recipe>(() => {
    if (initialData) {
      return { ...initialData };
    }
    return createBlankRecipe();
  });
  const [errors, setErrors] = useState<string[]>([]);

  const updateFormData = (updates: Partial<Recipe>): void => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = (): void => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = (): void => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number): void => {
    setCurrentStep(stepIndex);
  };

  const handleSubmit = (): void => {
    setErrors([]);
    const validationErrors = onSubmit(formData);
    if (validationErrors && validationErrors.length > 0) {
      setErrors(validationErrors);
    }
  };

  const CurrentStepComponent = STEPS[currentStep].component;
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <Fragment key={step.id}>
              <button
                onClick={() => handleStepClick(index)}
                className="flex items-center cursor-pointer"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {index < currentStep ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={`ml-2 text-sm font-medium hidden sm:inline ${
                    index === currentStep ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {errors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Please fix the following errors:</h4>
            <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-400">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <CurrentStepComponent
          data={formData}
          onChange={updateFormData}
        />
      </div>

      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between">
        <div>
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              {initialData ? 'Save Changes' : 'Create Recipe'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeForm;
