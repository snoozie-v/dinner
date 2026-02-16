import type { PantryStaple } from '../types';
import type { UndoAction } from '../components/UndoToast';
import { STORAGE_KEYS } from '../utils/storage';
import { usePersistedState } from './usePersistedState';

export const usePantryStaples = (
  setUndoAction: (action: UndoAction | null) => void,
) => {
  const [pantryStaples, setPantryStaples] = usePersistedState<PantryStaple[]>(
    STORAGE_KEYS.PANTRY_STAPLES, []
  );

  const addPantryStaple = (name: string, unit: string): void => {
    const key = `${name.toLowerCase()}|${unit.toLowerCase()}`;
    if (!pantryStaples.some(s => s.key === key)) {
      setPantryStaples(prev => [...prev, { name, unit, key }]);
    }
  };

  const removePantryStaple = (key: string): void => {
    const staple = pantryStaples.find(s => s.key === key);
    if (!staple) return;

    setPantryStaples(prev => prev.filter(s => s.key !== key));

    setUndoAction({
      id: `pantry-${Date.now()}`,
      message: `Removed "${staple.name}" from pantry`,
      onUndo: () => {
        setPantryStaples(prev => [...prev, staple]);
      },
    });
  };

  const importStaples = (staples: PantryStaple[], mode: 'overwrite' | 'merge'): void => {
    if (mode === 'overwrite') {
      setPantryStaples(staples);
    } else {
      setPantryStaples(prev => {
        const existingKeys = new Set(prev.map(s => s.key));
        const newStaples = staples.filter(s => !existingKeys.has(s.key));
        return [...prev, ...newStaples];
      });
    }
  };

  return { pantryStaples, addPantryStaple, removePantryStaple, importStaples };
};
