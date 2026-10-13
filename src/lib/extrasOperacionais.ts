import { composicaoSmartITO, percsFromState } from "@/lib/pricing/cascata";
import type { ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import {
  type Rotina,
  type ComplexFlags,
  type InventarioCounts,
  rotinaMultiplicador,
  COMPLEX_FLAG_KEYS,
  normalizeLegacyRotina,
} from "@/data/rotinas";
import { type Gmud, bucketGmuds, computeGmud } from "@/data/gmuds";
import { gerencialBucket, type TierKey } from "./tierPricing";

// Mesma normalização aplicada em SmartTiersPanel/Detalhamento para rotinas
// de Sistema Operacional (tratadas como unitárias por ambiente) +
// migração de rotinas legadas com oferta "Todos".
function normalizeOsRotina(rRaw: Rotina): Rotina {
  const r = normalizeLegacyRotina(rRaw);
  const grupo = r.grupo.toLowerCase();
  const isOs = grupo.includes("sistema operacional");
  if (!isOs) return r;
  return { ...r, ativo: "Servidor", unidade: "Servidor (Ambiente)", abrangencia: "Ambiente" };
}

export interface ExtrasOperacionais {
  custoGmudOperation: number;
  custoGmudPerformance: number;
  custoRotinasGerenciais: number;
  custoTotal: number;
}

/**
 * Calcula os custos "extras" que NÃO entram em useITSMCalculator.custoTotalOperacao
 * mas que compõem o valor de venda das camadas Smart e do Relatório de Proposição:
 *  - GMUDs (Operation + Performance)
 *  - Rotinas Gerenciais Selbetti — apenas quando a oferta vinculada está ativa
 *
 * Rotinas Operation/Performance/Monitor/Flow consomem horas do pool N3 já
 * pago (custoN3) — não são cobradas em separado, então NÃO entram aqui.
 */
export function computeExtrasOperacionais(
  state: ITSMState,
  results: ITSMResults,
  rotinas: Rotina[],
  gmuds: Gmud[],
): ExtrasOperacionais {
  const inv: InventarioCounts = {
    qtdServidores: state.qtdServidores,
    qtdAtivosRede: state.qtdAtivosRede,
    qtdBancosDados: state.qtdBancosDados,
    qtdSistemas: state.qtdSistemas,
  };
  const complexFlags = COMPLEX_FLAG_KEYS.reduce((acc, k) => {
    acc[k] = (state as unknown as Record<string, boolean>)[k] || false;
    return acc;
  }, {} as ComplexFlags);

  // Custo médio por chamado de rotina ponderado pela escala de rotinas
  const custoChN3Mix = state.tempoMedioChamadoN3 * state.valorHoraN3;
  const somaRotina = (state.percRotinaN1 + state.percRotinaN2 + state.percRotinaN3) || 100;
  const wRotN1 = state.percRotinaN1 / somaRotina;
  const wRotN2 = state.percRotinaN2 / somaRotina;
  const wRotN3 = state.percRotinaN3 / somaRotina;
  const custoPorChamadoMix =
    wRotN1 * results.custoPorChamadoN1 +
    wRotN2 * results.custoPorChamadoN2 +
    wRotN3 * custoChN3Mix;

  const fatorAutoPerc =
    Math.max(0, Math.min(100, state.percCustoRotinaAutomatizada ?? 100)) / 100;

  // Rotinas gerenciais são CUMULATIVAS: uma gerencial vinculada a Monitor
  // continua sendo executada (e cobrada) quando apenas Flow/Operation/
  // Performance estão ativos. Usa exatamente o mesmo bucket dos relatórios.
  const gerencialCobrada = (oferta: Rotina["oferta"]) =>
    gerencialBucket(state, (oferta as TierKey) ?? "Operation") !== null;

  // === Rotinas Gerenciais Selbetti ===
  // Só são cobradas quando a camada vinculada na própria rotina está ativa.
  let custoRotinasGerenciais = 0;
  for (const rRaw of rotinas) {
    const r = normalizeLegacyRotina(rRaw);
    if (!r.gerencial || !gerencialCobrada(r.oferta)) continue;
    const rotina = normalizeOsRotina(rRaw);
    const mult = rotinaMultiplicador(rotina, inv, complexFlags);
    const demanda = r.chamadosMes * mult;
    if (demanda <= 0) continue;
    const fa = r.automacao ? fatorAutoPerc : 1;
    const horas = r.horasExecucao ?? 1;
    custoRotinasGerenciais += demanda * horas * state.valorHoraN3 * fa;
  }

  // === GMUDs ===
  const gmudInput = {
    custoPorChamadoN2: results.custoPorChamadoN2,
    tempoMedioChamadoN3: state.tempoMedioChamadoN3,
    valorHoraN3: state.valorHoraN3,
    percN2: state.percGmudN2 ?? 70,
    percN3: state.percGmudN3 ?? 30,
  };
  const buckets = bucketGmuds(gmuds);
  const sumGmud = (lista: Gmud[]) =>
    lista.reduce((acc, g) => acc + computeGmud(g, gmudInput).custo, 0);
  const custoGmudOperation = state.tierOperation ? sumGmud(buckets.operation) : 0;
  const custoGmudPerformance = state.tierPerformance ? sumGmud(buckets.performance) : 0;

  const custoTotal =
    custoGmudOperation + custoGmudPerformance + custoRotinasGerenciais;

  return {
    custoGmudOperation,
    custoGmudPerformance,
    custoRotinasGerenciais,
    custoTotal,
  };
}

/**
 * Recalcula a composição do preço de venda considerando o custo extra acima
 * de `custoTotalOperacao` original do calculador. Mantém o mesmo método
 * (markup divisor: PV = custo / (1 − Σ%/100)).
 */
export function recomputeComposicaoComExtras(
  state: ITSMState,
  results: ITSMResults,
  custoExtras: number,
): ITSMResults {
  if (custoExtras <= 0) return results;

  // Fase 1B: núcleo compartilhado (src/lib/pricing/cascata.ts, REGRA_SMART_ITO).
  const custoTotalOperacao = results.custoTotalOperacao + custoExtras;
  const c = composicaoSmartITO(custoTotalOperacao, percsFromState(state));
  return {
    ...results,
    custoTotalOperacao,
    precoVendaMensal: c.precoVenda,
    precoPreImposto: c.precoPreImposto,
    valorImpostos: c.valorImpostos,
    valorMargem: c.valorMargem,
    composicaoPreco: c.composicao,
  };
}