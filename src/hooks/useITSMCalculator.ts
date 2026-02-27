import { useState, useMemo } from "react";

export interface ITSMState {
  // Inventário
  qtdUsuarios: number;
  qtdServidores: number;
  qtdAtivosRede: number;
  qtdBancosDados: number;
  qtdSistemas: number;
  horasN3Mensais: number;
  // Taxas de demanda
  taxaUsuario: number;
  taxaServidor: number;
  taxaRede: number;
  taxaBancoDados: number;
  taxaSistemas: number;
  // Funil
  reducaoN0: number;
  // Métricas e Parâmetros de Precificação - N1
  custoPessoaN1: number;
  percGestaoN1: number;
  capacidadeChamadosN1: number;
  // Métricas e Parâmetros de Precificação - N2
  custoAnalistaN2: number;
  percGestaoN2: number;
  capacidadeServidoresN2: number;
  // Métricas e Parâmetros de Precificação - N3
  valorHoraN3: number;
  // Custos fixos
  custoFixoFerramentas: number;
  // Financeiro
  margemLucro: number;
  impostosTaxas: number;
}

export interface ITSMResults {
  totalChamadosUsuarios: number;
  totalChamadosInfra: number;
  volumeTotalBruto: number;
  chamadosResolvidosN0: number;
  volumeAtendimentoHumano: number;
  // N1
  custoPosicaoN1: number;
  custoPorChamadoN1: number;
  custoN1: number;
  // N2
  custoTotalAnalistaN2: number;
  custoPorServidorN2: number;
  custoN2: number;
  // N3
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
  horasN3Mensais: 80,
  taxaUsuario: 0.5,
  taxaServidor: 1.2,
  taxaRede: 0.3,
  taxaBancoDados: 0.8,
  taxaSistemas: 0.6,
  reducaoN0: 15,
  custoPessoaN1: 3500,
  percGestaoN1: 20,
  capacidadeChamadosN1: 1500,
  custoAnalistaN2: 8000,
  percGestaoN2: 20,
  capacidadeServidoresN2: 30,
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

  const results: ITSMResults = useMemo(() => {
    const totalChamadosUsuarios = state.qtdUsuarios * state.taxaUsuario;
    const totalChamadosInfra =
      state.qtdServidores * state.taxaServidor +
      state.qtdAtivosRede * state.taxaRede +
      state.qtdBancosDados * state.taxaBancoDados +
      state.qtdSistemas * state.taxaSistemas;

    const volumeTotalBruto = totalChamadosUsuarios + totalChamadosInfra;
    const chamadosResolvidosN0 = volumeTotalBruto * (state.reducaoN0 / 100);
    const volumeAtendimentoHumano = volumeTotalBruto - chamadosResolvidosN0;

    // === N1: Custo por Chamado ===
    const custoPosicaoN1 = state.custoPessoaN1 * 4 * (1 + state.percGestaoN1 / 100);
    const custoPorChamadoN1 = state.capacidadeChamadosN1 > 0
      ? custoPosicaoN1 / state.capacidadeChamadosN1
      : 0;
    const custoN1 = custoPorChamadoN1 * volumeAtendimentoHumano;

    // === N2: Custo por Servidor ===
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
      volumeTotalBruto,
      chamadosResolvidosN0,
      volumeAtendimentoHumano,
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

  return { state, update, results };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
