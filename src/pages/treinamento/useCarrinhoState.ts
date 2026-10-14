import { useCallback, useState } from "react";
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

function useTabState<T>(key: string, inicial: T): [T, (v: T | ((p: T) => T)) => void] {
  const k = `trn.tab.${key}`;
  const [v, setV] = useState<T>(() => {
    try { const s = window.sessionStorage.getItem(k); return s ? (JSON.parse(s) as T) : inicial; } catch { return inicial; }
  });
  const set = useCallback((n: T | ((p: T) => T)) => {
    setV((p) => {
      const val = typeof n === "function" ? (n as (p: T) => T)(p) : n;
      try { window.sessionStorage.setItem(k, JSON.stringify(val)); } catch { /* ignore */ }
      return val;
    });
  }, [k]);
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
