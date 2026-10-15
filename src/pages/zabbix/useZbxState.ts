import { useCallback, useSyncExternalStore } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { CONFIG_ZBX_PADRAO, type ConfigZbx, type LinhaZbx, type SnapshotZbx } from "@/lib/zabbix/carrinho";

export interface CotacaoAtualZbx {
  id: string | null; nome: string; cliente: string; codigo: string | null;
  gerenteConta?: string; especialistaBU?: string; salesforce?: string; arquitetoBU?: string;
}
export const COTACAO_ZBX_VAZIA: CotacaoAtualZbx = { id: null, nome: "", cliente: "", codigo: null, gerenteConta: "", especialistaBU: "", salesforce: "", arquitetoBU: "" };

export const ZBX_BASE = "/observabilidade/subscricoes-zabbix";

/** "Abrir em nova aba": a aba aberta com ?cotacao=<id> guarda o estado só nela (sessionStorage). */
const TAB_KEY = "zbx.tab-cotacao";
export const ZBX_TAB_COTACAO_ID: string | null = (() => {
  if (typeof window === "undefined" || !window.location.pathname.startsWith(ZBX_BASE)) return null;
  try {
    const id = new URL(window.location.href).searchParams.get("cotacao")?.trim();
    if (id) { window.sessionStorage.setItem(TAB_KEY, id); return id; }
    return window.sessionStorage.getItem(TAB_KEY);
  } catch { return null; }
})();
export const urlNovaAbaZbx = (id: string) => `${ZBX_BASE}?cotacao=${encodeURIComponent(id)}`;

const tabCache = new Map<string, unknown>();
const tabListeners = new Set<() => void>();
function useTabState<T>(key: string, inicial: T): [T, (v: T | ((p: T) => T)) => void] {
  const k = `zbx.tab.${key}`;
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

const useEstado: typeof useTabState = ZBX_TAB_COTACAO_ID
  ? useTabState
  : ((key, inicial) => usePersistentState(`observabilidade.zabbix.${key}`, inicial) as never);

/** Estado da cotação aberta no configurador de Subscrições Zabbix. */
export function useZbxState() {
  const [linhas, setLinhas] = useEstado<LinhaZbx[]>("linhas", []);
  const [config, setConfig] = useEstado<ConfigZbx>("config", CONFIG_ZBX_PADRAO);
  const [atual, setAtual] = useEstado<CotacaoAtualZbx>("atual", COTACAO_ZBX_VAZIA);
  const [snapshot, setSnapshot] = useEstado<SnapshotZbx | null>("snapshot", null);
  return { linhas, setLinhas, config: { ...CONFIG_ZBX_PADRAO, ...config }, setConfig, atual, setAtual, snapshot, setSnapshot };
}
