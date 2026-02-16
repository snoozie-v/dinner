import { useState, useEffect } from 'react';
import { usePersistedState } from './usePersistedState';
import { STORAGE_KEYS } from '../utils/storage';

type Theme = 'light' | 'dark' | 'system';

export const useAppSettings = () => {
  // Persisted state
  const [theme, setTheme] = usePersistedState<Theme>(STORAGE_KEYS.THEME, 'system');
  const [onboardingSeen, setOnboardingSeen] = usePersistedState<boolean>(STORAGE_KEYS.ONBOARDING_SEEN, false);

  // Local UI state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(!onboardingSeen);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(0);
  const [showTutorialDropdown, setShowTutorialDropdown] = useState(false);

  // Modal states
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMealSettingsModal, setShowMealSettingsModal] = useState(false);
  const [showPantryModal, setShowPantryModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Apply dark mode class to <html>
  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      document.documentElement.classList.toggle('dark', isDark);
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleOnboardingComplete = () => {
    setOnboardingSeen(true);
    setShowOnboarding(false);
    setOnboardingInitialStep(0);
  };

  const handleShowOnboarding = (step: number = 0) => {
    setOnboardingInitialStep(step);
    setShowOnboarding(true);
    setShowTutorialDropdown(false);
  };

  return {
    theme, setTheme, toggleTheme, isDarkMode,
    showOnboarding, onboardingInitialStep, handleOnboardingComplete, handleShowOnboarding,
    showTutorialDropdown, setShowTutorialDropdown,
    showPrivacyPolicy, setShowPrivacyPolicy,
    showDataSettings, setShowDataSettings,
    showHelpModal, setShowHelpModal,
    showMealSettingsModal, setShowMealSettingsModal,
    showPantryModal, setShowPantryModal,
    showTemplateModal, setShowTemplateModal,
  };
};
