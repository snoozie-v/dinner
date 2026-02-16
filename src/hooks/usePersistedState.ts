import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import { storage, type StorageKey } from '../utils/storage';

export function usePersistedState<T>(
  key: StorageKey,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => storage.get(key, defaultValue));

  useEffect(() => {
    storage.set(key, value);
  }, [key, value]);

  return [value, setValue];
}
