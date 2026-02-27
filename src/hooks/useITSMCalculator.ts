import { useState, useMemo } from "react";

export type PlanoRotinas = "ouro" | "prata" | "bronze";

export const PLANO_ROTINAS_MULTIPLICADOR: Record<PlanoRotinas, number> = {
  ouro: 1.8,
  prata: 1.5,
  bronze: 1.0,
};

export interface ITSMState {
  // Inventário
  qtdUsuarios: number;
  qtdServidores: number;
  qtdAtivosRede: number;
  qtdBancosDados: number;
  qtdSistemas: number;
  qtdRotinas: number;
  planoRotinas: PlanoRotinas;
  horasN3Mensais: number; // horas/mês consumidas pelo N3 (informado no inventário)
  // Taxas de demanda
  taxaUsuario: number;
  taxaServidor: number;
  taxaRede: number;
  taxaBancoDados: number;
  taxaSistemas: number;
  taxaRotinas: number;
  // Funil
  reducaoN0: number;
  reducaoRotinas: number;
  percN1: number;
  percN2: number;
  percN3: number;
  // Métricas e Parâmetros de Precificação - N1
  custoPessoaN1: number;      // custo mensal por pessoa (posição = 4 pessoas 12x36)
  percGestaoN1: number;       // % gestão sobre custo da posição
  capacidadeChamadosN1: number; // chamados/mês que uma posição atende
  // Métricas e Parâmetros de Precificação - N2
  custoAnalistaN2: number;    // custo mensal do analista (regime 8x5)
  percGestaoN2: number;       // % gestão sobre custo do analista
  capacidadeServidoresN2: number; // servidores atendidos por analista
  // Métricas e Parâmetros de Precificação - N3
  valorHoraN3: number;        // custo hora N3
  // Custos fixos
  custoFixoFerramentas: number;
  // Financeiro
  margemLucro: number;
  impostosTaxas: number;
}

export interface ITSMResults {
  totalChamadosUsuarios: number;
  totalChamadosInfra: number;
  totalChamadosRotinas: number;
  rotinasAutomatizadas: number;
  rotinasHumanas: number;
  volumeTotalBruto: number;
  chamadosResolvidosN0: number;
  volumeAtendimentoHumano: number;
  volN1: number;
  volN2: number;
  volN3: number;
  // N1 - custo por chamado
  custoPosicaoN1: number;
  custoPorChamadoN1: number;
  custoN1: number;
  // N2 - custo por servidor
  custoTotalAnalistaN2: number;
  custoPorServidorN2: number;
  custoN2: number;
  // N3 - horas
  horasN3: number;
  custoN3: number;
  custoTotalOperacao: number;
  precoVendaMensal: number;
}

const DEFAULTS: ITSMState = {
  qtdUsuarios: 500,
  qtdServidores: 50,
  qtdAtivosRede: 20,
  qtdBancosDados: 10,
  qtdSistemas: 15,
  qtdRotinas: 1,
  planoRotinas: "prata",
  horasN3Mensais: 80,
  taxaUsuario: 0.5,
  taxaServidor: 1.2,
  taxaRede: 0.3,
  taxaBancoDados: 0.8,
  taxaSistemas: 0.6,
  taxaRotinas: 1.0,
  reducaoN0: 15,
  reducaoRotinas: 20,
  percN1: 75,
  percN2: 20,
  percN3: 5,
  // N1: 4 pessoas a R$3.500/pessoa = R$14.000/posição
  custoPessoaN1: 3500,
  percGestaoN1: 20,
  capacidadeChamadosN1: 1500,
  // N2: 1 analista a R$8.000
  custoAnalistaN2: 8000,
  percGestaoN2: 20,
  capacidadeServidoresN2: 30,
  // N3
  valorHoraN3: 120,
  custoFixoFerramentas: 1500,
  margemLucro: 30,
  impostosTaxas: 15,
};

export function useITSMCalculator() {
  const [state, setState] = useState<ITSMState>(DEFAULTS);

  const update = <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const updateN1N2N3 = (changed: "percN1" | "percN2" | "percN3", value: number) => {
    setState((prev) => {
      const others = (["percN1", "percN2", "percN3"] as const).filter((k) => k !== changed);
      const remaining = 100 - value;
      const sumOthers = prev[others[0]] + prev[others[1]];
      if (sumOthers === 0) {
        return { ...prev, [changed]: value, [others[0]]: remaining / 2, [others[1]]: remaining / 2 };
      }
      const ratio0 = prev[others[0]] / sumOthers;
      return {
        ...prev,
        [changed]: value,
        [others[0]]: Math.round(remaining * ratio0),
        [others[1]]: remaining - Math.round(remaining * ratio0),
      };
    });
  };

  const results: ITSMResults = useMemo(() => {
    const totalChamadosUsuarios = state.qtdUsuarios * state.taxaUsuario;
    const totalChamadosInfra =
      state.qtdServidores * state.taxaServidor +
      state.qtdAtivosRede * state.taxaRede +
      state.qtdBancosDados * state.taxaBancoDados +
      state.qtdSistemas * state.taxaSistemas;
    
    const multiplicadorRotinas = PLANO_ROTINAS_MULTIPLICADOR[state.planoRotinas];
    const totalChamadosRotinas = state.qtdRotinas * state.taxaRotinas * multiplicadorRotinas;
    const rotinasAutomatizadas = totalChamadosRotinas * (state.reducaoRotinas / 100);
    const rotinasHumanas = totalChamadosRotinas - rotinasAutomatizadas;

    const volumeTotalBruto = totalChamadosUsuarios + totalChamadosInfra;
    const chamadosResolvidosN0 = volumeTotalBruto * (state.reducaoN0 / 100);
    const volumeAtendimentoHumano = volumeTotalBruto - chamadosResolvidosN0;
    const volN1 = volumeAtendimentoHumano * (state.percN1 / 100);
    const volN2 = volumeAtendimentoHumano * (state.percN2 / 100);
    const volN3Base = volumeAtendimentoHumano * (state.percN3 / 100);
    const volN3 = volN3Base + rotinasHumanas;

    // === N1: Custo por Chamado ===
    // Posição = 4 pessoas × custo/pessoa × (1 + %gestão)
    const custoPosicaoN1 = state.custoPessoaN1 * 4 * (1 + state.percGestaoN1 / 100);
    const custoPorChamadoN1 = state.capacidadeChamadosN1 > 0
      ? custoPosicaoN1 / state.capacidadeChamadosN1
      : 0;
    const custoN1 = custoPorChamadoN1 * volN1;

    // === N2: Custo por Servidor ===
    // Analista × (1 + %gestão) / capacidade servidores × servidores do cliente
    const custoTotalAnalistaN2 = state.custoAnalistaN2 * (1 + state.percGestaoN2 / 100);
    const custoPorServidorN2 = state.capacidadeServidoresN2 > 0
      ? custoTotalAnalistaN2 / state.capacidadeServidoresN2
      : 0;
    const custoN2 = custoPorServidorN2 * state.qtdServidores;

    // === N3: Horas informadas ===
    const horasN3 = state.horasN3Mensais;
    const custoN3 = horasN3 * state.valorHoraN3;

    const custoTotalOperacao = custoN1 + custoN2 + custoN3 + state.custoFixoFerramentas;
    const percentualCustosVenda = state.margemLucro + state.impostosTaxas;
    const fatorDivisor = (100 - percentualCustosVenda) / 100;
    const precoVendaMensal = fatorDivisor > 0 ? custoTotalOperacao / fatorDivisor : 0;

    return {
      totalChamadosUsuarios,
      totalChamadosInfra,
      totalChamadosRotinas,
      rotinasAutomatizadas,
      rotinasHumanas,
      volumeTotalBruto,
      chamadosResolvidosN0,
      volumeAtendimentoHumano,
      volN1, volN2, volN3,
      custoPosicaoN1,
      custoPorChamadoN1,
      custoN1,
      custoTotalAnalistaN2,
      custoPorServidorN2,
      custoN2,
      horasN3,
      custoN3,
      custoTotalOperacao,
      precoVendaMensal,
    };
  }, [state]);

  return { state, update, updateN1N2N3, results };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
