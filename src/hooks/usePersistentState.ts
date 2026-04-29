import { useState, useEffect, Dispatch, SetStateAction } from "react";

/**
 * useState com persistência em localStorage.
 * Carrega o valor salvo (se existir) ao montar e grava sempre que mudar.
 */
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore quota / serialization errors
    }
  }, [key, state]);

  return [state, setState];
}
