import { useEffect, useState, useCallback } from "react";
import { DEFAULT_COMISSAO_TIERS, comissaoFromRent, type ComissaoTier } from "@/lib/comissaoRentabilidade";

export interface ProfFinState {
  pisPerc: number;
  cofinsPerc: number;
  issPerc: number;
  irpjCsllPerc: number;
  encFinancPerc: number;
  lucroPerc: number;
  comissaoPerc: number;
  custoExemplo: number;
  encargosPerc: number;
  overheadPerc: number;
  horasMensais: number;
}

export const PROF_FIN_DEFAULTS: ProfFinState = {
  pisPerc: 1.65,
  cofinsPerc: 7.6,
  issPerc: 2.5,
  irpjCsllPerc: 11,
  encFinancPerc: 0,
  lucroPerc: 20,
  comissaoPerc: 7.32,
  custoExemplo: 10000,
  encargosPerc: 68,
  overheadPerc: 15,
  horasMensais: 176,
};

const STATE_KEY = "prof.fin.state.v1";
const TIERS_KEY = "prof.fin.comissaoTiers.v1";

function loadLs<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback) as T;
    }
    if (parsed && typeof parsed === "object") {
      return { ...(fallback as any), ...parsed } as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
function saveLs(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export interface ProfComposicao {
  pis: number; cofins: number; iss: number;
  irpjCsll: number; encFinanc: number;
  comissao: number; lucro: number;
  precoVenda: number;
  totalEncargosPerc: number;
  custoPerc: number;
}

function computeComposicao(state: ProfFinState, custo: number): ProfComposicao {
  const totalEncargosPerc =
    state.pisPerc + state.cofinsPerc + state.issPerc +
    state.irpjCsllPerc + state.encFinancPerc +
    state.comissaoPerc + state.lucroPerc;
  const denom = 1 - Math.min(99.999, totalEncargosPerc) / 100;
  const precoVenda = denom > 0 ? custo / denom : 0;
  const pct = (p: number) => (precoVenda * p) / 100;
  return {
    pis: pct(state.pisPerc),
    cofins: pct(state.cofinsPerc),
    iss: pct(state.issPerc),
    irpjCsll: pct(state.irpjCsllPerc),
    encFinanc: pct(state.encFinancPerc),
    comissao: pct(state.comissaoPerc),
    lucro: pct(state.lucroPerc),
    precoVenda,
    totalEncargosPerc,
    custoPerc: precoVenda > 0 ? (custo / precoVenda) * 100 : 0,
  };
}

export function useProfFinanceiro(custoBase?: number) {
  const [state, setState] = useState<ProfFinState>(() => loadLs(STATE_KEY, PROF_FIN_DEFAULTS));
  const [comissaoTiers, setComissaoTiersState] = useState<ComissaoTier[]>(() => loadLs(TIERS_KEY, DEFAULT_COMISSAO_TIERS));

  useEffect(() => { saveLs(STATE_KEY, state); }, [state]);
  useEffect(() => { saveLs(TIERS_KEY, comissaoTiers); }, [comissaoTiers]);

  // Sync comissão com rentabilidade
  useEffect(() => {
    const next = comissaoFromRent(state.lucroPerc || 0, comissaoTiers);
    if (Math.abs((state.comissaoPerc || 0) - next) > 1e-6) {
      setState((s) => ({ ...s, comissaoPerc: next }));
    }
  }, [state.lucroPerc, comissaoTiers, state.comissaoPerc]);

  const update = useCallback(<K extends keyof ProfFinState>(key: K, value: ProfFinState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);
  const setComissaoTiers = useCallback((t: ComissaoTier[]) => setComissaoTiersState(t), []);

  const custo = typeof custoBase === "number" ? custoBase : state.custoExemplo;
  const composicaoPreco = computeComposicao(state, custo);

  return {
    state,
    setState,
    update,
    comissaoTiers,
    setComissaoTiers,
    results: { composicaoPreco, custoTotalOperacao: custo },
  };
}

export function markupDivisorPctProf(s: ProfFinState): number {
  return s.pisPerc + s.cofinsPerc + s.issPerc + s.irpjCsllPerc + s.encFinancPerc + s.comissaoPerc + s.lucroPerc;
}