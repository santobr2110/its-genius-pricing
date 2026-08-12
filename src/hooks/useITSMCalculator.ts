// @refresh reset
import { useMemo, useCallback } from "react";
import { usePersistentState } from "./usePersistentState";
import {
  DEFAULT_MONITOR_FAIXAS,
  DEFAULT_MONITOR_PESOS,
  DEFAULT_MONITOR_PISO,
  computeCustoMonitoramentoTotal,
  type MonitorFaixa,
  type MonitorPesos,
} from "@/lib/custoMonitoramentoUM";

export interface ITSMState {
  // Inventário
  qtdServidores: number;
  qtdAtivosRede: number;
  qtdBancosDados: number;
  qtdSistemas: number;
  horasN3Mensais: number;
  horasN3Monitor: number;
  horasN3MonitorManut: number;
  // Taxas de demanda
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
  // Composição do preço de venda (markup divisor por componente)
  pisPerc: number;
  cofinsPerc: number;
  issPerc: number;
  comissaoPerc: number;
  irpjCsllPerc: number;
  encFinancPerc: number;
  lucroPerc: number;
  // Camadas de oferta
  percAlocacaoN1Monitor: number;
  custoAtivoMonitorado: number;
  // Smart Operation (monitoramento ativo + automação)
  custoAtivoOperacao: number;
  percAlocacaoN1Operation: number;
  // Proxy de monitoramento
  valorProxyInicial: number;
  valorProxyAdicional: number;
  // Limite de excedente (% acima da capacidade) usado nos relatórios.
  percLimiteExcedente: number;
  // Limites de horas N3 por camada (slider min/max em Camadas de Oferta)
  horasN3MonitorMin: number;
  horasN3MonitorMax: number;
  horasN3MonitorManutMin: number;
  horasN3MonitorManutMax: number;
  horasN3OperationMin: number;
  horasN3OperationMax: number;
  horasN3PerformanceMin: number;
  horasN3PerformanceMax: number;
  // Limites de Horas de Melhoria (subdivisão da sobra de N3) por camada
  horasMelhoriaOpMin: number;
  horasMelhoriaOpMax: number;
  horasMelhoriaPerfMin: number;
  horasMelhoriaPerfMax: number;
  // Monitoramento — Atendentes no ITSM (Smart Monitor)
  qtdAtendentesMonitor: number;
  qtdAtendentesMonitorMin: number;
  qtdAtendentesMonitorMax: number;
  custoAtendenteMonitor: number;
  // Monitoramento — proxys (Smart Monitor)
  qtdProxysMonitor: number;
  qtdProxysMonitorMax: number;
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
  complexErpMercado: boolean;
  tierMonitor: boolean;
  tierFlow: boolean;
  tierOperation: boolean;
  tierOperationN3: boolean;
  tierPerformance: boolean;
  tierEnterprise: boolean;
  // Smart Flow — clone independente do Smart Monitor
  custoAtivoFlow: number;
  percAlocacaoN1Flow: number;
  valorProxyInicialFlow: number;
  valorProxyAdicionalFlow: number;
  qtdProxysFlow: number;
  qtdProxysFlowMax: number;
  horasN3Flow: number;
  horasN3FlowMin: number;
  horasN3FlowMax: number;
  horasN3FlowManut: number;
  horasN3FlowManutMin: number;
  horasN3FlowManutMax: number;
  qtdAtendentesFlow: number;
  qtdAtendentesFlowMin: number;
  qtdAtendentesFlowMax: number;
  custoAtendenteFlow: number;
  // Percentual do custo de chamado aplicado em rotinas automatizadas (0–100)
  percCustoRotinaAutomatizada: number;
  // Distribuição dos chamados gerados por rotinas entre os times (independente do funil)
  percRotinaN1: number;
  percRotinaN2: number;
  percRotinaN3: number;
  // Volumes atuais informados pelo cliente (não impactam precificação)
  semVolumesAtuais: boolean;
  volumeChamadosAtivosManual: number;
  // Distribuição da demanda de GMUDs entre N2 e N3
  percGmudN2: number;
  percGmudN3: number;
  // Smart Flow — lista de ITSMs disponíveis para integração e seleção atual
  itsmFlowList: string[];
  itsmFlowSelected: string;
  // Fonte da demanda usada nos cálculos do Smart Monitor e Smart Flow.
  // "inventario" = calculada a partir do inventário (taxas × quantidades)
  // "manual"     = somatório de chamados atuais informados (ativos + usuários)
  // Quando Operation/Performance/Enterprise estão ativos, esta opção é
  // ignorada e o cálculo sempre usa o inventário.
  demandSource: "inventario" | "manual";
  // Custo unificado de monitoramento por UM (Unidade de Medida) — faixas marginais.
  // Substitui os campos legados custoAtivoMonitorado/custoAtivoFlow/custoAtivoOperacao
  // (mantidos no tipo apenas para compatibilidade com presets antigos).
  monitorPesos: MonitorPesos;
  monitorFaixas: MonitorFaixa[];
  monitorPisoMensal: number;
}

export interface ITSMResults {
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
  chamadosServidores: number;
  chamadosRede: number;
  chamadosBancoDados: number;
  chamadosSistemas: number;
  custoTotalOperacao: number;
  precoPreImposto: number;
  valorMargem: number;
  valorImpostos: number;
  precoVendaMensal: number;
  // Composição detalhada do preço de venda
  composicaoPreco: {
    custo: number;
    pis: number;
    cofins: number;
    iss: number;
    comissao: number;
    irpjCsll: number;
    encFinanc: number;
    lucro: number;
    precoVenda: number;
    totalEncargosPerc: number; // soma dos 7 percentuais
    custoPerc: number;          // 100 - totalEncargosPerc
    receitaLiquida: number;     // PV - (PIS+COFINS+ISS)
    margemContribuicao: number; // PV - custo - (PIS+COFINS+ISS+Comissão)
    resultadoOperacional: number; // = lucro pretendido em R$
  };
  // Smart Monitor
  smartMonitor: {
    ativos: number;
    chamadosAtivos: number;
    custoMonitoramento: number;
    custoN1Alocado: number;
    horasN3: number;
    custoN3: number;
    horasN3Manut: number;
    custoN3Manut: number;
    custoAtendentes: number;
    qtdAtendentes: number;
    custoProxys: number;
    qtdProxys: number;
    total: number;
  };
  smartFlow: {
    ativos: number;
    chamadosAtivos: number;
    custoMonitoramento: number;
    custoN1Alocado: number;
    horasN3: number;
    custoN3: number;
    horasN3Manut: number;
    custoN3Manut: number;
    custoAtendentes: number;
    qtdAtendentes: number;
    custoProxys: number;
    qtdProxys: number;
    total: number;
  };
  humanAttendanceActive: boolean;
}

const DEFAULTS: ITSMState = {
  qtdServidores: 50,
  qtdAtivosRede: 20,
  qtdBancosDados: 10,
  qtdSistemas: 15,
  horasN3Mensais: 80,
  horasN3Monitor: 0,
  horasN3MonitorManut: 0,
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
  pisPerc: 0.65,
  cofinsPerc: 3,
  issPerc: 2,
  comissaoPerc: 8.54,
  irpjCsllPerc: 10.30,
  encFinancPerc: 0,
  lucroPerc: 20,
  percAlocacaoN1Monitor: 30,
  custoAtivoMonitorado: 50,
  custoAtivoOperacao: 80,
  percAlocacaoN1Operation: 50,
  valorProxyInicial: 0,
  valorProxyAdicional: 0,
  percLimiteExcedente: 20,
  horasN3MonitorMin: 0,
  horasN3MonitorMax: 40,
  horasN3MonitorManutMin: 0,
  horasN3MonitorManutMax: 40,
  horasN3OperationMin: 10,
  horasN3OperationMax: 30,
  horasN3PerformanceMin: 20,
  horasN3PerformanceMax: 40,
  horasMelhoriaOpMin: 0,
  horasMelhoriaOpMax: 20,
  horasMelhoriaPerfMin: 0,
  horasMelhoriaPerfMax: 30,
  qtdAtendentesMonitor: 1,
  qtdAtendentesMonitorMin: 1,
  qtdAtendentesMonitorMax: 5,
  custoAtendenteMonitor: 4000,
  qtdProxysMonitor: 1,
  qtdProxysMonitorMax: 5,
  criticidadeNivel: 2,
  criticidadeEscala: [-0.3, -0.15, 0, 0.15, 0.3],
  complexVirtualizacaoCluster: false,
  complexBancoDadosHA: false,
  complexFirewallHA: false,
  complexMultiSites: false,
  complexSiteBackup: false,
  complexHibridoCloudOnPrem: false,
  complexOperacao24x7: false,
  complexErpMercado: false,
  tierMonitor: true,
  tierFlow: false,
  tierOperation: false,
  tierOperationN3: false,
  tierPerformance: false,
  tierEnterprise: false,
  custoAtivoFlow: 0,
  percAlocacaoN1Flow: 0,
  valorProxyInicialFlow: 0,
  valorProxyAdicionalFlow: 0,
  qtdProxysFlow: 1,
  qtdProxysFlowMax: 5,
  horasN3Flow: 0,
  horasN3FlowMin: 0,
  horasN3FlowMax: 40,
  horasN3FlowManut: 0,
  horasN3FlowManutMin: 0,
  horasN3FlowManutMax: 40,
  qtdAtendentesFlow: 1,
  qtdAtendentesFlowMin: 1,
  qtdAtendentesFlowMax: 5,
  custoAtendenteFlow: 4000,
  percCustoRotinaAutomatizada: 20,
  percRotinaN1: 30,
  percRotinaN2: 50,
  percRotinaN3: 20,
  semVolumesAtuais: true,
  volumeChamadosAtivosManual: 0,
  percGmudN2: 70,
  percGmudN3: 30,
  itsmFlowList: ["ServiceNow", "Jira Service Management", "Zendesk", "Freshservice", "GLPI", "BMC Helix"],
  itsmFlowSelected: "",
  demandSource: "inventario",
  monitorPesos: DEFAULT_MONITOR_PESOS,
  monitorFaixas: DEFAULT_MONITOR_FAIXAS,
  monitorPisoMensal: DEFAULT_MONITOR_PISO,
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
    return computeITSMResults(state);
  }, [state]);

  return { state, setState, update, updateFunnel, results };
}

/**
 * Computa os resultados a partir de um ITSMState puro (sem context/hooks).
 * Útil para previews/listagens que precisam do preço de venda mensal de um
 * preset salvo sem precisar carregá-lo na calculadora.
 */
export function computeITSMResults(state: ITSMState): ITSMResults {
    const escala = state.criticidadeEscala ?? DEFAULTS.criticidadeEscala;
    const nivel = state.criticidadeNivel ?? DEFAULTS.criticidadeNivel;
    const ajuste = escala[nivel] ?? 0;
    const adj = (t: number) => Math.max(0, t * (1 + ajuste));
    // Chamados por categoria
    const chamadosServidores = state.qtdServidores * adj(state.taxaServidor);
    const chamadosRede = state.qtdAtivosRede * adj(state.taxaRede);
    const chamadosBancoDados = state.qtdBancosDados * adj(state.taxaBancoDados);
    const chamadosSistemas = state.qtdSistemas * adj(state.taxaSistemas);

    const totalChamadosInfra = chamadosServidores + chamadosRede + chamadosBancoDados + chamadosSistemas;

    const volumeTotalBruto = totalChamadosInfra;
    const chamadosResolvidosN0 = volumeTotalBruto * (state.reducaoN0 / 100);
    const volumeAtendimentoHumano = volumeTotalBruto - chamadosResolvidosN0;

    const baseFunil = volumeAtendimentoHumano;
    const volumeN1 = baseFunil * (state.percN1 / 100);
    const volumeN2 = baseFunil * (state.percN2 / 100);
    const volumeN3 = baseFunil * (state.percN3 / 100);

    // Atendimento humano só está ativo se alguma camada que envolve atendimento for selecionada
    const humanAttendanceActive =
      state.tierOperation || state.tierPerformance || state.tierEnterprise;

    // N3 atendido nas camadas superiores.
    const n3Active =
      state.tierEnterprise || state.tierPerformance || state.tierOperation;

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
    // Em ofertas superiores (Flow/Operation/Performance/Enterprise), horas N3
    // avulsas do Smart Monitor são absorvidos pela camada superior — não devem
    // ser cobrados nem editáveis no Smart Monitor.
    const monitorAdvanced = state.tierFlow || state.tierOperation || state.tierPerformance || state.tierEnterprise;
    const flowActive = state.tierFlow;
    const flowAdvanced = state.tierOperation || state.tierPerformance || state.tierEnterprise;
    // Regra de sobreposição: quando uma camada superior (Flow/Op/Perf/Ent) está
    // ativa, TODOS os custos do Smart Monitor são zerados — ele só cobra quando
    // opera sozinho.
    const monitorBilling = monitorActive && !monitorAdvanced;
    const smAtivos = state.qtdServidores + state.qtdAtivosRede + state.qtdSistemas;
    const smChamadosBrutos = chamadosServidores + chamadosRede + chamadosSistemas;
    // Considera chamados evitados pelo N0 (modo inventário).
    const smChamadosInv = smChamadosBrutos * (1 - state.reducaoN0 / 100);
    // Fonte de demanda efetiva para Monitor/Flow.
    // Operation/Performance/Enterprise forçam o modo inventário.
    const forceInventory = state.tierOperation || state.tierPerformance || state.tierEnterprise;
    const effectiveDemandSource: "inventario" | "manual" =
      forceInventory ? "inventario" : (state.demandSource ?? "inventario");
    const manualVolume =
      Math.max(0, state.volumeChamadosAtivosManual || 0);
    const smChamados = effectiveDemandSource === "manual" ? manualVolume : smChamadosInv;
    // Smart Monitor: mínimo de 10 itens cobrados pelo valor unitário;
    // a partir do 11º cada item adicional acrescenta o valor unitário.
    const smAtivosBillable = Math.max(10, smAtivos);
    // === Custo unificado de monitoramento (faixas por UM) ===
    // Aplicado UMA ÚNICA VEZ na composição de custo quando qualquer camada
    // que envolva monitoramento estiver ativa (Monitor/Flow/Operation/Performance/Enterprise).
    const monitoramentoUMActive =
      state.tierMonitor || state.tierFlow || state.tierOperation || state.tierPerformance || state.tierEnterprise;
    const monitorPesos = state.monitorPesos ?? DEFAULT_MONITOR_PESOS;
    const monitorFaixas = state.monitorFaixas ?? DEFAULT_MONITOR_FAIXAS;
    const monitorPiso = Math.max(0, state.monitorPisoMensal ?? 0);
    const monitorCalc = computeCustoMonitoramentoTotal(
      {
        qtdServidores: state.qtdServidores || 0,
        qtdBancosDados: state.qtdBancosDados || 0,
        qtdSistemas: state.qtdSistemas || 0,
        qtdAtivosRede: state.qtdAtivosRede || 0,
      },
      monitorPesos,
      monitorFaixas,
      monitorPiso,
    );
    const custoMonitoramentoUM = monitoramentoUMActive ? monitorCalc.custoTotal : 0;
    // A cobrança por camada legada (custoAtivoMonitorado × ativos e custoAtivoFlow/Operacao × ativos)
    // foi substituída pelo custo unificado por UM. Zeramos as parcelas legadas
    // para evitar dupla contagem na composição do custo total.
    const smCustoMonit = 0;
    // Atendentes no ITSM migrou para Smart Flow — Smart Monitor não cobra mais.
    const smCustoAtendentes = 0;
    // Custo de proxys: 1 = inicial; n>1 = inicial + adicional*(n-1)
    const qtdProxys = monitorBilling ? Math.max(1, Math.floor(state.qtdProxysMonitor || 1)) : 0;
    const smCustoProxys = monitorBilling
      ? Math.max(0, state.valorProxyInicial || 0) +
        Math.max(0, qtdProxys - 1) * Math.max(0, state.valorProxyAdicional || 0)
      : 0;
    // Smart Monitor só cobra alocação de N1 quando opera sozinho.
    const smCustoN1Aloc = monitorBilling
      ? (state.percAlocacaoN1Monitor / 100) * custoPorChamadoN1 * smChamados
      : 0;
    // N3 opcional dentro do Smart Monitor (horas mensais avulsas) — desabilitado em camadas superiores
    const smHorasN3 = monitorBilling ? Math.max(0, state.horasN3Monitor || 0) : 0;
    const smCustoN3 = smHorasN3 * state.valorHoraN3;
    const smHorasN3Manut = monitorBilling ? Math.max(0, state.horasN3MonitorManut || 0) : 0;
    const smCustoN3Manut = smHorasN3Manut * state.valorHoraN3;

    // === Smart Flow (clone independente do Smart Monitor) ===
    // Custo por ativo legado no Smart Flow também substituído pelo custo unificado por UM.
    const flCustoMonit = 0;
    const flCustoAtendentes = flowActive && !flowAdvanced
      ? Math.max(0, state.qtdAtendentesFlow || 0) * Math.max(0, state.custoAtendenteFlow || 0)
      : 0;
    const flQtdProxys = flowActive ? Math.max(1, Math.floor(state.qtdProxysFlow || 1)) : 0;
    // Os proxys do Flow sempre usam os mesmos valores unitários do Smart Monitor.
    const flProxyIni = Math.max(0, state.valorProxyInicial || 0);
    const flProxyAdd = Math.max(0, state.valorProxyAdicional || 0);
    const flCustoProxys = flowActive
      ? flProxyIni + Math.max(0, flQtdProxys - 1) * flProxyAdd
      : 0;
    const flCustoN1Aloc = flowActive && !state.tierOperation
      ? (Math.max(0, state.percAlocacaoN1Flow || 0) / 100) * custoPorChamadoN1 * smChamados
      : 0;
    const flHorasN3 = flowActive && !flowAdvanced ? Math.max(0, state.horasN3Flow || 0) : 0;
    const flCustoN3 = flHorasN3 * state.valorHoraN3;
    const flHorasN3Manut = flowActive && !flowAdvanced ? Math.max(0, state.horasN3FlowManut || 0) : 0;
    const flCustoN3Manut = flHorasN3Manut * state.valorHoraN3;

    // Gate dos custos por camada ativa (mesma regra do SmartTiersPanel.totalSelecionado):
    // - N1 + N2 só entram quando Smart Operation está ativo
    // - N3 (pool contratado) entra quando Operation OU Performance está ativo
    // Sem esse gate, cenários só com Smart Monitor/Flow incluíam toda a equipe N1/N2/N3
    // no custo total da operação, divergindo do preço exibido nas Camadas de Oferta.
    const includeN1N2 = state.tierOperation;
    const includeN3 = state.tierOperation || state.tierPerformance;
    const custoTotalOperacao =
      (includeN1N2 ? custoN1 + custoN2 : 0) +
      (includeN3 ? custoN3 : 0) +
      smCustoMonit + smCustoN1Aloc + smCustoN3 + smCustoN3Manut + smCustoAtendentes + smCustoProxys +
      flCustoMonit + flCustoN1Aloc + flCustoN3 + flCustoN3Manut + flCustoAtendentes + flCustoProxys +
      custoMonitoramentoUM;
    // ===== Composição do preço de venda (Markup Divisor único) =====
    // PV = Custo / (1 - Σ% / 100), onde Σ% = PIS+COFINS+ISS+Comissão+IRPJ/CSLL+Enc.Financ.+Lucro
    // Cada componente em R$ = PV × (% do componente / 100).
    const pisPerc = Math.max(0, state.pisPerc || 0);
    const cofinsPerc = Math.max(0, state.cofinsPerc || 0);
    const issPerc = Math.max(0, state.issPerc || 0);
    const comissaoPerc = Math.max(0, state.comissaoPerc || 0);
    const irpjCsllPerc = Math.max(0, state.irpjCsllPerc || 0);
    const encFinancPerc = Math.max(0, state.encFinancPerc || 0);
    const lucroPerc = Math.max(0, state.lucroPerc || 0);
    const totalEncargosPerc = pisPerc + cofinsPerc + issPerc + comissaoPerc + irpjCsllPerc + encFinancPerc + lucroPerc;
    const custoPerc = 100 - totalEncargosPerc;
    const fatorDivisor = custoPerc > 0 ? custoPerc / 100 : 0;
    const precoVendaMensal = fatorDivisor > 0 ? custoTotalOperacao / fatorDivisor : 0;
    const valorPis = precoVendaMensal * pisPerc / 100;
    const valorCofins = precoVendaMensal * cofinsPerc / 100;
    const valorIss = precoVendaMensal * issPerc / 100;
    const valorComissao = precoVendaMensal * comissaoPerc / 100;
    const valorIrpjCsll = precoVendaMensal * irpjCsllPerc / 100;
    const valorEncFinanc = precoVendaMensal * encFinancPerc / 100;
    const valorLucro = precoVendaMensal * lucroPerc / 100;
    const valorImpostos = valorPis + valorCofins + valorIss + valorIrpjCsll + valorEncFinanc;
    const valorMargem = valorLucro;
    const precoPreImposto = precoVendaMensal - (valorPis + valorCofins + valorIss);
    const receitaLiquida = precoPreImposto;
    const margemContribuicao = precoVendaMensal - custoTotalOperacao - (valorPis + valorCofins + valorIss + valorComissao);
    const composicaoPreco = {
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
      receitaLiquida,
      margemContribuicao,
      resultadoOperacional: valorLucro,
    };

    const smartMonitor = {
      ativos: smAtivos,
      chamadosAtivos: smChamados,
      // Reporta o custo unificado apenas quando o Smart Monitor for a camada de monitoramento
      // "efetiva" (opera sozinho), evitando dupla contagem em relatórios que somam camadas.
      custoMonitoramento: monitorBilling ? custoMonitoramentoUM : 0,
      custoN1Alocado: smCustoN1Aloc,
      horasN3: smHorasN3,
      custoN3: smCustoN3,
      horasN3Manut: smHorasN3Manut,
      custoN3Manut: smCustoN3Manut,
      custoAtendentes: smCustoAtendentes,
      qtdAtendentes: 0,
      custoProxys: smCustoProxys,
      qtdProxys,
      total: (monitorBilling ? custoMonitoramentoUM : 0) + smCustoN1Aloc + smCustoN3 + smCustoN3Manut + smCustoAtendentes + smCustoProxys,
    };

    const smartFlow = {
      ativos: smAtivos,
      chamadosAtivos: smChamados,
      // Quando Smart Flow está ativo (sozinho ou com camadas superiores), o custo
      // unificado por UM aparece aqui — Smart Monitor deixa de reportar.
      custoMonitoramento: flowActive ? custoMonitoramentoUM : 0,
      custoN1Alocado: flCustoN1Aloc,
      horasN3: flHorasN3,
      custoN3: flCustoN3,
      horasN3Manut: flHorasN3Manut,
      custoN3Manut: flCustoN3Manut,
      custoAtendentes: flCustoAtendentes,
      qtdAtendentes: flowActive && !flowAdvanced ? (state.qtdAtendentesFlow || 0) : 0,
      custoProxys: flCustoProxys,
      qtdProxys: flQtdProxys,
      total: (flowActive ? custoMonitoramentoUM : 0) + flCustoN1Aloc + flCustoN3 + flCustoN3Manut + flCustoAtendentes + flCustoProxys,
    };

    return {
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
      smartFlow,
      humanAttendanceActive,
      composicaoPreco,
    };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Soma dos percentuais que compõem o preço de venda (markup divisor).
 */
export function getTotalEncargosPerc(state: ITSMState): number {
  return (
    (state.pisPerc || 0) +
    (state.cofinsPerc || 0) +
    (state.issPerc || 0) +
    (state.comissaoPerc || 0) +
    (state.irpjCsllPerc || 0) +
    (state.encFinancPerc || 0) +
    (state.lucroPerc || 0)
  );
}

/**
 * Fator divisor para converter custo em preço de venda:
 * preço = custo / fatorDivisor.
 */
export function getFatorDivisor(state: ITSMState): number {
  const restante = 100 - getTotalEncargosPerc(state);
  return restante > 0 ? restante / 100 : 0;
}
