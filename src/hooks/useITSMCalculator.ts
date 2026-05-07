// @refresh reset
import { useMemo, useCallback } from "react";
import { usePersistentState } from "./usePersistentState";

export interface ITSMState {
  // Inventário
  qtdUsuarios: number;
  qtdEquipamentos: number;
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
  capacidadeChamadosN2: number;
  // Métricas e Parâmetros de Precificação - N3
  valorHoraN3: number;
  tempoMedioChamadoN3: number;
  // Financeiro
  margemLucro: number;
  impostosTaxas: number;
  // Camadas de oferta
  percAlocacaoN1Monitor: number;
  custoAtivoMonitorado: number;
  custoFerramentaEndpoint: number;
  // Criticidade do ambiente (0..4) e escala de ajuste aplicada às taxas
  criticidadeNivel: number;
  criticidadeEscala: number[];
  // Complexidade do ambiente (flags)
  complexVirtualizacaoCluster: boolean;
  complexBancoDadosHA: boolean;
  complexFirewallHA: boolean;
  complexMultiSites: boolean;
  complexSiteBackup: boolean;
  complexHibridoCloudOnPrem: boolean;
  complexOperacao24x7: boolean;
  tierMonitor: boolean;
  tierOperation: boolean;
  tierOperationN3: boolean;
  tierPerformance: boolean;
  tierEnterprise: boolean;
  // Field Service (sub-opção do Smart Operation)
  tierFieldOperation: boolean;
  percFieldN1F: number;
  percFieldN2F: number;
  percFieldN3F: number;
  // Custos de equipes Field (preenchidos pelo contexto)
  custoEquipeFieldN1: number;
  custoEquipeFieldN2: number;
  custoEquipeFieldN3: number;
  capacidadeFieldN1: number;
  capacidadeFieldN2: number;
  capacidadeFieldN3: number;
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
  custoPorChamadoN2: number;
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
  // Field Service
  fieldService: {
    active: boolean;
    volumeUsuariosEscalado: number;
    volumeN1F: number;
    volumeN2F: number;
    volumeN3F: number;
    custoN1F: number;
    custoN2F: number;
    custoN3F: number;
    total: number;
  };
}

const DEFAULTS: ITSMState = {
  qtdUsuarios: 500,
  qtdEquipamentos: 0,
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
  capacidadeChamadosN2: 150,
  valorHoraN3: 120,
  tempoMedioChamadoN3: 2,
  margemLucro: 45,
  impostosTaxas: 5.65,
  percAlocacaoN1Monitor: 30,
  custoAtivoMonitorado: 50,
  custoFerramentaEndpoint: 25,
  criticidadeNivel: 2,
  criticidadeEscala: [-0.3, -0.15, 0, 0.15, 0.3],
  complexVirtualizacaoCluster: false,
  complexBancoDadosHA: false,
  complexFirewallHA: false,
  complexMultiSites: false,
  complexSiteBackup: false,
  complexHibridoCloudOnPrem: false,
  complexOperacao24x7: false,
  tierMonitor: true,
  tierOperation: false,
  tierOperationN3: false,
  tierPerformance: false,
  tierEnterprise: false,
  tierFieldOperation: false,
  percFieldN1F: 60,
  percFieldN2F: 30,
  percFieldN3F: 10,
  custoEquipeFieldN1: 0,
  custoEquipeFieldN2: 0,
  custoEquipeFieldN3: 0,
  capacidadeFieldN1: 600,
  capacidadeFieldN2: 200,
  capacidadeFieldN3: 80,
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
    const escala = state.criticidadeEscala ?? DEFAULTS.criticidadeEscala;
    const nivel = state.criticidadeNivel ?? DEFAULTS.criticidadeNivel;
    const ajuste = escala[nivel] ?? 0;
    const adj = (t: number) => Math.max(0, t * (1 + ajuste));
    // Chamados por categoria
    const chamadosUsuarios = state.qtdUsuarios * adj(state.taxaUsuario);
    const chamadosServidores = state.qtdServidores * adj(state.taxaServidor);
    const chamadosRede = state.qtdAtivosRede * adj(state.taxaRede);
    const chamadosBancoDados = state.qtdBancosDados * adj(state.taxaBancoDados);
    const chamadosSistemas = state.qtdSistemas * adj(state.taxaSistemas);

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
    // N3 atendido nas camadas superiores OU como opcional dentro do Smart Operation.
    const n3Active =
      state.tierPerformance ||
      state.tierEnterprise ||
      (state.tierOperation && state.tierOperationN3);

    // === N1: Custo por Chamado ===
    const custoPosicaoN1 = state.custoPessoaN1 * 4 * (1 + state.percGestaoN1 / 100);
    const custoPorChamadoN1 = state.capacidadeChamadosN1 > 0
      ? custoPosicaoN1 / state.capacidadeChamadosN1
      : 0;
    const custoN1 = humanAttendanceActive ? custoPorChamadoN1 * volumeN1 : 0;

    // === N2: Custo por Chamado ===
    const custoTotalAnalistaN2 = state.custoAnalistaN2 * (1 + state.percGestaoN2 / 100);
    const custoPorChamadoN2 = state.capacidadeChamadosN2 > 0
      ? custoTotalAnalistaN2 / state.capacidadeChamadosN2
      : 0;
    const custoN2 = humanAttendanceActive ? custoPorChamadoN2 * volumeN2 : 0;

    // === N3: Horas consumidas por chamados N3 ===
    const horasN3 = n3Active ? state.horasN3Mensais : 0;
    const horasConsumidasN3 = n3Active ? volumeN3 * state.tempoMedioChamadoN3 : 0;
    const horasAtendimentoN3 = horasConsumidasN3;
    const horasPrevencao = Math.max(0, horasN3 - horasConsumidasN3);
    const custoN3 = horasN3 * state.valorHoraN3;

    // Smart Monitor: custo de monitoramento por ativo entra no custo total da operação.
    // (A parcela de N1 alocada ao Smart Monitor já está incluída em custoN1.)
    const monitorActive = state.tierMonitor;
    const smAtivos = state.qtdServidores + state.qtdAtivosRede + state.qtdSistemas;
    const smChamadosBrutos = chamadosServidores + chamadosRede + chamadosSistemas;
    // Considera chamados evitados pelo N0
    const smChamados = smChamadosBrutos * (1 - state.reducaoN0 / 100);
    const smCustoMonit = monitorActive ? state.custoAtivoMonitorado * smAtivos : 0;
    // Quando Smart Operation está ativo, o N1 atende todos os chamados
    // pelo funil normal — não há alocação extra do Smart Monitor.
    const smCustoN1Aloc = monitorActive && !state.tierOperation
      ? (state.percAlocacaoN1Monitor / 100) * custoPorChamadoN1 * smChamados
      : 0;

    const custoEndpointTooling = state.custoFerramentaEndpoint * state.qtdEquipamentos;

    // === Field Service ===
    // Demandas de usuários (já filtradas pelo N0) passam pelo N1 convencional
    // e, quando Field está ativo, são também escaladas para a equipe Field
    // distribuída entre N1F / N2F / N3F.
    const fieldActive = state.tierOperation && state.tierFieldOperation;
    const volumeUsuariosEscalado = fieldActive
      ? chamadosUsuarios * (1 - state.reducaoN0 / 100)
      : 0;
    const fN1F = volumeUsuariosEscalado * (state.percFieldN1F / 100);
    const fN2F = volumeUsuariosEscalado * (state.percFieldN2F / 100);
    const fN3F = volumeUsuariosEscalado * (state.percFieldN3F / 100);
    const cppFN1 = state.capacidadeFieldN1 > 0 ? state.custoEquipeFieldN1 / state.capacidadeFieldN1 : 0;
    const cppFN2 = state.capacidadeFieldN2 > 0 ? state.custoEquipeFieldN2 / state.capacidadeFieldN2 : 0;
    const cppFN3 = state.capacidadeFieldN3 > 0 ? state.custoEquipeFieldN3 / state.capacidadeFieldN3 : 0;
    const custoFN1 = fieldActive ? cppFN1 * fN1F : 0;
    const custoFN2 = fieldActive ? cppFN2 * fN2F : 0;
    const custoFN3 = fieldActive ? cppFN3 * fN3F : 0;
    const custoFieldTotal = custoFN1 + custoFN2 + custoFN3;

    const custoTotalOperacao = custoN1 + custoN2 + custoN3 + smCustoMonit + smCustoN1Aloc + custoEndpointTooling + custoFieldTotal;
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

    const fieldService = {
      active: fieldActive,
      volumeUsuariosEscalado,
      volumeN1F: fN1F,
      volumeN2F: fN2F,
      volumeN3F: fN3F,
      custoN1F: custoFN1,
      custoN2F: custoFN2,
      custoN3F: custoFN3,
      total: custoFieldTotal,
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
      custoPorChamadoN2,
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
      fieldService,
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
