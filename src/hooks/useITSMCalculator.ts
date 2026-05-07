// @refresh reset
import { useMemo, useCallback } from "react";
import { usePersistentState } from "./usePersistentState";

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
  percN1: number;
  percN2: number;
  percN3: number;
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
  tempoMedioChamadoN3: number;
  // Financeiro
  margemLucro: number;
  impostosTaxas: number;
  // Camadas de oferta
  percAlocacaoN1Monitor: number;
  custoAtivoMonitorado: number;
  tierMonitor: boolean;
  tierOperation: boolean;
  tierPerformance: boolean;
  tierEnterprise: boolean;
}

export interface ITSMResults {
  totalChamadosUsuarios: number;
  totalChamadosInfra: number;
  volumeTotalBruto: number;
  chamadosResolvidosN0: number;
  volumeAtendimentoHumano: number;
  // Funil
  volumeN1: number;
  volumeN2: number;
  volumeN3: number;
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
  horasAtendimentoN3: number;
  horasPrevencao: number;
  custoN3: number;
  // Chamados por categoria
  chamadosUsuarios: number;
  chamadosServidores: number;
  chamadosRede: number;
  chamadosBancoDados: number;
  chamadosSistemas: number;
  custoTotalOperacao: number;
  precoPreImposto: number;
  valorMargem: number;
  valorImpostos: number;
  precoVendaMensal: number;
  // Smart Monitor
  smartMonitor: {
    ativos: number;
    chamadosAtivos: number;
    custoMonitoramento: number;
    custoN1Alocado: number;
    total: number;
  };
  humanAttendanceActive: boolean;
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
  percN1: 75,
  percN2: 20,
  percN3: 5,
  custoPessoaN1: 3500,
  percGestaoN1: 20,
  capacidadeChamadosN1: 1500,
  custoAnalistaN2: 8000,
  percGestaoN2: 20,
  capacidadeServidoresN2: 30,
  valorHoraN3: 120,
  tempoMedioChamadoN3: 2,
  margemLucro: 45,
  impostosTaxas: 5.65,
  percAlocacaoN1Monitor: 30,
  custoAtivoMonitorado: 50,
  tierMonitor: true,
  tierOperation: false,
  tierPerformance: false,
  tierEnterprise: false,
};

export function useITSMCalculator() {
  const [state, setState] = usePersistentState<ITSMState>("itsm:calculator:v1", DEFAULTS);

  const update = <K extends keyof ITSMState>(key: K, value: ITSMState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  // Atualiza um nível do funil redistribuindo o restante entre os outros dois
  const updateFunnel = useCallback((level: "percN1" | "percN2" | "percN3", value: number) => {
    setState((prev) => {
      const clamped = Math.min(100, Math.max(0, Math.round(value)));
      const remaining = 100 - clamped;

      if (level === "percN1") {
        const sumOthers = prev.percN2 + prev.percN3;
        if (sumOthers > 0) {
          const ratioN2 = prev.percN2 / sumOthers;
          return { ...prev, percN1: clamped, percN2: Math.round(remaining * ratioN2), percN3: remaining - Math.round(remaining * ratioN2) };
        }
        return { ...prev, percN1: clamped, percN2: remaining, percN3: 0 };
      }
      if (level === "percN2") {
        const sumOthers = prev.percN1 + prev.percN3;
        if (sumOthers > 0) {
          const ratioN1 = prev.percN1 / sumOthers;
          return { ...prev, percN2: clamped, percN1: Math.round(remaining * ratioN1), percN3: remaining - Math.round(remaining * ratioN1) };
        }
        return { ...prev, percN2: clamped, percN1: remaining, percN3: 0 };
      }
      // percN3
      const sumOthers = prev.percN1 + prev.percN2;
      if (sumOthers > 0) {
        const ratioN1 = prev.percN1 / sumOthers;
        return { ...prev, percN3: clamped, percN1: Math.round(remaining * ratioN1), percN2: remaining - Math.round(remaining * ratioN1) };
      }
      return { ...prev, percN3: clamped, percN1: remaining, percN2: 0 };
    });
  }, []);

  const results: ITSMResults = useMemo(() => {
    // Chamados por categoria
    const chamadosUsuarios = state.qtdUsuarios * state.taxaUsuario;
    const chamadosServidores = state.qtdServidores * state.taxaServidor;
    const chamadosRede = state.qtdAtivosRede * state.taxaRede;
    const chamadosBancoDados = state.qtdBancosDados * state.taxaBancoDados;
    const chamadosSistemas = state.qtdSistemas * state.taxaSistemas;

    const totalChamadosUsuarios = chamadosUsuarios;
    const totalChamadosInfra = chamadosServidores + chamadosRede + chamadosBancoDados + chamadosSistemas;

    const volumeTotalBruto = totalChamadosUsuarios + totalChamadosInfra;
    const chamadosResolvidosN0 = volumeTotalBruto * (state.reducaoN0 / 100);
    const volumeAtendimentoHumano = volumeTotalBruto - chamadosResolvidosN0;

    // === Funil: distribuição dos chamados humanos ===
    const volumeN1 = volumeAtendimentoHumano * (state.percN1 / 100);
    const volumeN2 = volumeAtendimentoHumano * (state.percN2 / 100);
    const volumeN3 = volumeAtendimentoHumano * (state.percN3 / 100);

    // Atendimento humano só está ativo se alguma camada que envolve atendimento for selecionada
    const humanAttendanceActive =
      state.tierOperation || state.tierPerformance || state.tierEnterprise;

    // === N1: Custo por Chamado ===
    const custoPosicaoN1 = state.custoPessoaN1 * 4 * (1 + state.percGestaoN1 / 100);
    const custoPorChamadoN1 = state.capacidadeChamadosN1 > 0
      ? custoPosicaoN1 / state.capacidadeChamadosN1
      : 0;
    const custoN1 = humanAttendanceActive ? custoPorChamadoN1 * volumeN1 : 0;

    // === N2: Custo por Servidor (proporcional ao volume do funil) ===
    const custoTotalAnalistaN2 = state.custoAnalistaN2 * (1 + state.percGestaoN2 / 100);
    const custoPorServidorN2 = state.capacidadeServidoresN2 > 0
      ? custoTotalAnalistaN2 / state.capacidadeServidoresN2
      : 0;
    const custoN2 = humanAttendanceActive ? custoPorServidorN2 * state.qtdServidores : 0;

    // === N3: Horas consumidas por chamados N3 ===
    const horasN3 = humanAttendanceActive ? state.horasN3Mensais : 0;
    const horasConsumidasN3 = humanAttendanceActive ? volumeN3 * state.tempoMedioChamadoN3 : 0;
    const horasAtendimentoN3 = horasConsumidasN3;
    const horasPrevencao = Math.max(0, horasN3 - horasConsumidasN3);
    const custoN3 = horasN3 * state.valorHoraN3;

    // Smart Monitor: custo de monitoramento por ativo entra no custo total da operação.
    // (A parcela de N1 alocada ao Smart Monitor já está incluída em custoN1.)
    const monitorActive = state.tierMonitor;
    const smAtivos = state.qtdServidores + state.qtdAtivosRede + state.qtdSistemas;
    const smChamados = chamadosServidores + chamadosRede + chamadosSistemas;
    const smCustoMonit = monitorActive ? state.custoAtivoMonitorado * smAtivos : 0;
    const smCustoN1Aloc = monitorActive
      ? (state.percAlocacaoN1Monitor / 100) * custoPorChamadoN1 * smChamados
      : 0;

    const custoTotalOperacao = custoN1 + custoN2 + custoN3 + smCustoMonit + smCustoN1Aloc;
    // Markup divisor: custo deve ser (100 - margem)% do preço pré-imposto
    // Ex: margem 45% → custo = 55% do preço pré-imposto → preço = custo / 0,55
    const fatorMargem = (100 - state.margemLucro) / 100;
    const precoPreImposto = fatorMargem > 0 ? custoTotalOperacao / fatorMargem : 0;
    const valorMargem = precoPreImposto - custoTotalOperacao;
    // Impostos por fora: cliente paga sobre o preço final
    // preco_final * (1 - imposto%) = preco_pre_imposto → preco_final = preco_pre_imposto / (1 - imposto%)
    const fatorImposto = (100 - state.impostosTaxas) / 100;
    const precoVendaMensal = fatorImposto > 0 ? precoPreImposto / fatorImposto : 0;
    const valorImpostos = precoVendaMensal - precoPreImposto;

    const smartMonitor = {
      ativos: smAtivos,
      chamadosAtivos: smChamados,
      custoMonitoramento: smCustoMonit,
      custoN1Alocado: smCustoN1Aloc,
      total: smCustoMonit + smCustoN1Aloc,
    };

    return {
      totalChamadosUsuarios,
      totalChamadosInfra,
      volumeTotalBruto,
      chamadosResolvidosN0,
      volumeAtendimentoHumano,
      volumeN1,
      volumeN2,
      volumeN3,
      custoPosicaoN1,
      custoPorChamadoN1,
      custoN1,
      custoTotalAnalistaN2,
      custoPorServidorN2,
      custoN2,
      horasN3,
      horasAtendimentoN3,
      horasPrevencao,
      custoN3,
      chamadosUsuarios,
      chamadosServidores,
      chamadosRede,
      chamadosBancoDados,
      chamadosSistemas,
      custoTotalOperacao,
      precoPreImposto,
      valorMargem,
      valorImpostos,
      precoVendaMensal,
      smartMonitor,
      humanAttendanceActive,
    };
  }, [state]);

  return { state, setState, update, updateFunnel, results };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
