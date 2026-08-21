// useWizardDraft — persist/restore wizard form state to localStorage (the "Save Draft" action on
// the process pages). Returns the loaded draft (if any) plus save/clear helpers. Generic over the
// RHF form shape.
import { useCallback } from 'react';

const PREFIX = 'quralyst:wizard-draft:';

export function useWizardDraft<T>(key: string) {
  const storageKey = `${PREFIX}${key}`;

  const load = useCallback((): T | null => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const save = useCallback(
    (data: T) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        /* storage full / unavailable — drafts are best-effort */
      }
    },
    [storageKey],
  );

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  return { load, save, clear };
}
