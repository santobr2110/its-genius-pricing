import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PERSISTENT_STATE_RESTORED_EVENT = "itsm:persistent-state-restored";

export function notifyPersistentStateRestored(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PERSISTENT_STATE_RESTORED_EVENT, { detail: { key, value } }),
  );
}

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

function readLocal<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function isEqualValue<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * State persistente sincronizado com Lovable Cloud (tabelas
 * `user_app_state` por usuário e `app_defaults` compartilhada).
 *
 * - Render inicial: usa cache local (localStorage) para evitar flash.
 * - Em background: busca o valor da nuvem (próprio usuário → defaults → initial)
 *   e, se diferente, atualiza o estado.
 * - Mudanças locais: gravam imediatamente em localStorage e fazem upsert
 *   debounced (≈600 ms) em `user_app_state` quando há usuário autenticado.
 * - Quando o usuário faz login pela primeira vez e já existe valor local
 *   (mas nada na nuvem), faz seed local → nuvem.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setStateBase] = useState<T>(() => {
    const local = readLocal<T>(key);
    return mergeWithInitial(local, initial);
  });

  const initialRef = useRef(initial);
  initialRef.current = initial;
  const stateRef = useRef(state);
  stateRef.current = state;
  const hydratedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitExternalValue = useCallback((value: unknown) => {
    const merged = mergeWithInitial(value as T, initialRef.current);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!isEqualValue(stateRef.current, merged)) {
      setStateBase(merged);
      stateRef.current = merged;
    }
    writeLocal(key, merged);
  }, [key]);

  // Hydrate from cloud + react to auth changes.
  useEffect(() => {
    let cancelled = false;

    const hydrate = async (uid: string | null) => {
      userIdRef.current = uid;

      if (!uid) {
        hydratedRef.current = true;
        return;
      }

      // 1) tenta valor do próprio usuário
      const { data: own } = await supabase
        .from("user_app_state")
        .select("value")
        .eq("user_id", uid)
        .eq("key", key)
        .maybeSingle();

      if (cancelled) return;

      if (own?.value !== undefined && own?.value !== null) {
        commitExternalValue(own.value);
        hydratedRef.current = true;
        return;
      }

      // 2) fallback: defaults compartilhados
      const { data: def } = await supabase
        .from("app_defaults")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (cancelled) return;

      if (def?.value !== undefined && def?.value !== null) {
        const merged = mergeWithInitial(def.value as T, initialRef.current);
        commitExternalValue(def.value);
        hydratedRef.current = true;
        // Seed: salva como estado próprio do usuário para futuras edições
        supabase
          .from("user_app_state")
          .upsert({ user_id: uid, key, value: merged as unknown as never }, { onConflict: "user_id,key" })
          .then(() => undefined);
        return;
      }

      // 3) nada na nuvem — se há valor local diferente do initial, faz seed
      hydratedRef.current = true;
      const local = readLocal<T>(key);
      if (local !== undefined) {
        supabase
          .from("user_app_state")
          .upsert({ user_id: uid, key, value: local as unknown as never }, { onConflict: "user_id,key" })
          .then(() => undefined);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      hydrate(session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore noisy events that don't change the user (token refresh, focus, user metadata updates).
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      const newUid = session?.user?.id ?? null;
      if (newUid === userIdRef.current) return;
      hydratedRef.current = false;
      hydrate(newUid);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, commitExternalValue]);

  useEffect(() => {
    const onRestored = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string; value?: unknown }>).detail;
      if (detail?.key !== key) return;
      commitExternalValue(detail.value);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== key || event.newValue == null) return;
      try {
        commitExternalValue(JSON.parse(event.newValue));
      } catch {
        /* ignore */
      }
    };

    window.addEventListener(PERSISTENT_STATE_RESTORED_EVENT, onRestored);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PERSISTENT_STATE_RESTORED_EVENT, onRestored);
      window.removeEventListener("storage", onStorage);
    };
  }, [key, commitExternalValue]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const setState: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      setStateBase((prev) => {
        const next =
          typeof value === "function"
            ? (value as (prevState: T) => T)(prev)
            : value;
        const merged = mergeWithInitial(next, initialRef.current);
        if (isEqualValue(prev, merged)) return prev;

        stateRef.current = merged;
        writeLocal(key, merged);

        // debounce cloud write
        const uid = userIdRef.current;
        if (uid && hydratedRef.current) {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            supabase
              .from("user_app_state")
              .upsert(
                { user_id: uid, key, value: merged as unknown as never },
                { onConflict: "user_id,key" },
              )
              .then(() => undefined);
          }, 600);
        }
        return merged;
      });
    },
    [key],
  );

  return [state, setState];
}
