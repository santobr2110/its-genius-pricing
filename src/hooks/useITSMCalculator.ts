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
  // Custos
  tmaN1: number;
  tmaN2: number;
  tmaN3: number;
  valorHoraN1: number;
  valorHoraN2: number;
  valorHoraN3: number;
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
  horasN1: number;
  horasN2: number;
  horasN3: number;
  custoN1: number;
  custoN2: number;
  custoN3: number;
  custoTotalOperacao: number;
  totalHoras: number;
  precoVendaMensal: number;
}

const DEFAULTS: ITSMState = {
  qtdUsuarios: 500,
  qtdServidores: 50,
  qtdAtivosRede: 20,
  qtdBancosDados: 10,
  qtdSistemas: 15,
  qtdRotinas: 30,
  planoRotinas: "prata",
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
  tmaN1: 0.5,
  tmaN2: 2.0,
  tmaN3: 6.0,
  valorHoraN1: 35,
  valorHoraN2: 65,
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
    // Rotinas: volume bruto, automação e sobra vai direto para N3
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
    const horasN1 = volN1 * state.tmaN1;
    const horasN2 = volN2 * state.tmaN2;
    const horasN3 = (volN3Base * state.tmaN3) + (rotinasHumanas * state.tmaN3 * 0.05);
    const custoN1 = horasN1 * state.valorHoraN1;
    const custoN2 = horasN2 * state.valorHoraN2;
    const custoN3 = horasN3 * state.valorHoraN3;
    const custoTotalOperacao = custoN1 + custoN2 + custoN3 + state.custoFixoFerramentas;
    const totalHoras = horasN1 + horasN2 + horasN3;
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
      horasN1, horasN2, horasN3,
      custoN1, custoN2, custoN3,
      custoTotalOperacao,
      totalHoras,
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
