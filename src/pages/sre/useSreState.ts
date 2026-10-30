import { useCallback, useSyncExternalStore } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { CONFIG_SRE_PADRAO, type ConfigSre, type LinhaSre, type SnapshotSre } from "@/lib/sre/carrinho";

export interface CotacaoAtualSre {
  id: string | null; nome: string; cliente: string; codigo: string | null;
  gerenteConta?: string; especialistaBU?: string; salesforce?: string; arquitetoBU?: string;
}
export const COTACAO_SRE_VAZIA: CotacaoAtualSre = { id: null, nome: "", cliente: "", codigo: null, gerenteConta: "", especialistaBU: "", salesforce: "", arquitetoBU: "" };

export const SRE_BASE = "/observabilidade/consultivo-sre";

/** "Abrir em nova aba": a aba aberta com ?cotacao=<id> guarda o estado só nela (sessionStorage). */
const TAB_KEY = "sre.tab-cotacao";
export const SRE_TAB_COTACAO_ID: string | null = (() => {
  if (typeof window === "undefined" || !window.location.pathname.startsWith(SRE_BASE)) return null;
  try {
    const id = new URL(window.location.href).searchParams.get("cotacao")?.trim();
    if (id) { window.sessionStorage.setItem(TAB_KEY, id); return id; }
    return window.sessionStorage.getItem(TAB_KEY);
  } catch { return null; }
})();
export const urlNovaAbaSre = (id: string) => `${SRE_BASE}?cotacao=${encodeURIComponent(id)}`;

const tabCache = new Map<string, unknown>();
const tabListeners = new Set<() => void>();
function useTabState<T>(key: string, inicial: T): [T, (v: T | ((p: T) => T)) => void] {
  const k = `sre.tab.${key}`;
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

const useEstado: typeof useTabState = SRE_TAB_COTACAO_ID
  ? useTabState
  : ((key, inicial) => usePersistentState(`observabilidade.consultivo-sre.${key}`, inicial) as never);

/** Estado da cotação aberta no configurador de Pacotes Consultivos SRE. */
export function useSreState() {
  const [linhas, setLinhas] = useEstado<LinhaSre[]>("linhas", []);
  const [config, setConfig] = useEstado<ConfigSre>("config", CONFIG_SRE_PADRAO);
  const [atual, setAtual] = useEstado<CotacaoAtualSre>("atual", COTACAO_SRE_VAZIA);
  const [snapshot, setSnapshot] = useEstado<SnapshotSre | null>("snapshot", null);
  return { linhas, setLinhas, config: { ...CONFIG_SRE_PADRAO, ...config }, setConfig, atual, setAtual, snapshot, setSnapshot };
}
