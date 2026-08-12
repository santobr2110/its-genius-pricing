// ============================================================
// Cálculo unificado dos Itens Adicionais ao Contrato, por camada.
//
// Regras:
// - Preço de venda = custo × fatorVenda (markup divisor derivado da
//   rentabilidade informada na tela de Camadas).
// - Ativos calculados consideram monitoramento (custo por UM marginal,
//   ponderado pelo peso do tipo de ativo) + chamados previstos no funil,
//   ajustados pelo slider de Risco (criticidade).
// - Itens por hora (hora N3, TAM, Owner) usam o valor hora do N3.
// - Itens de ITSM usam o custo de atendente configurado em Métricas.
// ============================================================
import type { ITSMState, ITSMResults } from "@/hooks/useITSMCalculator";
import { computeCustoPorUMMarginal } from "@/lib/custoMonitoramentoUM";
import type { ItemAdicional, CamadaKey } from "@/data/escopoProposicao";

export interface ItemAdicionalCtx {
  state: ITSMState;
  results: ITSMResults;
  fatorVenda: number;
}

export interface ItemAdicionalValor {
  valor: number;
  detalhe?: string;
}

export function createItemAdicionalCalculator(ctx: ItemAdicionalCtx) {
  const { state, results, fatorVenda } = ctx;
  const escala = state.criticidadeEscala ?? [];
  const ajusteRisco = escala[state.criticidadeNivel] ?? 0;
  const adj = (t: number) => Math.max(0, (t || 0) * (1 + ajusteRisco));

  const pesos = state.monitorPesos ?? { servidores: 1, bancoDados: 1.2, firewall: 0.7, ativosRede: 0.5 };
  const faixas = state.monitorFaixas ?? [];
  const umInvAtual =
    (state.qtdServidores || 0) * pesos.servidores +
    (state.qtdBancosDados || 0) * pesos.bancoDados +
    (state.qtdSistemas || 0) * pesos.firewall +
    (state.qtdAtivosRede || 0) * pesos.ativosRede;
  const custoPorUMMarginal = computeCustoPorUMMarginal(umInvAtual, faixas);

  const cppN1 = results.custoPorChamadoN1;
  const cppN2 = results.custoPorChamadoN2;
  const cN3perChamado = (state.valorHoraN3 || 0) * (state.tempoMedioChamadoN3 || 0);
  const valorHoraN3Venda = (state.valorHoraN3 || 0) * fatorVenda;

  const ativoUnit = (taxa: number, peso: number): ItemAdicionalValor => {
    const chamadosLiq = adj(taxa) * (1 - (state.reducaoN0 || 0) / 100);
    const custoIncidentes =
      cppN1 * chamadosLiq * (state.percN1 / 100) +
      cppN2 * chamadosLiq * (state.percN2 / 100) +
      cN3perChamado * chamadosLiq * (state.percN3 / 100);
    const custoMonit = custoPorUMMarginal * peso;
    const custoN1Aloc =
      state.tierMonitor && !state.tierOperation
        ? ((state.percAlocacaoN1Monitor || 0) / 100) * cppN1 * chamadosLiq
        : 0;
    return {
      valor: (custoIncidentes + custoMonit + custoN1Aloc) * fatorVenda,
      detalhe: `${chamadosLiq.toFixed(1)} ch/mês previstos`,
    };
  };

  /** Somente monitoramento do ativo (sem chamados previstos). */
  const monitOnly = (peso: number): ItemAdicionalValor => ({
    valor: custoPorUMMarginal * peso * fatorVenda,
    detalhe: "somente monitoramento",
  });

  return function computeItem(it: ItemAdicional): ItemAdicionalValor {
    if (it.tipo === "fixo" || (typeof it.valorManual === "number" && it.valorManual > 0)) {
      return { valor: it.valorManual ?? 0 };
    }
    const horas = it.horas && it.horas > 0 ? it.horas : 1;
    switch (it.tipo) {
      case "monitorado-servidor": return ativoUnit(state.taxaServidor, pesos.servidores);
      case "monitorado-rede":
      case "monitorado-firewall": return ativoUnit(state.taxaRede, pesos.ativosRede);
      case "monitorado-bd": return ativoUnit(state.taxaBancoDados, pesos.bancoDados);
      case "monitorado-sistema": return ativoUnit(state.taxaSistemas, pesos.firewall);
      case "monit-servidor": return monitOnly(pesos.servidores);
      case "monit-rede":
      case "monit-firewall": return monitOnly(pesos.ativosRede);
      case "monit-bd": return monitOnly(pesos.bancoDados);
      case "monit-sistema": return monitOnly(pesos.firewall);
      case "proxy": return { valor: (state.valorProxyAdicional || 0) * fatorVenda };
      case "atendente-itsm":
      case "itsm": return { valor: (state.custoAtendenteFlow || 0) * fatorVenda };
      case "hora-n3":
      case "tam":
      case "owner":
        return {
          valor: horas * valorHoraN3Venda,
          detalhe: horas > 1 ? `${horas.toFixed(1).replace(/\.0$/, "")}h × valor hora N3` : undefined,
        };
      default:
        return { valor: it.valorManual ?? 0 };
    }
  };
}

/** Camadas visíveis para itens adicionais, considerando consolidação Monitor+Flow. */
export function itemCamadaVisivel(
  camada: CamadaKey,
  opts: {
    monitorVisible: boolean;
    flowVisible: boolean;
    operation: boolean;
    performance: boolean;
    enterprise: boolean;
  },
): boolean {
  switch (camada) {
    case "monitor": return opts.monitorVisible || opts.flowVisible;
    case "flow": return opts.flowVisible;
    case "operation": return opts.operation;
    case "performance": return opts.performance;
    case "enterprise": return opts.enterprise;
    default: return false;
  }
}
