import { useState, useEffect, Dispatch, SetStateAction } from "react";

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
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) {
        const userDefault = readUserDefault<T>(key);
        return userDefault !== undefined ? userDefault : initial;
      }
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
