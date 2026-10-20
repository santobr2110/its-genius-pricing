import { useCallback, useSyncExternalStore } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { CONFIG_BS_PADRAO, type ConfigBS, type LinhaBS, type SnapshotBS } from "@/lib/bodyshop/carrinho";

export interface CotacaoAtualBS {
  id: string | null; nome: string; cliente: string; codigo: string | null;
  gerenteConta?: string; especialistaBU?: string; salesforce?: string; arquitetoBU?: string;
}
export const COTACAO_BS_VAZIA: CotacaoAtualBS = { id: null, nome: "", cliente: "", codigo: null, gerenteConta: "", especialistaBU: "", salesforce: "", arquitetoBU: "" };

export const BS_BASE = "/profissionais-alocados";

/** "Abrir em nova aba": a aba aberta com ?cotacao=<id> guarda o estado só nela (sessionStorage). */
const TAB_KEY = "bs.tab-cotacao";
export const BS_TAB_COTACAO_ID: string | null = (() => {
  if (typeof window === "undefined" || !window.location.pathname.startsWith(BS_BASE)) return null;
  try {
    const id = new URL(window.location.href).searchParams.get("cotacao")?.trim();
    if (id) { window.sessionStorage.setItem(TAB_KEY, id); return id; }
    return window.sessionStorage.getItem(TAB_KEY);
  } catch { return null; }
})();
export const urlNovaAbaBS = (id: string) => `${BS_BASE}?cotacao=${encodeURIComponent(id)}`;

const tabCache = new Map<string, unknown>();
const tabListeners = new Set<() => void>();
function useTabState<T>(key: string, inicial: T): [T, (v: T | ((p: T) => T)) => void] {
  const k = `bs.tab.${key}`;
  const ler = useCallback((): T => {
    if (!tabCache.has(k)) {
      try { const s = window.sessionStorage.getItem(k); tabCache.set(k, s ? JSON.parse(s) : inicial); } catch { tabCache.set(k, inicial); }
    }
    return tabCache.get(k) as T;
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = useSyncExternalStore((cb) => { tabListeners.add(cb); return () => { tabListeners.delete(cb); }; }, ler, ler);
  const set = useCallback((n: T | ((p: T) => T)) => {
    const val = typeof n === "function" ? (n as (p: T) => T)(ler()) : n;
    tabCache.set(k, val);
    try { window.sessionStorage.setItem(k, JSON.stringify(val)); } catch { /* ignore */ }
    tabListeners.forEach((l) => l());
  }, [k, ler]);
  return [v, set];
}

const useEstado: typeof useTabState = BS_TAB_COTACAO_ID
  ? useTabState
  : ((key, inicial) => usePersistentState(`ito.bodyshop.${key}`, inicial) as never);

/** Estado da cotação aberta no configurador BodyShop. */
export function useBSState() {
  const [linhas, setLinhas] = useEstado<LinhaBS[]>("linhas", []);
  const [config, setConfig] = useEstado<ConfigBS>("config", CONFIG_BS_PADRAO);
  const [atual, setAtual] = useEstado<CotacaoAtualBS>("atual", COTACAO_BS_VAZIA);
  const [snapshot, setSnapshot] = useEstado<SnapshotBS | null>("snapshot", null);
  return { linhas, setLinhas, config: { ...CONFIG_BS_PADRAO, ...config }, setConfig, atual, setAtual, snapshot, setSnapshot };
}
