import { useState, useEffect, useCallback, useRef, Dispatch, SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SMART_ITO_NS } from "@/lib/offerings";

export const PERSISTENT_STATE_RESTORED_EVENT = "itsm:persistent-state-restored";

const cloudValueCache = new Map<string, unknown>();
const cloudHydrationPromises = new Map<string, Promise<unknown | undefined>>();
const migratedKeys = new Set<string>();

/**
 * Aplica o namespace da oferta corrente (hoje: Smart ITO) sobre uma chave bruta.
 * Toda chave começando com `ito.smart-ito.`, `datacenter.`, `cloud.` ou
 * `observabilidade.` é considerada já namespeada e passa intacta.
 */
function namespaceKey(rawKey: string): string {
  if (
    rawKey.startsWith("ito.") ||
    rawKey.startsWith("datacenter.") ||
    rawKey.startsWith("cloud.") ||
    rawKey.startsWith("observabilidade.")
  ) {
    return rawKey;
  }
  return SMART_ITO_NS + rawKey;
}

/** Migração one-shot da chave legada (sem namespace) para a chave namespeada. */
function migrateLegacyLocalKey(legacyKey: string, namespacedKey: string) {
  if (typeof window === "undefined") return;
  if (legacyKey === namespacedKey) return;
  if (migratedKeys.has(namespacedKey)) return;
  migratedKeys.add(namespacedKey);
  try {
    const legacy = window.localStorage.getItem(legacyKey);
    if (legacy == null) return;
    if (window.localStorage.getItem(namespacedKey) != null) return;
    window.localStorage.setItem(namespacedKey, legacy);
    // Não removemos o legado: mantemos como fallback caso o usuário volte para
    // uma versão antiga do app. Pode ser limpo manualmente depois.
  } catch {
    /* ignore */
  }
}

function cacheKey(uid: string, key: string) {
  return `${uid}:${key}`;
}

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

async function readCloudValue(uid: string, key: string, legacyKey: string): Promise<unknown | undefined> {
  const ck = cacheKey(uid, key);
  if (cloudValueCache.has(ck)) return cloudValueCache.get(ck);
  const pending = cloudHydrationPromises.get(ck);
  if (pending) return pending;

  const promise = (async () => {
    const { data: own } = await supabase
      .from("user_app_state")
      .select("value")
      .eq("user_id", uid)
      .eq("key", key)
      .maybeSingle();

    if (own?.value !== undefined && own?.value !== null) {
      cloudValueCache.set(ck, own.value);
      return own.value;
    }

    // Migração one-shot da chave legada (sem namespace) para a chave namespeada.
    if (legacyKey !== key) {
      const { data: legacy } = await supabase
        .from("user_app_state")
        .select("value")
        .eq("user_id", uid)
        .eq("key", legacyKey)
        .maybeSingle();
      if (legacy?.value !== undefined && legacy?.value !== null) {
        await supabase
          .from("user_app_state")
          .upsert(
            { user_id: uid, key, value: legacy.value as never },
            { onConflict: "user_id,key" },
          );
        cloudValueCache.set(ck, legacy.value);
        return legacy.value;
      }
    }

    const { data: def } = await supabase
      .from("app_defaults")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    const value = def?.value ?? undefined;
    cloudValueCache.set(ck, value);
    return value;
  })().finally(() => {
    cloudHydrationPromises.delete(ck);
  });

  cloudHydrationPromises.set(ck, promise);
  return promise;
}

function saveCloudValue(uid: string, key: string, value: unknown) {
  cloudValueCache.set(cacheKey(uid, key), value);
  return supabase
    .from("user_app_state")
    .upsert({ user_id: uid, key, value: value as never }, { onConflict: "user_id,key" })
    .then(() => undefined);
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
  rawKey: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const key = namespaceKey(rawKey);
  const legacyKey = rawKey;
  // Migra qualquer valor antigo do localStorage para a nova chave namespeada.
  if (typeof window !== "undefined" && legacyKey !== key) {
    migrateLegacyLocalKey(legacyKey, key);
  }

  const [state, setStateBase] = useState<T>(() => {
    const local = readLocal<T>(key);
    return mergeWithInitial(local, initial);
  });

  const initialRef = useRef(initial);
  initialRef.current = initial;
  const stateRef = useRef(state);
  stateRef.current = state;
  const localVersionRef = useRef(0);
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

      const local = readLocal<T>(key);
      if (local !== undefined) {
        const mergedLocal = mergeWithInitial(local, initialRef.current);
        cloudValueCache.set(cacheKey(uid, key), mergedLocal);
        hydratedRef.current = true;
        if (!isEqualValue(stateRef.current, mergedLocal)) {
          setStateBase(mergedLocal);
          stateRef.current = mergedLocal;
        }
        saveCloudValue(uid, key, mergedLocal);
        return;
      }

      const versionAtStart = localVersionRef.current;
      const cloudValue = await readCloudValue(uid, key, legacyKey);

      if (cancelled) return;

      if (versionAtStart !== localVersionRef.current) {
        hydratedRef.current = true;
        const latestLocal = readLocal<T>(key);
        if (latestLocal !== undefined) {
          saveCloudValue(uid, key, latestLocal);
        }
        return;
      }

      if (cloudValue !== undefined && cloudValue !== null) {
        commitExternalValue(cloudValue);
        hydratedRef.current = true;
        return;
      }

      // 3) nada na nuvem — se há valor local diferente do initial, faz seed
      hydratedRef.current = true;
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

  const setState: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      setStateBase((prev) => {
        const next =
          typeof value === "function"
            ? (value as (prevState: T) => T)(prev)
            : value;
        const merged = mergeWithInitial(next, initialRef.current);
        if (isEqualValue(prev, merged)) return prev;

        localVersionRef.current += 1;
        stateRef.current = merged;
        writeLocal(key, merged);
        const uidForCache = userIdRef.current;
        if (uidForCache) cloudValueCache.set(cacheKey(uidForCache, key), merged);

        // debounce cloud write
        const uid = uidForCache;
        if (uid && hydratedRef.current) {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => {
            saveCloudValue(uid, key, merged);
          }, 600);
        }
        return merged;
      });
    },
    [key],
  );

  return [state, setState];
}
