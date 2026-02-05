import { useState, useCallback } from 'react';
import type { UndoAction } from '../components/UndoToast';

export const useUndo = () => {
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  const dismissUndo = useCallback(() => {
    setUndoAction(null);
  }, []);

  return { undoAction, setUndoAction, dismissUndo };
};
