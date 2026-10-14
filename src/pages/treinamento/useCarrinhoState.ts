import { useCallback, useSyncExternalStore } from "react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { CONFIG_PADRAO, type ConfigCarrinho, type LinhaCarrinho } from "@/lib/treinamento/carrinho";

export interface CotacaoAtual {
  id: string | null; nome: string; cliente: string; codigo: string | null;
  gerenteConta?: string; especialistaBU?: string; salesforce?: string; arquitetoBU?: string;
}
export const COTACAO_VAZIA: CotacaoAtual = { id: null, nome: "", cliente: "", codigo: null, gerenteConta: "", especialistaBU: "", salesforce: "", arquitetoBU: "" };

/**
 * "Abrir em nova aba": a aba aberta com ?cotacao=<id> guarda o carrinho só nela (sessionStorage),
 * sem interferir na cotação aberta nas outras abas. Não usa o ?preset= do Smart ITO, que
 * sincroniza o payload do Smart ITO e corromperia a cotação de Treinamento.
 */
const TAB_KEY = "trn.tab-cotacao";
export const TAB_COTACAO_ID: string | null = (() => {
  if (typeof window === "undefined") return null;
  try {
    const id = new URL(window.location.href).searchParams.get("cotacao")?.trim();
    if (id) { window.sessionStorage.setItem(TAB_KEY, id); return id; }
    return window.sessionStorage.getItem(TAB_KEY);
  } catch { return null; }
})();

export const urlNovaAba = (id: string) => `/observabilidade/treinamento?cotacao=${encodeURIComponent(id)}`;

// Store compartilhado da aba: todas as telas (Configurador, Proposta, Resumo…) veem o mesmo estado.
const tabCache = new Map<string, unknown>();
const tabListeners = new Set<() => void>();
function useTabState<T>(key: string, inicial: T): [T, (v: T | ((p: T) => T)) => void] {
  const k = `trn.tab.${key}`;
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

const useEstado: typeof useTabState = TAB_COTACAO_ID
  ? useTabState
  : ((key, inicial) => usePersistentState(`observabilidade.treinamento.${key}`, inicial) as never);

/** Estado do carrinho do configurador (namespace observabilidade.treinamento.). */
export function useCarrinhoState() {
  const [linhas, setLinhas] = useEstado<LinhaCarrinho[]>("linhas", []);
  const [config, setConfig] = useEstado<ConfigCarrinho>("config", CONFIG_PADRAO);
  const [atual, setAtual] = useEstado<CotacaoAtual>("atual", COTACAO_VAZIA);
  return { linhas, setLinhas, config: { ...CONFIG_PADRAO, ...config }, setConfig, atual, setAtual };
}
