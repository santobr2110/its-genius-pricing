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
  custoRotinasField: number;
  custoRotinasGerenciais: number;
  custoTotal: number;
}

/**
 * Calcula os custos "extras" que NÃO entram em useITSMCalculator.custoTotalOperacao
 * mas que compõem o valor de venda das camadas Smart e do Relatório de Proposição:
 *  - GMUDs (Operation + Performance)
 *  - Rotinas de Field Service de Microinformática (oferta vinculada à camada)
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
    qtdUsuarios: state.qtdUsuarios,
    qtdEquipamentos: state.qtdEquipamentos,
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

  const hasInfraInventory =
    (inv.qtdServidores || 0) + (inv.qtdAtivosRede || 0) +
    (inv.qtdBancosDados || 0) + (inv.qtdSistemas || 0) > 0;
  const hasServiceDesk =
    (inv.qtdUsuarios || 0) + (inv.qtdEquipamentos || 0) > 0;
  const n3OptionalScenario = !hasInfraInventory && hasServiceDesk;

  const ofertaAtiva = (oferta: Rotina["oferta"]) => {
    if (oferta === "Monitor") return state.tierMonitor;
    if (oferta === "Flow") return state.tierFlow;
    if (oferta === "Operation") return state.tierOperation;
    if (oferta === "Performance") return state.tierPerformance;
    if (oferta === "Enterprise") return state.tierEnterprise;
    return false;
  };
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

  // === Rotinas Field Service de Microinformática ===
  let custoRotinasField = 0;
  if (state.tierFieldOperation && !n3OptionalScenario) {
    for (const rRaw of rotinas) {
      const r = normalizeLegacyRotina(rRaw);
      if (!r.grupo.toLowerCase().includes("microinform")) continue;
      if (r.oferta === "Performance" && !state.tierPerformance) continue;
      if (r.gerencial) continue;
      const rotina = normalizeOsRotina(rRaw);
      const mult = rotinaMultiplicador(rotina, inv, complexFlags);
      const demanda = r.chamadosMes * mult;
      if (demanda <= 0) continue;
      const fa = r.automacao ? fatorAutoPerc : 1;
      if (r.horasExecucao && r.horasExecucao > 0) {
        custoRotinasField += demanda * r.horasExecucao * state.valorHoraN3 * fa;
      } else {
        custoRotinasField += demanda * custoPorChamadoMix * fa;
      }
    }
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
    custoGmudOperation + custoGmudPerformance + custoRotinasField + custoRotinasGerenciais;

  return {
    custoGmudOperation,
    custoGmudPerformance,
    custoRotinasField,
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

  const pisPerc = Math.max(0, state.pisPerc || 0);
  const cofinsPerc = Math.max(0, state.cofinsPerc || 0);
  const issPerc = Math.max(0, state.issPerc || 0);
  const comissaoPerc = Math.max(0, state.comissaoPerc || 0);
  const irpjCsllPerc = Math.max(0, state.irpjCsllPerc || 0);
  const encFinancPerc = Math.max(0, state.encFinancPerc || 0);
  const lucroPerc = Math.max(0, state.lucroPerc || 0);
  const totalEncargosPerc =
    pisPerc + cofinsPerc + issPerc + comissaoPerc + irpjCsllPerc + encFinancPerc + lucroPerc;
  const custoPerc = 100 - totalEncargosPerc;
  const fatorDivisor = custoPerc > 0 ? custoPerc / 100 : 0;

  const custoTotalOperacao = results.custoTotalOperacao + custoExtras;
  const precoVendaMensal = fatorDivisor > 0 ? custoTotalOperacao / fatorDivisor : 0;
  const valorPis = (precoVendaMensal * pisPerc) / 100;
  const valorCofins = (precoVendaMensal * cofinsPerc) / 100;
  const valorIss = (precoVendaMensal * issPerc) / 100;
  const valorComissao = (precoVendaMensal * comissaoPerc) / 100;
  const valorIrpjCsll = (precoVendaMensal * irpjCsllPerc) / 100;
  const valorEncFinanc = (precoVendaMensal * encFinancPerc) / 100;
  const valorLucro = (precoVendaMensal * lucroPerc) / 100;
  const valorImpostos = valorPis + valorCofins + valorIss + valorIrpjCsll + valorEncFinanc;
  const valorMargem = valorLucro;
  const precoPreImposto = precoVendaMensal - (valorPis + valorCofins + valorIss);

  return {
    ...results,
    custoTotalOperacao,
    precoVendaMensal,
    precoPreImposto,
    valorImpostos,
    valorMargem,
    composicaoPreco: {
      custo: custoTotalOperacao,
      pis: valorPis,
      cofins: valorCofins,
      iss: valorIss,
      comissao: valorComissao,
      irpjCsll: valorIrpjCsll,
      encFinanc: valorEncFinanc,
      lucro: valorLucro,
      precoVenda: precoVendaMensal,
      totalEncargosPerc,
      custoPerc,
      receitaLiquida: precoPreImposto,
      margemContribuicao:
        precoVendaMensal - custoTotalOperacao - (valorPis + valorCofins + valorIss + valorComissao),
      resultadoOperacional: valorLucro,
    },
  };
}