"use client";

import { useCallback, useEffect, useState } from "react";

export function usePersistentSelection(key: string): [string | null, (id: string) => void] {
  const storageKey = `desrow.selection.${key}`;
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    try {
      setValue(window.localStorage.getItem(storageKey));
    } catch {
      setValue(null);
    }
  }, [storageKey]);

  const update = useCallback(
    (id: string) => {
      setValue(id);
      try {
        window.localStorage.setItem(storageKey, id);
      } catch {
        // Selection is a convenience, not a requirement.
      }
    },
    [storageKey],
  );

  return [value, update];
}
