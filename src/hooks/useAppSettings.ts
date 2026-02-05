import { useState, useEffect, useCallback } from 'react';
import type { ActiveTab } from '../types';
import { STORAGE_KEYS, getStoredValue } from '../utils/storage';

type Theme = 'light' | 'dark' | 'system';

export const useAppSettings = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    getStoredValue(STORAGE_KEYS.ACTIVE_TAB, 'planner')
  );

  // Theme state
  const [theme, setTheme] = useState<Theme>(() => getStoredValue(STORAGE_KEYS.THEME, 'system'));

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    const seen = localStorage.getItem(STORAGE_KEYS.ONBOARDING_SEEN);
    return !seen;
  });
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(0);
  const [showTutorialDropdown, setShowTutorialDropdown] = useState(false);

  // Modal states
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showDataSettings, setShowDataSettings] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMealSettingsModal, setShowMealSettingsModal] = useState(false);
  const [showPantryModal, setShowPantryModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Pull-to-refresh feedback
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

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

  // Persist theme
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));
  }, [theme]);

  // Persist activeTab
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, JSON.stringify(activeTab));
  }, [activeTab]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleOnboardingComplete = () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDING_SEEN, 'true');
    setShowOnboarding(false);
    setOnboardingInitialStep(0);
  };

  const handleShowOnboarding = (step: number = 0) => {
    setOnboardingInitialStep(step);
    setShowOnboarding(true);
    setShowTutorialDropdown(false);
  };

  const handlePullRefresh = useCallback(async () => {
    await new Promise(resolve => setTimeout(resolve, 300));

    let message = '';
    if (activeTab === 'planner') {
      message = 'Meal plan is up to date!';
    } else if (activeTab === 'shop') {
      message = 'Shopping list refreshed!';
    } else if (activeTab === 'recipes') {
      message = 'Recipes are up to date!';
    }

    setRefreshMessage(message);
    setTimeout(() => {
      setRefreshMessage(null);
    }, 2000);
  }, [activeTab]);

  return {
    theme, setTheme, toggleTheme, isDarkMode,
    activeTab, setActiveTab,
    showOnboarding, onboardingInitialStep, handleOnboardingComplete, handleShowOnboarding,
    showTutorialDropdown, setShowTutorialDropdown,
    showPrivacyPolicy, setShowPrivacyPolicy,
    showDataSettings, setShowDataSettings,
    showHelpModal, setShowHelpModal,
    showMealSettingsModal, setShowMealSettingsModal,
    showPantryModal, setShowPantryModal,
    showTemplateModal, setShowTemplateModal,
    refreshMessage, handlePullRefresh,
  };
};
