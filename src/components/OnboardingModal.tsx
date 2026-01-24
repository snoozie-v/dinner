// src/components/OnboardingModal.tsx
import { useState, useRef, useEffect } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  initialStep?: number;
}

interface OnboardingStep {
  title: string;
  description: string;
  icon: JSX.Element;
  tip?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Meal Planner!',
    description: 'Plan your meals for the week, generate shopping lists automatically, and discover new recipes. Let\'s take a quick tour of the features.',
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: 'Plan Your Meals',
    description: 'Choose how many days to plan for, then either randomize your meal plan or manually select recipes for each day. Drag the handle to reorder days.',
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    tip: 'Use the servings multiplier to adjust portions for each meal.',
  },
  {
    title: 'Smart Shopping List',
    description: 'Your shopping list is automatically generated from your meal plan. Items are grouped by store section to make shopping easier.',
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    tip: 'Swipe right on any item to mark it as collected. Tap the checkbox to toggle.',
  },
  {
    title: 'Pantry Staples',
    description: 'Mark items you always have on hand (like salt, oil, garlic). These will automatically be marked as collected in your shopping list.',
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    tip: 'Access Pantry Staples from the Pantry button.',
  },
  {
    title: 'Save Templates',
    description: 'Love your meal plan? Save it as a template to reuse later. Great for recurring weekly rotations or seasonal favorites.',
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Manage Your Recipes',
    description: 'Browse the recipe library or create your own custom recipes. Use the Recipes tab to add, edit, duplicate, or delete recipes.',
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    tip: 'Star your favorite recipes for quick access!',
  },
  {
    title: 'Import Recipes from URLs',
    description: 'Save time by importing recipes from popular cooking websites! Just paste a URL from sites like AllRecipes, Food Network, or Serious Eats, and we\'ll automatically extract the recipe details for you.',
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    tip: 'Click "Import from URL" in the Recipe Library to get started!',
  },
  {
    title: 'Undo Mistakes',
    description: 'Accidentally deleted something? No worries! A toast notification appears with an Undo button for 5 seconds after any destructive action.',
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
  },
  {
    title: 'You\'re All Set!',
    description: 'Start planning your meals and enjoy stress-free cooking. You can always access this tutorial again from the Help button.',
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const OnboardingModal = ({ isOpen, onComplete, initialStep = 0 }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Reset to initial step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep);
    }
  }, [isOpen, initialStep]);

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      setCurrentStep(0);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
    setCurrentStep(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && !isLastStep) {
      handleNext();
    }
    if (isRightSwipe && !isFirstStep) {
      handlePrev();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              {step.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
            {step.description}
          </p>

          {/* Tip */}
          {step.tip && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mb-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-semibold">Tip:</span> {step.tip}
              </p>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2.5 h-2.5 rounded-full transition-colors touch-manipulation ${
                  index === currentStep
                    ? 'bg-blue-600 dark:bg-blue-400'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={handlePrev}
                className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-colors touch-manipulation min-h-[44px] flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="px-4 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition-colors touch-manipulation min-h-[44px]"
              >
                Skip Tour
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            className="flex-1 sm:flex-none px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-medium transition-colors touch-manipulation min-h-[44px] flex items-center justify-center gap-2"
          >
            {isLastStep ? (
              'Get Started'
            ) : (
              <>
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
