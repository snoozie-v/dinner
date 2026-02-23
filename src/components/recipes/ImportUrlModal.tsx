// src/components/recipes/ImportUrlModal.tsx
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { FormEvent, ChangeEvent } from 'react';

interface ImportUrlModalProps {
  onImport: (url: string) => Promise<void>;
  onClose: () => void;
}

const SUPPORTED_SITES = [
  'AllRecipes', 'Budget Bytes', 'Serious Eats', 'Food Network', 'NYT Cooking',
  'Bon Appétit', 'Epicurious', 'Simply Recipes', 'The Kitchn', 'Minimalist Baker',
  'Tasty', 'Delish', 'RecipeTin Eats', 'Half Baked Harvest', 'Smitten Kitchen',
  'Pinch of Yum', 'Love and Lemons', 'Skinnytaste', 'Oh She Glows', 'Heidi Swanson',
];

const ImportUrlModal = ({ onImport, onClose }: ImportUrlModalProps) => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [slowImport, setSlowImport] = useState<boolean>(false);
  const [showSites, setShowSites] = useState<boolean>(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show "slow import" hint after 3s of loading
  useEffect(() => {
    if (loading) {
      setSlowImport(false);
      slowTimerRef.current = setTimeout(() => setSlowImport(true), 3000);
    } else {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setSlowImport(false);
    }
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [loading]);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a recipe URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL (e.g., https://www.allrecipes.com/recipe/...)');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onImport(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import recipe');
      setLoading(false);
    }
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setUrl(e.target.value);
    setError('');
  };

  const handlePaste = async (): Promise<void> => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setUrl(text.trim());
        setError('');
      }
    } catch {
      // Clipboard access denied — silently ignore; user can paste manually
    }
  };

  const handleClose = (): void => {
    if (!loading) {
      window.scrollTo(0, 0);
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-8 sm:pt-16 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Import Recipe from URL
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Expectation note */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Paste a URL from a recipe website and we'll extract the details automatically.{' '}
              <span className="text-gray-500 dark:text-gray-500">You'll review and edit the recipe before it's saved to your library.</span>
            </p>

            {/* Supported sites collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowSites(v => !v)}
                className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showSites ? 'rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Supported sites
              </button>
              {showSites && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUPPORTED_SITES.map(site => (
                    <span
                      key={site}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full"
                    >
                      {site}
                    </span>
                  ))}
                  <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-0.5">+ many more</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="recipe-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipe URL
              </label>
              <div className="flex gap-2">
                <input
                  id="recipe-url"
                  type="url"
                  value={url}
                  onChange={handleUrlChange}
                  placeholder="https://www.allrecipes.com/recipe/..."
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={loading}
                  className="px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
                  title="Paste from clipboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Paste
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-4">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-3 text-gray-600 dark:text-gray-400">
                  {slowImport
                    ? 'Still working… First import may take up to 15 seconds'
                    : 'Importing recipe…'}
                </span>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Importing…' : 'Import Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ImportUrlModal;
