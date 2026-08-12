// ============================================================
// Fonte ÚNICA dos totalizadores de venda por camada.
//
// Todas as telas (Camadas de Oferta, Relatório de Proposição,
// Resumo de Cotação e Apresentação .pptx) devem consumir estes
// valores para que a soma das camadas bata EXATAMENTE com o preço
// de venda mensal calculado pelo markup divisor
// (`results.precoVendaMensal`).
//
// Regra de fechamento: qualquer parcela de custo presente em
// `results.custoTotalOperacao` que não tenha sido atribuída a uma
// camada específica (ex.: custo unificado de monitoramento por UM
// quando não há Monitor/Flow ativos) é lançada como `residual` na
// camada ativa mais baixa — garantindo soma == total.
// ============================================================
import type { ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import type { ExtrasOperacionais } from "./extrasOperacionais";

export type TierKey = "Monitor" | "Flow" | "Operation" | "Performance" | "Enterprise";

export const TIER_ORDER: Record<TierKey, number> = {
  Monitor: 1,
  Flow: 2,
  Operation: 3,
  Performance: 4,
  Enterprise: 5,
};

/**
 * Camadas que funcionam como "bucket" de exibição/cobrança, em ordem.
 * Quando Smart Flow está ativo ele consolida o Smart Monitor — nesse caso
 * Monitor deixa de ser um bucket e tudo que seria dele cai em Flow.
 */
export function activeTierBuckets(state: ITSMState): TierKey[] {
  const buckets: Array<[boolean, TierKey]> = [
    [!!state.tierMonitor && !state.tierFlow, "Monitor"],
    [!!state.tierFlow, "Flow"],
    [!!state.tierOperation, "Operation"],
    [!!state.tierPerformance, "Performance"],
    [!!state.tierEnterprise, "Enterprise"],
  ];
  return buckets
    .filter(([active]) => active)
    .map(([, t]) => t)
    .sort((a, b) => TIER_ORDER[a] - TIER_ORDER[b]);
}

/**
 * Bucket cumulativo de uma rotina gerencial: a camada ativa mais baixa cuja
 * ordem seja >= à oferta vinculada da rotina. `null` = não cobrada.
 */
export function gerencialBucket(state: ITSMState, oferta: TierKey): TierKey | null {
  const min = TIER_ORDER[oferta] ?? 1;
  for (const t of activeTierBuckets(state)) {
    if (TIER_ORDER[t] >= min) return t;
  }
  return null;
}

export interface TierPricing {
  fatorVenda: number;
  custo: {
    monitor: number;
    flow: number;
    operationBase: number;
    endpointTooling: number;
    fieldService: number;
    gmudOperation: number;
    gmudPerformance: number;
    performanceN3: number;
    gerenciais: number;
    residual: number;
    residualBucket: TierKey | null;
    operation: number;
    performance: number;
    total: number;
  };
  venda: {
    monitor: number;
    flow: number;
    operation: number;
    performance: number;
    fieldService: number;
    endpointTooling: number;
    gmudOperation: number;
    gmudPerformance: number;
    gerenciais: number;
    residual: number;
    /** Soma exata das camadas == results.precoVendaMensal */
    total: number;
  };
}

export function computeTierPricing(
  state: ITSMState,
  results: ITSMResults,
  extras: ExtrasOperacionais,
): TierPricing {
  const custoTotal = results.custoTotalOperacao || 0;
  const fatorVenda =
    custoTotal > 0 && results.precoVendaMensal > 0
      ? results.precoVendaMensal / custoTotal
      : (() => {
          const enc =
            (state.pisPerc || 0) + (state.cofinsPerc || 0) + (state.issPerc || 0) +
            (state.comissaoPerc || 0) + (state.irpjCsllPerc || 0) +
            (state.encFinancPerc || 0) + (state.lucroPerc || 0);
          return enc < 100 ? 100 / (100 - enc) : 1;
        })();

  const monitor = state.tierMonitor ? results.smartMonitor?.total || 0 : 0;
  const flow = state.tierFlow ? results.smartFlow?.total || 0 : 0;
  const operationBase = state.tierOperation
    ? (results.custoN1 || 0) + (results.custoN2 || 0) +
      (state.tierPerformance ? 0 : results.custoN3 || 0)
    : 0;
  const gmudOperation = state.tierOperation ? extras.custoGmudOperation || 0 : 0;
  const gmudPerformance = state.tierPerformance ? extras.custoGmudPerformance || 0 : 0;
  const performanceN3 = state.tierPerformance ? results.custoN3 || 0 : 0;
  const gerenciais = extras.custoRotinasGerenciais || 0;

  const atribuido =
    monitor + flow + operationBase +
    gmudOperation + gmudPerformance + performanceN3 + gerenciais;
  const residual = Math.max(0, custoTotal - atribuido);
  const buckets = activeTierBuckets(state);
  const residualBucket = buckets.length > 0 ? buckets[0] : null;

  const resMonitor = residualBucket === "Monitor" ? residual : 0;
  const resFlow = residualBucket === "Flow" ? residual : 0;
  const resOperation = residualBucket === "Operation" ? residual : 0;
  const resPerformance =
    residualBucket === "Performance" || residualBucket === "Enterprise" ? residual : 0;

  const custoMonitor = monitor + resMonitor;
  const custoFlow = flow + resFlow;
  const custoOperation =
    operationBase + endpointTooling + fieldService + gmudOperation + resOperation;
  const custoPerformance = performanceN3 + gmudPerformance + resPerformance;

  const sell = (c: number) => c * fatorVenda;

  return {
    fatorVenda,
    custo: {
      monitor,
      flow,
      operationBase,
      endpointTooling,
      fieldService,
      gmudOperation,
      gmudPerformance,
      performanceN3,
      gerenciais,
      residual,
      residualBucket,
      operation: custoOperation,
      performance: custoPerformance,
      total: custoMonitor + custoFlow + custoOperation + custoPerformance + gerenciais,
    },
    venda: {
      monitor: sell(custoMonitor),
      flow: sell(custoFlow),
      operation: sell(custoOperation),
      performance: sell(custoPerformance),
      fieldService: sell(fieldService),
      endpointTooling: sell(endpointTooling),
      gmudOperation: sell(gmudOperation),
      gmudPerformance: sell(gmudPerformance),
      gerenciais: sell(gerenciais),
      residual: sell(residual),
      total: sell(custoMonitor + custoFlow + custoOperation + custoPerformance + gerenciais),
    },
  };
}
