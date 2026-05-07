import { useState, useEffect, useCallback, Dispatch, SetStateAction } from "react";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeWithInitial<T>(value: T | undefined, initial: T): T {
  if (value === undefined) return initial;
  if (isRecord(initial) && isRecord(value)) {
    return { ...initial, ...value } as T;
  }
  return value;
}

/**
 * Lê um snapshot salvo como "padrão do usuário" para a chave informada.
 * Usado como fallback quando ainda não há valor corrente em `key`.
 */
function readUserDefault<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(`${key}:default`);
    if (raw == null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/**
 * useState com persistência em localStorage.
 * Carrega o valor salvo (se existir) ao montar e grava sempre que mudar.
 * Se não houver valor salvo, usa o "padrão do usuário" (`<key>:default`)
 * antes de cair para o `initial` hardcoded.
 */
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setStateBase] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) {
        const userDefault = readUserDefault<T>(key);
        return mergeWithInitial(userDefault, initial);
      }
      return mergeWithInitial(JSON.parse(raw) as T, initial);
    } catch {
      return initial;
    }
  });

  const setState: Dispatch<SetStateAction<T>> = useCallback((value) => {
    setStateBase((prev) => {
      const next = typeof value === "function" ? (value as (prevState: T) => T)(prev) : value;
      return mergeWithInitial(next, initial);
    });
  }, [initial]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore quota / serialization errors
    }
  }, [key, state]);

  return [state, setState];
}
