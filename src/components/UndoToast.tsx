// src/components/UndoToast.tsx
import { useEffect, useState } from 'react';

export interface UndoAction {
  id: string;
  message: string;
  onUndo: () => void;
  duration?: number; // milliseconds, default 5000
}

interface UndoToastProps {
  action: UndoAction | null;
  onDismiss: () => void;
}

const DEFAULT_DURATION = 5000;

const UndoToast = ({ action, onDismiss }: UndoToastProps) => {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!action) {
      setProgress(100);
      setIsExiting(false);
      return;
    }

    const duration = action.duration || DEFAULT_DURATION;
    const startTime = Date.now();

    // Update progress bar
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    // Auto-dismiss after duration
    const timeout = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 200); // Wait for exit animation
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, [action, onDismiss]);

  const handleUndo = () => {
    if (action) {
      action.onUndo();
      setIsExiting(true);
      setTimeout(onDismiss, 200);
    }
  };

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  };

  if (!action) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`bg-gray-800 dark:bg-gray-700 text-white rounded-lg shadow-lg overflow-hidden transition-all duration-200 ${
          isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-sm">{action.message}</span>
          <button
            onClick={handleUndo}
            className="text-blue-400 hover:text-blue-300 font-medium text-sm uppercase tracking-wide"
          >
            Undo
          </button>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-300 ml-1"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-700 dark:bg-gray-600">
          <div
            className="h-full bg-blue-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default UndoToast;
